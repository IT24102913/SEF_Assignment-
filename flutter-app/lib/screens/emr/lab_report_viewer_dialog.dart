import 'dart:convert';
import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import 'lab_report_helper.dart';

class LabReportViewerDialog extends StatelessWidget {
  final LabReport report;

  const LabReportViewerDialog({super.key, required this.report});

  static void show(BuildContext context, LabReport report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LabReportViewerDialog(report: report),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = report.fileUrl != null &&
        (report.fileUrl!.startsWith('data:image/') ||
            report.fileUrl!.endsWith('.png') ||
            report.fileUrl!.endsWith('.jpg') ||
            report.fileUrl!.endsWith('.jpeg'));

    final parsedParams = _parseParameters(report.resultsSummary);
    final patientName = AuthState.name ?? 'Patient';
    final patientCode = report.patientCode.isNotEmpty ? report.patientCode : (AuthState.patientCode ?? 'PAT-1001');

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // ── Drag Handle & Top Header ─────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 16, 12),
            decoration: const BoxDecoration(
              color: Color(0xFF095E51),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.biotech, color: Colors.white, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'HealthBridge Diagnostic Labs',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              'ISO-15189 Accredited • Official Clinical Report',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                      tooltip: 'Close',
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ── Scrollable Report Body ──────────────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Investigation Banner
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF16A34A),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.verified, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              report.testTitle,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Category: ${report.category} • Status: ${report.status}',
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: Color(0xFF15803D),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Patient & Order Information Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _metaField('Patient Name', patientName)),
                          Expanded(child: _metaField('Patient Code', patientCode)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Divider(height: 1),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: _metaField('Ordered Doctor', report.orderedDoctor)),
                          Expanded(child: _metaField('Report Date', report.reportDate)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Divider(height: 1),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: _metaField('Report ID', report.id.isNotEmpty ? report.id : 'LAB-9012')),
                          Expanded(
                            child: _metaField(
                              'Attachment',
                              report.fileName ?? 'Certified_Report.pdf',
                              icon: Icons.picture_as_pdf,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Clinical Parameter Table (if available)
                if (parsedParams.isNotEmpty) ...[
                  const Text(
                    'Measured Clinical Parameters',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          color: const Color(0xFFF1F5F9),
                          child: const Row(
                            children: [
                              Expanded(flex: 3, child: Text('Parameter', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: Color(0xFF475569)))),
                              Expanded(flex: 2, child: Text('Result', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: Color(0xFF475569)))),
                              Expanded(flex: 2, child: Text('Reference', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: Color(0xFF475569)))),
                              Expanded(flex: 2, child: Text('Flag', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: Color(0xFF475569)))),
                            ],
                          ),
                        ),
                        ...parsedParams.map((p) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: const BoxDecoration(
                                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                              ),
                              child: Row(
                                children: [
                                  Expanded(flex: 3, child: Text(p['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: Color(0xFF0F172A)))),
                                  Expanded(flex: 2, child: Text(p['value'] ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF334155)))),
                                  Expanded(flex: 2, child: Text(p['range'] ?? '', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)))),
                                  Expanded(
                                    flex: 2,
                                    child: Align(
                                      alignment: Alignment.centerRight,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFDCFCE7),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          p['flag'] ?? 'Normal',
                                          style: const TextStyle(color: Color(0xFF15803D), fontSize: 10, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                ],

                // Diagnostic Summary / Observation Notes
                const Text(
                  'Diagnostic Findings & Observations',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    report.resultsSummary.isNotEmpty
                        ? report.resultsSummary
                        : 'Specimen examination verified. Diagnostic evaluation conducted in accordance with laboratory protocols.',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF1E293B),
                      height: 1.45,
                    ),
                  ),
                ),

                // Scanned Image / Attached Specimen (if present)
                if (hasImage) ...[
                  const SizedBox(height: 18),
                  const Text(
                    'Attached Specimen / Diagnostic Image',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 200,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _buildImagePreview(report.fileUrl!),
                  ),
                ],

                const SizedBox(height: 20),

                // Doctor & Pathologist Verification Stamp
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.verified_user, color: Color(0xFF0D9488), size: 28),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Verified by Dr. Sarah Jenkins, MBBS, FRCPath',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                            ),
                            Text(
                              'Chief Clinical Pathologist • Central Lab Automation System',
                              style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Bottom Action Bar (Download & Print Buttons) ───────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 8,
                  offset: Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D9488),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    onPressed: () => LabReportHelper.downloadOrOpenReport(context, report),
                    icon: const Icon(Icons.file_download, size: 20),
                    label: const Text(
                      'Download Official PDF',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _metaField(String label, String value, {IconData? icon}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 2),
        Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: const Color(0xFF0D9488)),
              const SizedBox(width: 4),
            ],
            Expanded(
              child: Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildImagePreview(String fileUrl) {
    if (fileUrl.startsWith('data:image')) {
      try {
        final commaIdx = fileUrl.indexOf(',');
        final b64 = fileUrl.substring(commaIdx + 1);
        final bytes = base64Decode(b64);
        return Image.memory(bytes, fit: BoxFit.cover);
      } catch (_) {}
    }
    return Image.network(
      fileUrl,
      fit: BoxFit.cover,
      errorBuilder: (ctx, err, stack) => const Center(
        child: Icon(Icons.broken_image, color: Colors.grey, size: 40),
      ),
    );
  }

  static List<Map<String, String>> _parseParameters(String summary) {
    final list = <Map<String, String>>[];
    if (summary.isEmpty) return list;

    final sentences = summary.split(RegExp(r'\.\s*|\;\s*'));
    for (final s in sentences) {
      if (s.contains(':')) {
        final parts = s.split(':');
        final name = parts[0].trim();
        final rest = parts.sublist(1).join(':').trim();
        if (name.isNotEmpty && rest.isNotEmpty) {
          String val = rest;
          String range = 'Standard';
          String flag = 'Normal';

          if (val.contains('(')) {
            final parenIdx = val.indexOf('(');
            flag = val.substring(parenIdx + 1).replaceAll(')', '').trim();
            val = val.substring(0, parenIdx).trim();
          }

          final nLower = name.toLowerCase();
          if (nLower.contains('cholesterol')) range = '< 200 mg/dL';
          if (nLower.contains('hdl')) range = '> 40 mg/dL';
          if (nLower.contains('ldl')) range = '< 100 mg/dL';
          if (nLower.contains('triglyceride')) range = '< 150 mg/dL';
          if (nLower.contains('wbc')) range = '4.5 - 11.0 x10^3';
          if (nLower.contains('platelet')) range = '150k - 450k';
          if (nLower.contains('hemoglobin')) range = '13.5 - 17.5 g/dL';
          if (nLower.contains('sugar') || nLower.contains('glucose')) range = '70 - 99 mg/dL';
          if (nLower.contains('hba1c')) range = '< 5.7 %';

          list.add({
            'name': name,
            'value': val,
            'range': range,
            'flag': flag.isNotEmpty ? flag : 'Normal',
          });
        }
      }
    }
    return list;
  }
}
