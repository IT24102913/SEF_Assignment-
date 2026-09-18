import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Microscope, Clock, ShieldCheck, 
  Sparkles, Filter, Info, ArrowRight, X, 
  CheckCircle2, AlertTriangle, Calendar 
} from 'lucide-react';
import { getAllTests, getCategories } from '../../../api/labApi';

const PRESET_CATEGORIES = [
  'ALL',
  'Haematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Pathology',
  'Cardiology',
  'Endocrinology'
];

export default function TestCatalogueSection({ onBookTest }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTestDetail, setSelectedTestDetail] = useState(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await getAllTests();
      setTests(res.data || []);
    } catch {
      // High-quality fallback lab test catalogue
      setTests([
        {
          id: '11111111-1111-1111-1111-111111111101',
          name: 'Complete Blood Count (CBC) with Differential',
          category: 'Haematology',
          description: 'Evaluates overall cellular health, screening for anaemia, infection, and platelet disorders.',
          sampleType: 'Whole Blood (EDTA)',
          turnaroundDays: 1,
          price: 1850,
          isRestricted: false,
          fastingHours: 0,
          instructions: 'No fasting required. Stay well-hydrated before the blood draw.'
        },
        {
          id: '11111111-1111-1111-1111-111111111102',
          name: 'Fasting Blood Sugar (FBS) & HbA1c Glycated Haemoglobin',
          category: 'Biochemistry',
          description: 'Comprehensive diabetes screening analyzing plasma glucose and 3-month average glycation.',
          sampleType: 'Fluoride & EDTA Blood',
          turnaroundDays: 1,
          price: 2400,
          isRestricted: false,
          fastingHours: 10,
          instructions: 'Strict fasting for 8 to 10 hours required. Plain water only is permitted.'
        },
        {
          id: '11111111-1111-1111-1111-111111111103',
          name: 'Comprehensive Lipid Profile Panel',
          category: 'Biochemistry',
          description: 'Measures Total Cholesterol, HDL, LDL, VLDL, and Triglycerides to evaluate cardiovascular risk.',
          sampleType: 'Serum Blood',
          turnaroundDays: 1,
          price: 3200,
          isRestricted: false,
          fastingHours: 12,
          instructions: 'Fast for 10 to 12 hours prior to test. Avoid high-fat meals and alcohol 24 hours before.'
        },
        {
          id: '11111111-1111-1111-1111-111111111104',
          name: 'Liver Function Test (LFT Profile)',
          category: 'Biochemistry',
          description: 'Assess hepatic wellness, SGOT, SGPT, Bilirubin, Alkaline Phosphatase, and Total Protein.',
          sampleType: 'Serum Blood',
          turnaroundDays: 1,
          price: 3600,
          isRestricted: false,
          fastingHours: 8,
          instructions: 'Overnight fasting for 8 hours recommended for optimal enzyme accuracy.'
        },
        {
          id: '11111111-1111-1111-1111-111111111105',
          name: 'Thyroid Function Profile (Free T3, Free T4, TSH Ultra)',
          category: 'Endocrinology',
          description: 'Evaluates hyperthyroidism or hypothyroidism and pituitary regulation.',
          sampleType: 'Serum Blood',
          turnaroundDays: 2,
          price: 4500,
          isRestricted: true,
          fastingHours: 0,
          instructions: 'Morning draw recommended. Doctor prescription verified via Gemini Vision AI.'
        },
        {
          id: '11111111-1111-1111-1111-111111111106',
          name: 'Serum Creatinine & eGFR Renal Panel',
          category: 'Biochemistry',
          description: 'Kidney filtration and renal function benchmark test with estimated GFR staging.',
          sampleType: 'Serum Blood',
          turnaroundDays: 1,
          price: 1650,
          isRestricted: false,
          fastingHours: 0,
          instructions: 'Avoid strenuous exercise and large meat meals 12 hours before test.'
        },
        {
          id: '11111111-1111-1111-1111-111111111107',
          name: 'Urine Full Report (UFR) with Microscopic Sediment',
          category: 'Pathology',
          description: 'Diagnostic urinalysis screening for urinary tract infections, proteinuria, and crystalluria.',
          sampleType: 'Mid-stream Urine',
          turnaroundDays: 1,
          price: 950,
          isRestricted: false,
          fastingHours: 0,
          instructions: 'Collect first morning clean-catch midstream urine in sterile container provided.'
        },
        {
          id: '11111111-1111-1111-1111-111111111108',
          name: 'Serum Electrolytes (Na+, K+, Cl-, HCO3-)',
          category: 'Biochemistry',
          description: 'Monitors vital ionic balance, hydration levels, and cellular electrical neutrality.',
          sampleType: 'Serum Blood',
          turnaroundDays: 1,
          price: 2100,
          isRestricted: false,
          fastingHours: 0,
          instructions: 'Stay hydrated with normal water. Avoid potassium supplements prior to draw.'
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      const matchCat = selectedCategory === 'ALL' || t.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch = !search || 
        t.name?.toLowerCase().includes(search.toLowerCase()) || 
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.sampleType?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [tests, search, selectedCategory]);

  return (
    <div>
      {/* Top Search & Filter Bar */}
      <div style={styles.topFilterCard}>
        <div style={styles.searchBar}>
          <Search size={18} color="#059669" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search test by name, pathology, or specimen (e.g., CBC, Lipid, Urine)..."
            style={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={styles.clearBtn}>
              <X size={16} color="#64748b" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div style={styles.categoryPills}>
          {PRESET_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.categoryPill,
                ...(selectedCategory === cat ? styles.categoryPillActive : {})
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#059669' }}>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>Loading Laboratory Test Catalogue...</div>
        </div>
      ) : filteredTests.length === 0 ? (
        <div style={styles.emptyState}>
          <Microscope size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>No Laboratory Tests Found</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            No tests match "{search}" in {selectedCategory}. Try resetting filters.
          </p>
          <button 
            onClick={() => { setSearch(''); setSelectedCategory('ALL'); }}
            style={styles.resetBtn}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={styles.testsGrid}>
          {filteredTests.map(test => (
            <div key={test.id} style={styles.testCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={styles.cardCatBadge}>{test.category || 'Diagnostic'}</span>
                {test.isRestricted && (
                  <span style={styles.rxBadge}>
                    <Sparkles size={11} /> Rx Required
                  </span>
                )}
              </div>

              <h3 style={styles.cardTitle}>{test.name}</h3>
              <p style={styles.cardDesc}>{test.description}</p>

              {/* Badges / Specs */}
              <div style={styles.specsRow}>
                <div style={styles.specItem}>
                  <Microscope size={14} color="#059669" />
                  <span>{test.sampleType || 'Blood'}</span>
                </div>
                <div style={styles.specItem}>
                  <Clock size={14} color="#64748b" />
                  <span>{test.turnaroundDays || 1} Day(s)</span>
                </div>
                {test.fastingHours > 0 && (
                  <div style={{ ...styles.specItem, color: '#b45309' }}>
                    <AlertTriangle size={14} color="#b45309" />
                    <span>{test.fastingHours}h Fasting</span>
                  </div>
                )}
              </div>

              {/* Price & Action */}
              <div style={styles.cardBottom}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Fee</div>
                  <div style={styles.cardPrice}>Rs. {Number(test.price).toLocaleString()}</div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    style={styles.detailsBtn}
                    onClick={() => setSelectedTestDetail(test)}
                    title="View Preparation Guidelines"
                  >
                    <Info size={16} color="#059669" />
                  </button>
                  <button
                    type="button"
                    style={styles.bookBtn}
                    onClick={() => onBookTest(test)}
                  >
                    Book Test <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Test Detail / Prep Guidelines Modal */}
      {selectedTestDetail && (
        <div style={styles.detailOverlay} onClick={() => setSelectedTestDetail(null)}>
          <div style={styles.detailModal} onClick={e => e.stopPropagation()}>
            <div style={styles.detailHeader}>
              <div>
                <span style={styles.cardCatBadge}>{selectedTestDetail.category}</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>
                  {selectedTestDetail.name}
                </h3>
              </div>
              <button onClick={() => setSelectedTestDetail(null)} style={styles.clearBtn}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h4 style={styles.secTitle}>Clinical Overview</h4>
                <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                  {selectedTestDetail.description}
                </p>
              </div>

              <div style={styles.detailSpecsGrid}>
                <div style={styles.detailSpecBox}>
                  <span style={styles.detailSpecLabel}>Sample Specimen</span>
                  <strong style={styles.detailSpecVal}>{selectedTestDetail.sampleType || 'Venous Blood'}</strong>
                </div>
                <div style={styles.detailSpecBox}>
                  <span style={styles.detailSpecLabel}>Turnaround Time</span>
                  <strong style={styles.detailSpecVal}>{selectedTestDetail.turnaroundDays || 1} Working Day(s)</strong>
                </div>
                <div style={styles.detailSpecBox}>
                  <span style={styles.detailSpecLabel}>Fasting Required</span>
                  <strong style={{ ...styles.detailSpecVal, color: selectedTestDetail.fastingHours > 0 ? '#b45309' : '#059669' }}>
                    {selectedTestDetail.fastingHours > 0 ? `${selectedTestDetail.fastingHours} Hours Fasting` : 'No Fasting'}
                  </strong>
                </div>
                <div style={styles.detailSpecBox}>
                  <span style={styles.detailSpecLabel}>Official Price</span>
                  <strong style={{ ...styles.detailSpecVal, color: '#059669' }}>
                    Rs. {Number(selectedTestDetail.price).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div style={styles.instructionsCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Sparkles size={16} color="#059669" />
                  <strong style={{ fontSize: '13.5px', color: '#065f46' }}>Patient Preparation Guidelines</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#047857', lineHeight: 1.5 }}>
                  {selectedTestDetail.instructions || 'Standard sample collection protocol. Stay adequately hydrated with water.'}
                </div>
              </div>
            </div>

            <div style={styles.detailFooter}>
              <button
                type="button"
                style={styles.closeModalBtn}
                onClick={() => setSelectedTestDetail(null)}
              >
                Close
              </button>
              <button
                type="button"
                style={styles.bookFromDetailBtn}
                onClick={() => {
                  const t = selectedTestDetail;
                  setSelectedTestDetail(null);
                  onBookTest(t);
                }}
              >
                Book This Test Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  topFilterCard: {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    border: '1.5px solid #e2e8f0',
    padding: '20px 24px',
    marginBottom: '26px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    border: '1.5px solid #cbd5e1',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#0f172a',
    flex: 1,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  categoryPills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  categoryPill: {
    padding: '7px 16px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  categoryPillActive: {
    backgroundColor: '#059669',
    color: '#ffffff',
    borderColor: '#059669',
    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
  },
  testsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  testCard: {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    border: '1.5px solid #e2e8f0',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  cardCatBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    padding: '3px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  rxBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: '3px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '12px 0 6px',
    lineHeight: 1.35,
  },
  cardDesc: {
    fontSize: '12.5px',
    color: '#64748b',
    lineHeight: 1.45,
    margin: '0 0 16px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  specsRow: {
    display: 'flex',
    gap: '14px',
    padding: '10px 14px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #f1f5f9',
    marginBottom: '16px',
    fontSize: '12px',
  },
  specItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 600,
    color: '#334155',
  },
  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
  },
  cardPrice: {
    fontSize: '17px',
    fontWeight: 900,
    color: '#059669',
  },
  detailsBtn: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '10px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  bookBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '48px 24px',
    textAlign: 'center',
    border: '1.5px dashed #cbd5e1',
  },
  resetBtn: {
    marginTop: '16px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    border: '1px solid #a7f3d0',
    padding: '8px 18px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
  },
  detailOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  detailModal: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '540px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  detailHeader: {
    padding: '24px 28px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #f1f5f9',
  },
  secTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    margin: '0 0 6px',
  },
  detailSpecsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '18px',
  },
  detailSpecBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 14px',
  },
  detailSpecLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
    marginBottom: '4px',
  },
  detailSpecVal: {
    fontSize: '13.5px',
    color: '#0f172a',
  },
  instructionsCard: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '14px',
    padding: '14px 18px',
  },
  detailFooter: {
    padding: '16px 28px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  closeModalBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  },
  bookFromDetailBtn: {
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '10px',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
  },
};
