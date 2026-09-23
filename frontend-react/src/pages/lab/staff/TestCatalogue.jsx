import { useEffect, useState, useRef } from 'react';
import { getAllTests, createTest, updateTest, deleteTest } from '../../../api/labApi';
import LabLayout from '../../../components/layout/LabLayout';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Plus, Pencil, Trash2, Search, FlaskConical, X, 
  ShieldCheck, Eye, Info, Clock, AlertCircle, AlertTriangle, 
  Check, ChevronDown, ChevronUp, FolderPlus 
} from 'lucide-react';

const EMPTY_FORM = { name: '', description: '', price: '', isRestricted: false, turnaroundDays: 1, category: '' };
const DEFAULT_CATEGORIES = ['Haematology', 'Biochemistry', 'Microbiology', 'Radiology', 'Endocrinology', 'Immunology', 'Pathology'];

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

  // Category state
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('lab_catalogue_categories');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_CATEGORIES;
  });
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatName, setEditingCatName] = useState(null);
  const [editCatInputVal, setEditCatInputVal] = useState('');

  // Validation state
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationPopupErrors, setValidationPopupErrors] = useState(null);

  const categoryDropdownRef = useRef(null);
  const nameInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const turnaroundInputRef = useRef(null);
  const descInputRef = useRef(null);

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

  // Sync categories from loaded tests to preserve any existing categories in database
  useEffect(() => {
    if (tests.length > 0) {
      setCategories(prev => {
        const fromTests = tests.map(t => t.category).filter(Boolean);
        const combined = Array.from(new Set([...prev, ...fromTests]));
        try {
          localStorage.setItem('lab_catalogue_categories', JSON.stringify(combined));
        } catch (_) {}
        return combined;
      });
    }
  }, [tests]);

  // Click outside to close category dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    if (categoryDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [categoryDropdownOpen]);

  // Validation helper
  const validateField = (field, value) => {
    let err = '';
    if (field === 'name') {
      if (!value || !value.trim()) {
        err = 'Test Name is required.';
      } else if (value.trim().length < 3) {
        err = 'Test Name must be at least 3 characters.';
      } else if (!/[a-zA-Z]/.test(value)) {
        err = 'Test Name must contain alphabetical letters.';
      }
    } else if (field === 'price') {
      const str = String(value ?? '').trim();
      const num = parseInt(str, 10);
      if (str === '') {
        err = 'Hospital Fee is required.';
      } else if (str.includes('.') || !/^\d+$/.test(str) || isNaN(num)) {
        err = 'Hospital Fee must be a whole number (no decimals allowed).';
      } else if (num <= 0) {
        err = 'Hospital Fee must be greater than LKR 0.';
      }
    } else if (field === 'turnaroundDays') {
      const str = String(value ?? '').trim();
      const num = parseInt(str, 10);
      if (str === '') {
        err = 'Turnaround Time is required (1 to 5 days).';
      } else if (str.includes('.') || !/^\d+$/.test(str) || isNaN(num)) {
        err = 'Turnaround Time must be a whole number of days.';
      } else if (num < 1 || num > 5) {
        err = 'Turnaround Time must be between 1 and 5 days (min 1, max 5).';
      }
    } else if (field === 'category') {
      if (!value || !value.trim()) {
        err = 'Diagnostic Category is required.';
      } else if (value.trim().length < 5) {
        err = 'Category name must be at least 5 characters.';
      }
    } else if (field === 'description') {
      if (!value || !value.trim()) {
        err = 'Clinical Description is required (minimum 5 characters).';
      } else if (value.trim().length < 5) {
        err = 'Clinical Description must be at least 5 characters.';
      }
    }
    setFieldErrors(prev => ({ ...prev, [field]: err }));
    return err;
  };

  const validateAll = () => {
    const nameErr = validateField('name', form.name);
    const priceErr = validateField('price', form.price);
    const turnErr = validateField('turnaroundDays', form.turnaroundDays);
    const catErr = validateField('category', form.category);
    const descErr = validateField('description', form.description);

    const errList = [];
    if (nameErr) errList.push(nameErr);
    if (priceErr) errList.push(priceErr);
    if (turnErr) errList.push(turnErr);
    if (catErr) errList.push(catErr);
    if (descErr) errList.push(descErr);

    return errList;
  };

  const openCreate = () => { 
    setForm(EMPTY_FORM); 
    setEditId(null); 
    setFieldErrors({});
    setValidationPopupErrors(null);
    setCategoryDropdownOpen(false);
    setCatSearch('');
    setModal('form'); 
  };

  const openEdit = (t) => {
    setForm({ 
      name: t.name, 
      description: t.description || '', 
      price: t.price, 
      isRestricted: t.isRestricted, 
      turnaroundDays: t.turnaroundDays || 1, 
      category: t.category || '' 
    });
    setEditId(t.id); 
    setFieldErrors({});
    setValidationPopupErrors(null);
    setCategoryDropdownOpen(false);
    setCatSearch('');
    setModal('form');
  };

  const handleSubmit = async () => {
    if (!isAdmin) return toast.error('Unauthorized. Only administrators can modify the test catalogue.');
    
    const errors = validateAll();
    if (errors.length > 0) {
      setValidationPopupErrors(errors);
      toast.error('Please fix the required fields before submitting.');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || '',
        price: parseInt(form.price, 10),
        isRestricted: Boolean(form.isRestricted),
        turnaroundDays: parseInt(form.turnaroundDays, 10) || 1,
        category: form.category?.trim() || ''
      };

      if (editId) { 
        await updateTest(editId, payload); 
        toast.success('Diagnostic test updated successfully!'); 
      } else { 
        await createTest(payload); 
        toast.success('New diagnostic test added to catalogue!'); 
      }
      setModal(null); 
      setFieldErrors({});
      setValidationPopupErrors(null);
      load();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to save test'); 
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

  // Category management functions
  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) {
      toast.error('Please enter a category name');
      return;
    }
    if (trimmed.length < 5) {
      toast.error('Category name must be at least 5 characters');
      return;
    }
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Category "${trimmed}" already exists`);
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    setForm(f => ({ ...f, category: trimmed }));
    validateField('category', trimmed);
    setNewCatInput('');
    setCatSearch('');
    try {
      localStorage.setItem('lab_catalogue_categories', JSON.stringify(updated));
    } catch (_) {}
    toast.success(`Category "${trimmed}" added!`);
  };

  const handleStartEditCat = (cat, e) => {
    e.stopPropagation();
    setEditingCatName(cat);
    setEditCatInputVal(cat);
  };

  const handleSaveEditCat = (oldName, e) => {
    e.stopPropagation();
    const trimmed = editCatInputVal.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }
    if (trimmed.length < 5) {
      toast.error('Category name must be at least 5 characters');
      return;
    }
    if (trimmed.toLowerCase() !== oldName.toLowerCase() && categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Another category already has this name');
      return;
    }
    const updated = categories.map(c => c === oldName ? trimmed : c);
    setCategories(updated);
    if (form.category === oldName) {
      setForm(f => ({ ...f, category: trimmed }));
      validateField('category', trimmed);
    }
    setEditingCatName(null);
    setEditCatInputVal('');
    try {
      localStorage.setItem('lab_catalogue_categories', JSON.stringify(updated));
    } catch (_) {}
    toast.success(`Category renamed to "${trimmed}"`);
  };

  const handleCancelEditCat = (e) => {
    e.stopPropagation();
    setEditingCatName(null);
    setEditCatInputVal('');
  };

  const handleDeleteCat = (catToDelete, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete category "${catToDelete}" from catalogue selection list?`)) return;
    const updated = categories.filter(c => c !== catToDelete);
    setCategories(updated);
    if (form.category === catToDelete) {
      setForm(f => ({ ...f, category: '' }));
      validateField('category', '');
    }
    try {
      localStorage.setItem('lab_catalogue_categories', JSON.stringify(updated));
    } catch (_) {}
    toast.success(`Category "${catToDelete}" removed`);
  };

  // Hover selection: selects category as cursor moves over the category name
  const handleCategoryHover = (cat) => {
    if (!editingCatName) {
      setForm(prev => ({ ...prev, category: cat }));
      setFieldErrors(prev => ({ ...prev, category: '' }));
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
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Lab Test' : 'Add New Lab Test'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Test Name Field with Validation */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Test Name <strong style={{ color: '#EF4444' }}>*</strong></span>
                <span style={{ fontSize: 11, color: '#64748B' }}>e.g. Full Blood Count (FBC)</span>
              </label>
              <input
                ref={nameInputRef}
                className="input"
                value={form.name}
                onChange={e => {
                  setForm({ ...form, name: e.target.value });
                  if (fieldErrors.name) validateField('name', e.target.value);
                }}
                onBlur={e => validateField('name', e.target.value)}
                placeholder="Enter diagnostic test name"
                style={{
                  borderColor: fieldErrors.name ? '#EF4444' : undefined,
                  backgroundColor: fieldErrors.name ? '#FEF2F2' : undefined,
                }}
              />
              {fieldErrors.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#DC2626', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                  <AlertCircle size={13} color="#DC2626" />
                  <span>{fieldErrors.name}</span>
                </div>
              )}
            </div>

            {/* Hospital Fee, Turnaround Days & Prescription Policy Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: 12, marginBottom: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Hospital Fee (LKR) <strong style={{ color: '#EF4444' }}>*</strong>
                </label>
                <input
                  ref={priceInputRef}
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1500 (whole number)"
                  value={form.price}
                  onChange={e => {
                    const val = e.target.value;
                    // Strictly allow only whole digits (0-9) with no decimal points
                    if (val === '' || /^\d+$/.test(val)) {
                      setForm({ ...form, price: val });
                      if (fieldErrors.price) validateField('price', val);
                    }
                  }}
                  onBlur={e => validateField('price', e.target.value)}
                  style={{
                    borderColor: fieldErrors.price ? '#EF4444' : undefined,
                    backgroundColor: fieldErrors.price ? '#FEF2F2' : undefined,
                  }}
                />
                {fieldErrors.price && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#DC2626', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                    <AlertCircle size={13} color="#DC2626" />
                    <span>{fieldErrors.price}</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Turnaround (Days) <strong style={{ color: '#EF4444' }}>*</strong></span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>1–5 days</span>
                </label>
                <input
                  ref={turnaroundInputRef}
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="1 to 5"
                  value={form.turnaroundDays}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setForm({ ...form, turnaroundDays: val });
                      if (fieldErrors.turnaroundDays) validateField('turnaroundDays', val);
                    }
                  }}
                  onBlur={e => validateField('turnaroundDays', e.target.value)}
                  style={{
                    borderColor: fieldErrors.turnaroundDays ? '#EF4444' : undefined,
                    backgroundColor: fieldErrors.turnaroundDays ? '#FEF2F2' : undefined,
                  }}
                />
                {fieldErrors.turnaroundDays && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#DC2626', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                    <AlertCircle size={13} color="#DC2626" />
                    <span>{fieldErrors.turnaroundDays}</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Prescription Policy</label>
                <select
                  className="select"
                  value={form.isRestricted}
                  onChange={e => setForm({ ...form, isRestricted: e.target.value === 'true' })}
                >
                  <option value="false">No — Open Test</option>
                  <option value="true">Yes — Restricted (Rx OCR)</option>
                </select>
              </div>
            </div>

            {/* Diagnostic Category Selector with Hover Selection, Edit, Delete, and Add New Category */}
            <div className="form-group" style={{ marginBottom: 14, position: 'relative' }} ref={categoryDropdownRef}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Diagnostic Category <strong style={{ color: '#EF4444' }}>*</strong></span>
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Hover cursor to select category</span>
              </label>

              {/* Selector Box */}
              <div
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: fieldErrors.category ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                  backgroundColor: fieldErrors.category ? '#FEF2F2' : '#FFFFFF',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {form.category ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: '#ECFDF5',
                      color: '#065F46',
                      fontWeight: 700,
                      fontSize: 12.5,
                      border: '1px solid #A7F3D0'
                    }}>
                      {form.category}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>(Selected)</span>
                  </div>
                ) : (
                  <span style={{ color: '#94A3B8', fontSize: 13.5 }}>
                    Select diagnostic category or add a new one below...
                  </span>
                )}
                {categoryDropdownOpen ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
              </div>

              {fieldErrors.category && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#DC2626', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                  <AlertCircle size={13} color="#DC2626" />
                  <span>{fieldErrors.category}</span>
                </div>
              )}

              {/* Dropdown Popup Menu */}
              {categoryDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
                  border: '1px solid #E2E8F0',
                  zIndex: 9999,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease-out'
                }}>
                  {/* Category Header */}
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748B',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Categories ({categories.length})</span>
                    <span style={{ color: '#059669', textTransform: 'none', fontWeight: 600, fontSize: 10.5 }}>
                      Hovering selects category
                    </span>
                  </div>

                  {/* Category Search Bar */}
                  <div style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 18 }} />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={catSearch}
                      onChange={e => setCatSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '6px 28px 6px 30px',
                        borderRadius: 7,
                        border: '1px solid #CBD5E1',
                        fontSize: 12.5,
                        outline: 'none',
                        backgroundColor: '#F8FAFC'
                      }}
                    />
                    {catSearch && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setCatSearch('');
                        }}
                        style={{
                          position: 'absolute',
                          right: 18,
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#94A3B8',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Clear category search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Scrollable Category List */}
                  <div style={{ maxHeight: 185, overflowY: 'auto', padding: '6px' }}>
                    {(() => {
                      const filteredCategories = categories.filter(c =>
                        c.toLowerCase().includes(catSearch.trim().toLowerCase())
                      );

                      if (filteredCategories.length === 0) {
                        return (
                          <div style={{ padding: '12px', textAlign: 'center', fontSize: 12.5, color: '#94A3B8' }}>
                            {catSearch ? `No category matching "${catSearch}"` : 'No categories found. Add one below!'}
                          </div>
                        );
                      }

                      return filteredCategories.map(cat => {
                        const isSelected = form.category === cat;
                        const isEditing = editingCatName === cat;

                        return (
                          <div
                            key={cat}
                            onMouseEnter={() => handleCategoryHover(cat)}
                            onClick={() => {
                              if (!isEditing) {
                                setForm(f => ({ ...f, category: cat }));
                                validateField('category', cat);
                                setCategoryDropdownOpen(false);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '7px 10px',
                              borderRadius: 8,
                              backgroundColor: isSelected ? '#ECFDF5' : 'transparent',
                              cursor: isEditing ? 'default' : 'pointer',
                              transition: 'background-color 0.15s ease',
                              marginBottom: 2
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }} onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editCatInputVal}
                                  onChange={e => setEditCatInputVal(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveEditCat(cat, e);
                                    if (e.key === 'Escape') handleCancelEditCat(e);
                                  }}
                                  autoFocus
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1.5px solid #059669',
                                    fontSize: 12.5,
                                    outline: 'none'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={e => handleSaveEditCat(cat, e)}
                                  style={{
                                    border: 'none',
                                    background: '#059669',
                                    color: '#fff',
                                    borderRadius: 6,
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Save"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditCat}
                                  style={{
                                    border: 'none',
                                    background: '#E2E8F0',
                                    color: '#475569',
                                    borderRadius: 6,
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {isSelected ? (
                                    <div style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      backgroundColor: '#059669',
                                      color: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Check size={11} strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <div style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      border: '1.5px solid #CBD5E1'
                                    }} />
                                  )}
                                  <span style={{
                                    fontSize: 13,
                                    fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? '#065F46' : '#1E293B'
                                  }}>
                                    {cat}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={e => handleStartEditCat(cat, e)}
                                    style={{
                                      border: 'none',
                                      background: 'none',
                                      padding: '4px',
                                      borderRadius: 4,
                                      cursor: 'pointer',
                                      color: '#64748B',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title={`Edit "${cat}"`}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={e => handleDeleteCat(cat, e)}
                                    style={{
                                      border: 'none',
                                      background: 'none',
                                      padding: '4px',
                                      borderRadius: 4,
                                      cursor: 'pointer',
                                      color: '#EF4444',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title={`Delete "${cat}"`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Add New Category Section at Bottom */}
                  <div style={{
                    padding: '8px 10px',
                    borderTop: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      placeholder="Add new category (min 5 chars)..."
                      value={newCatInput}
                      onChange={e => setNewCatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: 12.5,
                        outline: 'none',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clinical Description & Specimen Instructions */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Clinical Description &amp; Specimen Instructions <strong style={{ color: '#EF4444' }}>*</strong></span>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>(Min. 5 characters)</span>
              </label>
              <textarea
                ref={descInputRef}
                className="textarea"
                rows={3}
                value={form.description}
                onChange={e => {
                  setForm({ ...form, description: e.target.value });
                  if (fieldErrors.description) validateField('description', e.target.value);
                }}
                onBlur={e => validateField('description', e.target.value)}
                placeholder="Describe preparation, fasting hours, specimen handling, or clinical notes (minimum 5 characters)..."
                style={{
                  borderColor: fieldErrors.description ? '#EF4444' : undefined,
                  backgroundColor: fieldErrors.description ? '#FEF2F2' : undefined,
                }}
              />
              {fieldErrors.description && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#DC2626', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                  <AlertCircle size={13} color="#DC2626" />
                  <span>{fieldErrors.description}</span>
                </div>
              )}
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

      {/* Validation Error Popup Modal */}
      {validationPopupErrors && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 10000, backgroundColor: 'rgba(15, 23, 42, 0.7)' }}
          onClick={() => setValidationPopupErrors(null)}
        >
          <div 
            className="modal" 
            style={{ maxWidth: 460, border: '2px solid #EF4444' }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={24} color="#DC2626" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#991B1B' }}>
                  Please Complete Required Fields
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#B91C1C' }}>
                  The test could not be saved because of the following validation issue{validationPopupErrors.length > 1 ? 's' : ''}:
                </p>

                <div style={{
                  backgroundColor: '#FFF5F5',
                  borderRadius: 10,
                  border: '1px solid #FEE2E2',
                  padding: '12px 14px',
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  {validationPopupErrors.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#7F1D1D' }}>
                      <AlertCircle size={15} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{msg}</span>
                    </div>
                  ))}
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                  onClick={() => {
                    setValidationPopupErrors(null);
                    if (fieldErrors.name) nameInputRef.current?.focus();
                    else if (fieldErrors.price) priceInputRef.current?.focus();
                    else if (fieldErrors.turnaroundDays) turnaroundInputRef.current?.focus();
                    else if (fieldErrors.description) descInputRef.current?.focus();
                  }}
                >
                  Review &amp; Fix Fields
                </button>
              </div>
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
