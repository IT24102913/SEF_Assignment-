import re
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders_xml = f'''
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
    </w:tblBorders>
    '''
    tblPr.append(parse_xml(borders_xml))

def add_formatted_runs(paragraph, text, base_font_size=10.5, font_name="Calibri", is_bold=False, is_italic=False, color_rgb=(30, 41, 59)):
    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)', text)
    for token in tokens:
        if not token:
            continue
        run = paragraph.add_run()
        run.font.name = font_name
        run.font.size = Pt(base_font_size)
        run.font.color.rgb = RGBColor(*color_rgb)
        
        if token.startswith('**') and token.endswith('**') and len(token) >= 4:
            run.text = token[2:-2]
            run.bold = True
            run.italic = is_italic
        elif token.startswith('*') and token.endswith('*') and len(token) >= 2:
            run.text = token[1:-1]
            run.bold = is_bold
            run.italic = True
        elif token.startswith('`') and token.endswith('`') and len(token) >= 2:
            run.text = token[1:-1]
            run.font.name = "Consolas"
            run.font.size = Pt(base_font_size - 0.5)
            run.font.color.rgb = RGBColor(15, 23, 42)
            run.bold = True
        else:
            run.text = token
            run.bold = is_bold
            run.italic = is_italic

def create_report_docx(input_md_path, output_docx_path):
    doc = docx.Document()

    # Page setup: Standard letter, 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = RGBColor(30, 41, 59)

    with open(input_md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.splitlines()
    i = 0
    in_code_block = False
    code_lines = []

    while i < len(lines):
        line = lines[i]

        # Handle Code Blocks
        if line.strip().startswith('```'):
            if in_code_block:
                # End of code block
                in_code_block = False
                code_content = "\n".join(code_lines)
                
                # Create a callout / shaded table for code
                tbl = doc.add_table(rows=1, cols=1)
                tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                tbl.autofit = False
                tbl.columns[0].width = Inches(6.5)
                
                cell = tbl.cell(0, 0)
                set_cell_shading(cell, "F8FAFC")
                set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
                set_table_borders(tbl, color="E2E8F0", sz="4")
                
                cp = cell.paragraphs[0]
                cp.paragraph_format.space_before = Pt(0)
                cp.paragraph_format.space_after = Pt(0)
                cp.paragraph_format.line_spacing = 1.05
                crun = cp.add_run(code_content)
                crun.font.name = "Consolas"
                crun.font.size = Pt(8.5)
                crun.font.color.rgb = RGBColor(15, 23, 42)
                
                # Add tiny spacing after table
                sp = doc.add_paragraph()
                sp.paragraph_format.space_before = Pt(0)
                sp.paragraph_format.space_after = Pt(4)
                
                code_lines = []
                i += 1
                continue
            else:
                in_code_block = True
                code_lines = []
                i += 1
                continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Skip horizontal rules
        if line.strip() in ['---', '***', '___']:
            i += 1
            continue

        # Handle Markdown Tables
        if line.strip().startswith('|') and '|' in line[1:]:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
            
            # Parse table
            raw_rows = []
            for tl in table_lines:
                # Check if it's separator row
                if re.match(r'^\|[\s\-:|]+\|$', tl):
                    continue
                cols = [c.strip() for c in tl.strip('|').split('|')]
                raw_rows.append(cols)

            if raw_rows:
                num_cols = len(raw_rows[0])
                table = doc.add_table(rows=len(raw_rows), cols=num_cols)
                table.alignment = WD_TABLE_ALIGNMENT.CENTER
                table.autofit = False
                set_table_borders(table, color="D1D5DB", sz="4")

                # Column widths proportional to total 6.5 inches
                for r_idx, row_data in enumerate(raw_rows):
                    row = table.rows[r_idx]
                    is_header = (r_idx == 0)
                    for c_idx, cell_value in enumerate(row_data):
                        if c_idx < num_cols:
                            cell = row.cells[c_idx]
                            set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                            if is_header:
                                set_cell_shading(cell, "F1F5F9")
                            p = cell.paragraphs[0]
                            p.paragraph_format.space_before = Pt(2)
                            p.paragraph_format.space_after = Pt(2)
                            p.paragraph_format.line_spacing = 1.1
                            add_formatted_runs(p, cell_value, base_font_size=9.5 if num_cols > 3 else 10.0, is_bold=is_header)

                sp = doc.add_paragraph()
                sp.paragraph_format.space_before = Pt(0)
                sp.paragraph_format.space_after = Pt(6)
            continue

        # Handle Headings
        if line.startswith('# '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[2:].strip())
            run.font.name = 'Calibri'
            run.font.size = Pt(16)
            run.bold = True
            run.font.color.rgb = RGBColor(15, 23, 42)
            i += 1
            continue

        if line.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[3:].strip())
            run.font.name = 'Calibri'
            run.font.size = Pt(14)
            run.bold = True
            run.font.color.rgb = RGBColor(30, 58, 138) # Dark Blue
            i += 1
            continue

        if line.startswith('### '):
            heading_text = line[4:].strip()
            # If it's a major section like 3, 4, 6, 7, 8, insert page break for clean pagination
            if re.match(r'^(3\.|4\.|6\.|7\.|8\.)', heading_text):
                doc.add_page_break()

            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(heading_text)
            run.font.name = 'Calibri'
            run.font.size = Pt(12.5)
            run.bold = True
            run.font.color.rgb = RGBColor(15, 23, 42)
            i += 1
            continue

        if line.startswith('#### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[5:].strip())
            run.font.name = 'Calibri'
            run.font.size = Pt(11.5)
            run.bold = True
            run.font.color.rgb = RGBColor(30, 41, 59)
            i += 1
            continue

        if line.startswith('##### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[6:].strip())
            run.font.name = 'Calibri'
            run.font.size = Pt(11)
            run.bold = True
            run.font.color.rgb = RGBColor(51, 65, 85)
            i += 1
            continue

        # Handle Bullet points (* or -)
        if re.match(r'^\s*[\*\-]\s+', line):
            indent_level = len(re.match(r'^\s*', line).group(0)) // 2
            bullet_text = re.sub(r'^\s*[\*\-]\s+', '', line).strip()
            
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.left_indent = Inches(0.25 * (indent_level + 1))
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.15
            add_formatted_runs(p, bullet_text, base_font_size=10.5)
            i += 1
            continue

        # Handle Numbered Lists (1., 2., etc.)
        if re.match(r'^\s*\d+\.\s+', line):
            indent_level = len(re.match(r'^\s*', line).group(0)) // 2
            num_match = re.match(r'^\s*(\d+\.)\s+(.*)', line)
            if num_match:
                prefix = num_match.group(1)
                item_text = num_match.group(2).strip()
                
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Inches(0.3 * (indent_level + 1))
                p.paragraph_format.first_line_indent = Inches(-0.25)
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(3)
                p.paragraph_format.line_spacing = 1.15
                
                prun = p.add_run(prefix + " ")
                prun.font.name = "Calibri"
                prun.font.size = Pt(10.5)
                prun.bold = True
                prun.font.color.rgb = RGBColor(15, 23, 42)
                
                add_formatted_runs(p, item_text, base_font_size=10.5)
            i += 1
            continue

        # Regular Paragraph
        if line.strip():
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(5)
            p.paragraph_format.line_spacing = 1.15
            add_formatted_runs(p, line.strip(), base_font_size=10.5)

        i += 1

    doc.save(output_docx_path)
    print(f"Successfully generated DOCX report at: {output_docx_path}")

if __name__ == '__main__':
    md_file = r'c:\Users\jerad\OneDrive\Desktop\New folder\SEF_Assignment-\EMR_Individual_Report_IT24102664.md'
    docx_file = r'c:\Users\jerad\OneDrive\Desktop\New folder\SEF_Assignment-\EMR_Individual_Report_IT24102664.docx'
    create_report_docx(md_file, docx_file)
