import { useEffect, useState } from 'react';
import { getAllTests, createTest, updateTest, deleteTest } from '../../api/labApi';
import LabLayout from '../../components/LabLayout';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, FlaskConical, X } from 'lucide-react';

const EMPTY_FORM = { name: '', description: '', price: '', isRestricted: false, turnaroundDays: 1, category: '' };
const CATEGORIES = ['Haematology', 'Biochemistry', 'Microbiology', 'Radiology', 'Endocrinology', 'Immunology', 'Pathology'];

export default function TestCatalogue() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'create' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

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
    setForm({ name: t.name, description: t.description, price: t.price, isRestricted: t.isRestricted, turnaroundDays: t.turnaroundDays, category: t.category });
    setEditId(t.id); setModal('form');
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.category) return toast.error('Fill in all required fields');
    try {
      if (editId) { await updateTest(editId, form); toast.success('Test updated!'); }
      else { await createTest(form); toast.success('Test created!'); }
      setModal(null); load();
    } catch { toast.error('Failed to save test'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try { await deleteTest(id); toast.success('Test deactivated'); load(); }
    catch { toast.error('Failed to deactivate'); }
  };

  const filtered = tests.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LabLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Test Catalogue</h1>
          <p className="page-subtitle">Manage available laboratory tests and pricing</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Add New Test
        </button>
      </div>

      <div className="animate-slide-up">
        <div className="search-bar" style={{ marginBottom: 20 }}>
          <Search size={16} />
          <input
            className="input"
            placeholder="Search tests by name or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filtered.map((t, i) => (
              <div 
                key={t.id} 
                className="card hover-lift animate-fade-in" 
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both', padding: 20, display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>{t.name}</h3>
                    <span className="text-muted" style={{ fontSize: 12, display: 'inline-block', background: 'rgba(0,137,123,0.1)', padding: '2px 8px', borderRadius: 4, color: 'var(--primary-dark)' }}>{t.category}</span>
                  </div>
                  <span className={`badge ${t.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-muted" style={{ fontSize: 13, marginBottom: 16, flexGrow: 1 }}>
                  {t.description || 'No description provided.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, background: 'var(--bg-page)', padding: 12, borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Price</div>
                    <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>Rs {t.price?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Turnaround</div>
                    <div style={{ fontWeight: 600 }}>{t.turnaroundDays} day{t.turnaroundDays > 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span className={`badge ${t.isRestricted ? 'badge-restricted' : 'badge-open'}`}>
                    {t.isRestricted ? '🔒 Restricted' : '✓ Open'}
                  </span>
                  
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Edit Test">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(t.id, t.name)} title="Delete Test">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === 'form' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Test' : 'Add New Lab Test'}</h3>
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
              <label className="form-label">Description</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Price (LKR) *</label>
                <input
                  className="input"
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Turnaround (Days)</label>
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
                <label className="form-label">Category *</label>
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
                <label className="form-label">Requires Prescription?</label>
                <select
                  className="select"
                  value={form.isRestricted}
                  onChange={e => setForm({ ...form, isRestricted: e.target.value === 'true' })}
                >
                  <option value="false">No — Open Test</option>
                  <option value="true">Yes — Restricted</option>
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
    </LabLayout>
  );
}
