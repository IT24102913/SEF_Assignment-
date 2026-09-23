import { useEffect, useState } from 'react';
import { getAllTests, createTest, updateTest, deleteTest } from '../../../api/labApi';
import LabLayout from '../../../components/layout/LabLayout';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, FlaskConical, X, ShieldCheck, Eye, Info, Clock, AlertCircle } from 'lucide-react';

const EMPTY_FORM = { name: '', description: '', price: '', isRestricted: false, turnaroundDays: 1, category: '' };
const CATEGORIES = ['Haematology', 'Biochemistry', 'Microbiology', 'Radiology', 'Endocrinology', 'Immunology', 'Pathology'];

export default function TestCatalogue() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'form' | 'view'
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);

  const load = () => {
    setLoading(true);
    getAllTests()
      .then(r => {
        setTests(r.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setModal('form'); };
  const openEdit = (t) => {
    setForm({ 
      name: t.name, 
      description: t.description, 
      price: t.price, 
      isRestricted: t.isRestricted, 
      turnaroundDays: t.turnaroundDays, 
      category: t.category 
    });
    setEditId(t.id); 
    setModal('form');
  };

  const handleSubmit = async () => {
    if (!isAdmin) return toast.error('Unauthorized. Only administrators can modify the test catalogue.');
    if (!form.name || !form.price || !form.category) return toast.error('Fill in all required fields');
    try {
      if (editId) { 
        await updateTest(editId, form); 
        toast.success('Diagnostic test updated!'); 
      } else { 
        await createTest(form); 
        toast.success('New diagnostic test added to catalogue!'); 
      }
      setModal(null); 
      load();
    } catch { 
      toast.error('Failed to save test'); 
    }
  };

  const handleDelete = async (id, name) => {
    if (!isAdmin) return toast.error('Unauthorized. Only administrators can deactivate tests.');
    if (!confirm(`Deactivate test "${name}" from hospital catalogue?`)) return;
    try { 
      await deleteTest(id); 
      toast.success('Test deactivated successfully'); 
      load(); 
    } catch { 
      toast.error('Failed to deactivate test'); 
    }
  };

  const filtered = tests.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LabLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">
            {isAdmin ? 'Test Catalogue Management' : 'Clinical Test Reference'}
          </h1>
          <p className="page-subtitle">
            {isAdmin 
              ? 'Administrator controls for diagnostic tests, pricing, and restricted prescription policies' 
              : 'Reference guide for clinical investigations, turnaround targets, and specimen requirements'}
          </p>
        </div>
        
        {isAdmin ? (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> Add New Test
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            padding: '8px 14px',
            borderRadius: 10,
            color: '#065F46',
            fontSize: 12.5,
            fontWeight: 700
          }}>
            <ShieldCheck size={16} color="#059669" />
            <span>Staff Reference Mode (Admin Configured)</span>
          </div>
        )}
      </div>

      <div className="animate-slide-up">
        <div className="search-bar" style={{ marginBottom: 20 }}>
          <Search size={16} />
          <input
            className="input"
            placeholder="Search tests by name or category (e.g. CBC, Lipid, Haematology)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
            {filtered.map((t, i) => (
              <div 
                key={t.id} 
                className="card hover-lift animate-fade-in" 
                style={{ 
                  animationDelay: `${i * 40}ms`, 
                  animationFillMode: 'both', 
                  padding: 20, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  marginBottom: 0,
                  border: t.isRestricted ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>{t.name}</h3>
                    <span className="text-muted" style={{ fontSize: 12, display: 'inline-block', background: 'rgba(0,137,123,0.1)', padding: '2px 8px', borderRadius: 4, color: 'var(--primary-dark)', fontWeight: 600 }}>
                      {t.category}
                    </span>
                  </div>
                  <span className={`badge ${t.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-muted" style={{ fontSize: 13, marginBottom: 16, flexGrow: 1, lineHeight: 1.4 }}>
                  {t.description || 'Routine diagnostic protocol with standardized assay.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, background: 'var(--bg-page)', padding: 12, borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fee</div>
                    <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: 14 }}>Rs {t.price?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Turnaround</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.turnaroundDays} day{t.turnaroundDays > 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <span className={`badge ${t.isRestricted ? 'badge-restricted' : 'badge-open'}`}>
                    {t.isRestricted ? '🔒 Restricted (Rx)' : '✓ Open'}
                  </span>
                  
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Edit Test Details & Price">
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(t.id, t.name)} title="Deactivate Test">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => { setSelectedTest(t); setModal('view'); }}
                      style={{ color: 'var(--primary-dark)', fontWeight: 600 }}
                    >
                      <Eye size={14} /> Procedure Info
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Create/Edit Modal */}
      {modal === 'form' && isAdmin && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Lab Test' : 'Add New Lab Test'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Test Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Complete Blood Count (CBC)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Clinical Description & Specimen Instructions</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe preparation, fasting hours, or specimen handling..."
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Hospital Fee (LKR) *</label>
                <input
                  className="input"
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Turnaround Target (Days)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.turnaroundDays}
                  onChange={e => setForm({ ...form, turnaroundDays: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Diagnostic Category *</label>
                <select
                  className="select"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Requires Doctor Prescription?</label>
                <select
                  className="select"
                  value={form.isRestricted}
                  onChange={e => setForm({ ...form, isRestricted: e.target.value === 'true' })}
                >
                  <option value="false">No — Open Test</option>
                  <option value="true">Yes — Restricted (Triggers Gemini AI OCR)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>
                <FlaskConical size={16} /> {editId ? 'Update Test' : 'Create Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Clinical Reference Details Modal */}
      {modal === 'view' && selectedTest && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedTest.name}</h3>
                <span className="text-muted" style={{ fontSize: 12 }}>Category: {selectedTest.category}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: 12, 
                background: selectedTest.isRestricted ? '#FEF3C7' : '#ECFDF5', 
                border: `1px solid ${selectedTest.isRestricted ? '#FCD34D' : '#A7F3D0'}`,
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 800, color: selectedTest.isRestricted ? '#92400E' : '#065F46', fontSize: 13, marginBottom: 4 }}>
                  {selectedTest.isRestricted ? '🔒 Prescription Policy: Restricted Test' : '✓ Prescription Policy: Open Diagnostic'}
                </div>
                <div style={{ fontSize: 12, color: selectedTest.isRestricted ? '#78350F' : '#047857' }}>
                  {selectedTest.isRestricted 
                    ? 'Requires physical or digital doctor prescription verified by Gemini Vision AI OCR.' 
                    : 'Standard unrestricted test available for immediate direct booking.'}
                </div>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>Clinical Protocol & Instructions:</h4>
              <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-page)', padding: 12, borderRadius: 8, lineHeight: 1.5 }}>
                {selectedTest.description || 'Routine collection protocol.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Standard Price</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-dark)', marginTop: 2 }}>
                    Rs {selectedTest.price?.toLocaleString()}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Turnaround Target</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                    {selectedTest.turnaroundDays} Business Day{selectedTest.turnaroundDays > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setModal(null)}>
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
