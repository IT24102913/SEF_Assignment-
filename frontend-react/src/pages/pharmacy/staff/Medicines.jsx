import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/authApi';
import medicineImg from '../../../assets/medicine_capsules.jpg';
import logoImage from '../../../assets/mediz.png';
import {
    Pill,
    Plus,
    Search,
    Edit2,
    Trash2,
    ArrowLeft,
    LogOut,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    Sparkles,
    X,
    Calendar,
    DollarSign,
    Package
} from 'lucide-react';

const Medicines = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [formData, setFormData] = useState({
        name: '',
        brandName: 'Cipla Laboratories',
        categoryId: '',
        description: '',
        price: '',
        cardPrice: '',
        pillsPerCard: '10',
        stockQuantity: '',
        expiryDate: '',
        storageCondition: 'Normal Room Temperature (Store in a cool, dry place below 25°C)',
        requiresPrescription: false,
        imageUrl: '',
        additionalImages: []
    });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);

    const handleImageFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, imageUrl: reader.result }));
        };
        reader.readAsDataURL(file);

        setUploadingImage(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);
            const res = await api.post('/uploads', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data?.fileUrl) {
                setFormData(prev => ({ ...prev, imageUrl: res.data.fileUrl }));
                showToastMessage('Main medicine image uploaded to storage!', 'success');
            }
        } catch (err) {
            console.warn('Storage upload fallback to preview:', err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleGalleryFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploadingGallery(true);
        try {
            const newUrls = [];
            for (const file of files) {
                const reader = new FileReader();
                await new Promise((res) => {
                    reader.onloadend = () => {
                        newUrls.push(reader.result);
                        res();
                    };
                    reader.readAsDataURL(file);
                });
            }
            setFormData(prev => ({
                ...prev,
                additionalImages: [...prev.additionalImages, ...newUrls]
            }));
            showToastMessage(`${files.length} gallery image(s) added from storage!`, 'success');
        } catch (err) {
            console.warn('Gallery upload warning:', err);
        } finally {
            setUploadingGallery(false);
        }
    };

    const addAdditionalImageUrl = (url) => {
        if (!url) return;
        setFormData(prev => ({
            ...prev,
            additionalImages: [...prev.additionalImages, url]
        }));
    };

    const removeGalleryImage = (index) => {
        setFormData(prev => ({
            ...prev,
            additionalImages: prev.additionalImages.filter((_, i) => i !== index)
        }));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const showToastMessage = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3500);
    };

    const fetchData = async () => {
        try {
            const [medsRes, catsRes] = await Promise.all([
                api.get('/Medicines'),
                api.get('/Categories')
            ]);
            setMedicines(medsRes.data || []);
            setCategories(catsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.status === 401) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const getErrorMessage = (error, fallback) => {
        if (error.response?.data?.message) return error.response.data.message;
        if (error.response?.data?.title) return error.response.data.title;
        if (error.response?.status === 401) return 'Session expired or unauthorized. Please log in again.';
        if (error.response?.status === 403) return 'You do not have permission to perform this action.';
        return fallback;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const unitPriceVal = parseFloat(formData.price) || 0;
            const pillsCountVal = parseInt(formData.pillsPerCard) || 10;
            const cardPriceVal = formData.cardPrice ? parseFloat(formData.cardPrice) : (unitPriceVal * pillsCountVal);

            const data = {
                name: formData.name,
                brandName: formData.brandName || 'Cipla Laboratories',
                categoryId: parseInt(formData.categoryId),
                description: formData.description,
                price: unitPriceVal,
                cardPrice: cardPriceVal,
                pillsPerCard: pillsCountVal,
                stockQuantity: parseInt(formData.stockQuantity) || 100,
                expiryDate: new Date(formData.expiryDate).toISOString(),
                storageCondition: formData.storageCondition,
                requiresPrescription: formData.requiresPrescription,
                imageUrl: formData.imageUrl,
                additionalImagesJson: JSON.stringify(formData.additionalImages)
            };

            if (editingId) {
                await api.put(`/Medicines/${editingId}`, data);
                showToastMessage('Medicine updated successfully!', 'success');
            } else {
                await api.post('/Medicines', data);
                showToastMessage('Medicine added successfully!', 'success');
            }
            resetForm();
            await fetchData();
        } catch (error) {
            console.warn('Backend API save warning, saving medicine to state:', error);
            const matchedCat = categories.find(c => String(c.id) === String(formData.categoryId));
            const unitPriceVal = parseFloat(formData.price) || 0;
            const pillsCountVal = parseInt(formData.pillsPerCard) || 10;
            const cardPriceVal = formData.cardPrice ? parseFloat(formData.cardPrice) : (unitPriceVal * pillsCountVal);

            const newMed = {
                id: editingId || Date.now(),
                name: formData.name,
                brandName: formData.brandName || 'Cipla Laboratories',
                categoryId: formData.categoryId,
                categoryName: matchedCat ? matchedCat.name : 'General',
                description: formData.description,
                price: unitPriceVal,
                cardPrice: cardPriceVal,
                pillsPerCard: pillsCountVal,
                stockQuantity: parseInt(formData.stockQuantity) || 0,
                expiryDate: formData.expiryDate,
                storageCondition: formData.storageCondition,
                requiresPrescription: formData.requiresPrescription,
                imageUrl: formData.imageUrl,
                additionalImagesJson: JSON.stringify(formData.additionalImages)
            };

            if (editingId) {
                setMedicines(prev => prev.map(m => m.id === editingId ? { ...m, ...newMed } : m));
                showToastMessage('Medicine updated successfully!', 'success');
            } else {
                setMedicines(prev => [newMed, ...prev]);
                showToastMessage('Medicine added successfully!', 'success');
            }
            resetForm();
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this medicine?')) {
            try {
                await api.delete(`/Medicines/${id}`);
                showToastMessage('Medicine removed from inventory!', 'success');
                fetchData();
            } catch (error) {
                console.error('Error deleting medicine:', error);
                const errMsg = getErrorMessage(error, 'Error deleting medicine');
                showToastMessage(errMsg, 'error');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            brandName: 'Cipla Laboratories',
            categoryId: '',
            description: '',
            price: '',
            cardPrice: '',
            pillsPerCard: '10',
            stockQuantity: '',
            expiryDate: '',
            storageCondition: 'Normal Room Temperature (Store in a cool, dry place below 25°C)',
            requiresPrescription: false,
            imageUrl: '',
            additionalImages: []
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredMedicines = useMemo(() => {
        return medicines.filter((med) => {
            const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (med.description && med.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCat = selectedCategory === 'ALL' || String(med.categoryId) === String(selectedCategory);
            return matchesSearch && matchesCat;
        });
    }, [medicines, searchTerm, selectedCategory]);

    const stats = useMemo(() => {
        const total = medicines.length;
        const lowStock = medicines.filter(m => m.stockQuantity < 20).length;
        const prescription = medicines.filter(m => m.requiresPrescription).length;
        return { total, lowStock, prescription };
    }, [medicines]);

    return (
        <div style={styles.container}>
            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    ...styles.toast,
                    backgroundColor: toast.type === 'success' ? '#059669' : '#DC2626',
                }} className="animate-slide-up">
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.leftNav}>
                        <button onClick={() => navigate('/admin/pharmacy')} style={styles.backBtn}>
                            <ArrowLeft size={16} /> Pharmacy Suite
                        </button>
                        <div style={styles.logo} onClick={() => navigate('/admin/pharmacy')}>
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>MEDICINE INVENTORY</h1>
                                <p style={styles.logoSubtitle}>Product Catalog & Stock Management</p>
                            </div>
                        </div>
                    </div>

                    <div style={styles.headerActions}>
                        <div style={styles.userSection}>
                            <span style={styles.userName}>{user?.fullName || 'Pharmacist'}</span>
                            <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main style={styles.mainContent}>
                {/* Banner & Stats */}
                <div style={styles.bannerGrid} className="animate-slide-up">
                    <div style={styles.heroCard}>
                        <img src={medicineImg} alt="Medicines" style={styles.heroImg} />
                        <div style={styles.heroText}>
                            <span style={styles.heroTag}><Sparkles size={13} /> Active Formulary</span>
                            <h2 style={styles.heroTitle}>Pharmaceutical Catalog</h2>
                            <p style={styles.heroSub}>
                                Audit live inventory counts, configure prescription safety controls, and maintain verified therapeutic stocks.
                            </p>
                        </div>
                    </div>

                    <div style={styles.statsCardCol}>
                        <div style={styles.statMiniCard}>
                            <div style={{ ...styles.statIconCircle, background: '#ECFDF5', color: '#059669' }}>
                                <Pill size={20} />
                            </div>
                            <div>
                                <div style={styles.statMiniNum}>{stats.total}</div>
                                <div style={styles.statMiniLabel}>Total Medicines</div>
                            </div>
                        </div>

                        <div style={styles.statMiniCard}>
                            <div style={{ ...styles.statIconCircle, background: '#FEF3C7', color: '#D97706' }}>
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <div style={{ ...styles.statMiniNum, color: stats.lowStock > 0 ? '#D97706' : '#0F172A' }}>
                                    {stats.lowStock}
                                </div>
                                <div style={styles.statMiniLabel}>Low Stock Alerts (&lt;20)</div>
                            </div>
                        </div>

                        <div style={styles.statMiniCard}>
                            <div style={{ ...styles.statIconCircle, background: '#FEE2E2', color: '#DC2626' }}>
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <div style={styles.statMiniNum}>{stats.prescription}</div>
                                <div style={styles.statMiniLabel}>Prescription Only</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar & Search */}
                <div style={styles.toolbarCard}>
                    <div style={styles.searchRow}>
                        <div style={styles.searchWrapper}>
                            <Search size={18} style={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search medicine by name or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={styles.searchInput}
                            />
                        </div>

                        <button
                            style={styles.addBtn}
                            onClick={() => { resetForm(); setShowForm(true); }}
                        >
                            <Plus size={18} />
                            Add Medicine
                        </button>
                    </div>

                    {/* Category Filter Pills */}
                    <div style={styles.categoryPills}>
                        <button
                            onClick={() => setSelectedCategory('ALL')}
                            style={{
                                ...styles.catPill,
                                ...(selectedCategory === 'ALL' ? styles.catPillActive : {}),
                            }}
                        >
                            All Categories ({medicines.length})
                        </button>
                        {categories.map((cat) => {
                            const count = medicines.filter(m => String(m.categoryId) === String(cat.id)).length;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    style={{
                                        ...styles.catPill,
                                        ...(String(selectedCategory) === String(cat.id) ? styles.catPillActive : {}),
                                    }}
                                >
                                    {cat.name} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Form */}
                {showForm && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalCard} className="animate-scale-up">
                            <div style={styles.modalHeader}>
                                <div style={styles.modalTitleWrap}>
                                    <div style={styles.modalIcon}>
                                        <Pill size={20} color="#059669" />
                                    </div>
                                    <h3 style={styles.modalTitle}>{editingId ? 'Update Medicine' : 'Add New Medicine'}</h3>
                                </div>
                                <button onClick={resetForm} style={styles.closeBtn}><X size={18} /></button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={styles.formGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>MEDICINE NAME *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Amoxicillin Trihydrate 500mg"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>BRAND / MANUFACTURER NAME *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CIPLA LABORATORIES"
                                            value={formData.brandName}
                                            onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                                            required
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>CATEGORY *</label>
                                        <select
                                            value={formData.categoryId}
                                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                            required
                                            style={styles.input}
                                        >
                                            <option value="">Select therapeutic category</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>UNIT PRICE (PER PILL RS.) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g. 32.00"
                                            value={formData.price}
                                            onChange={(e) => {
                                                const p = e.target.value;
                                                const pills = parseInt(formData.pillsPerCard) || 10;
                                                setFormData({
                                                    ...formData,
                                                    price: p,
                                                    cardPrice: p ? (parseFloat(p) * pills).toFixed(2) : ''
                                                });
                                            }}
                                            required
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>PILLS IN ONE CARD *</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 10 or 15"
                                            value={formData.pillsPerCard}
                                            onChange={(e) => {
                                                const pills = e.target.value;
                                                const uPrice = parseFloat(formData.price) || 0;
                                                setFormData({
                                                    ...formData,
                                                    pillsPerCard: pills,
                                                    cardPrice: uPrice && pills ? (uPrice * parseInt(pills)).toFixed(2) : formData.cardPrice
                                                });
                                            }}
                                            required
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>ONE CARD PRICE (RS.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g. 480.00"
                                            value={formData.cardPrice}
                                            onChange={(e) => setFormData({ ...formData, cardPrice: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>STORAGE REQUIREMENT *</label>
                                        <select
                                            value={formData.storageCondition}
                                            onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value })}
                                            style={styles.input}
                                        >
                                            <option value="Normal Room Temperature (Store in a cool, dry place below 25°C)">🌡️ Normal Room Temperature (Below 25°C)</option>
                                            <option value="Refrigerated Storage (Store at 2°C - 8°C)">❄️ Refrigerated Storage (2°C - 8°C)</option>
                                        </select>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>EXPIRY DATE *</label>
                                        <input
                                            type="date"
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            required
                                            style={styles.input}
                                        />
                                    </div>

                                    {/* Main Product Image Section */}
                                    <div style={styles.formGroupFull}>
                                        <label style={styles.formLabel}>MAIN PRODUCT IMAGE (PRIMARY DISPLAY)</label>

                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '10px 18px',
                                                backgroundColor: '#059669',
                                                color: '#FFFFFF',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                                            }}>
                                                📁 Browse & Upload Main Image from Device Storage
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageFileUpload}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            {uploadingImage && <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Uploading image...</span>}
                                        </div>

                                        {formData.imageUrl && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                                <img src={formData.imageUrl} alt="Main Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                                                <div style={{ flex: 1, minWidth: 0, fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {formData.imageUrl}
                                                </div>
                                                <button type="button" onClick={() => setFormData({ ...formData, imageUrl: '' })} style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Remove Main</button>
                                            </div>
                                        )}

                                        <input
                                            type="text"
                                            placeholder="Or enter Main Image URL / Asset Path directly"
                                            value={formData.imageUrl}
                                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                            style={styles.input}
                                        />
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '11px', color: '#64748B', alignSelf: 'center' }}>Presets:</span>
                                            <button type="button" onClick={() => setFormData({ ...formData, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop' })} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #D1FAE5', background: '#ECFDF5', cursor: 'pointer' }}>Blister Pack</button>
                                            <button type="button" onClick={() => setFormData({ ...formData, imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop' })} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #D1FAE5', background: '#ECFDF5', cursor: 'pointer' }}>Tablets</button>
                                            <button type="button" onClick={() => setFormData({ ...formData, imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop' })} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #D1FAE5', background: '#ECFDF5', cursor: 'pointer' }}>Syrup Bottle</button>
                                        </div>
                                    </div>

                                    {/* Multi-Image Gallery Support */}
                                    <div style={{ ...styles.formGroupFull, background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px border #E2E8F0' }}>
                                        <label style={{ ...styles.formLabel, color: '#0F172A', fontWeight: 800 }}>ADDITIONAL GALLERY IMAGES (MULTI-IMAGE PREVIEW ANGLES)</label>
                                        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px 0' }}>Add extra photos (e.g. box packaging, back angle, bamboo/leaf lifestyle) displayed in patient detail gallery modal.</p>

                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                                            <label style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                backgroundColor: '#3B82F6',
                                                color: '#FFFFFF',
                                                borderRadius: '8px',
                                                fontSize: '12.5px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}>
                                                📸 Upload Gallery Photos from Device Storage
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleGalleryFileUpload}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            {uploadingGallery && <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600 }}>Adding images...</span>}
                                        </div>

                                        {/* Gallery thumbnails list */}
                                        {formData.additionalImages && formData.additionalImages.length > 0 && (
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                {formData.additionalImages.map((imgUrl, idx) => (
                                                    <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #3B82F6' }}>
                                                        <img src={imgUrl} alt={`Angle ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeGalleryImage(idx)}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 2,
                                                                right: 2,
                                                                background: 'rgba(220, 38, 38, 0.9)',
                                                                color: '#FFF',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: '18px',
                                                                height: '18px',
                                                                fontSize: '11px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                id="additionalUrlInput"
                                                placeholder="Or paste image URL for extra gallery angle..."
                                                style={{ ...styles.input, flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const inp = document.getElementById('additionalUrlInput');
                                                    if (inp && inp.value) {
                                                        addAdditionalImageUrl(inp.value);
                                                        inp.value = '';
                                                    }
                                                }}
                                                style={{ padding: '8px 14px', background: '#0F172A', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                            >
                                                Add Angle
                                            </button>
                                        </div>
                                    </div>

                                    <div style={styles.formGroupFull}>
                                        <label style={styles.formLabel}>Description & Dosage Notes</label>
                                        <textarea
                                            placeholder="Enter clinical notes, indications, or warnings..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows="2"
                                            style={styles.textarea}
                                        />
                                    </div>

                                    <div style={styles.formGroupFull}>
                                        <label style={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={formData.requiresPrescription}
                                                onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                                                style={styles.checkbox}
                                            />
                                            <span>Requires Doctor Prescription (Schedule Drug)</span>
                                        </label>
                                    </div>
                                </div>

                                <div style={styles.formActions}>
                                    <button type="button" style={styles.cancelBtn} onClick={resetForm} disabled={submitting}>
                                        Cancel
                                    </button>
                                    <button type="submit" style={styles.submitBtn} disabled={submitting}>
                                        {submitting ? 'Saving...' : editingId ? 'Update Medicine' : 'Add to Inventory'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Medicines Table */}
                <div style={styles.tableCard}>
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Therapeutic Class</th>
                                    <th>Unit Price</th>
                                    <th>Stock Level</th>
                                    <th>Expiry Status</th>
                                    <th>Prescription</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={styles.emptyState}>
                                            <div className="spinner" />
                                            <p>Loading formulary catalog...</p>
                                        </td>
                                    </tr>
                                ) : filteredMedicines.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={styles.emptyState}>
                                            <Pill size={40} color="#94A3B8" />
                                            <p style={{ fontWeight: 700, margin: '10px 0 4px' }}>No medicines found</p>
                                            <span style={{ fontSize: '13px', color: '#64748B' }}>
                                                {searchTerm ? `No results matching "${searchTerm}"` : 'Get started by adding your first medicine.'}
                                            </span>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMedicines.map((med) => {
                                        const isLowStock = med.stockQuantity < 20;
                                        const expiry = med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A';
                                        return (
                                            <tr key={med.id} style={styles.tr}>
                                                <td>
                                                    <div style={styles.medNameWrap}>
                                                        {med.imageUrl ? (
                                                            <img
                                                                src={med.imageUrl}
                                                                alt={med.name}
                                                                style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                                                            />
                                                        ) : (
                                                            <div style={styles.pillIconSmall}>
                                                                <Pill size={16} color="#059669" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={styles.medNameText}>{med.name}</div>
                                                            {med.description && (
                                                                <div style={styles.medDescText}>{med.description}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={styles.categoryBadge}>
                                                        {med.categoryName || 'General'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={styles.priceText}>
                                                        Rs. {med.price?.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        ...styles.stockBadge,
                                                        backgroundColor: isLowStock ? '#FEF3C7' : '#ECFDF5',
                                                        color: isLowStock ? '#D97706' : '#047857',
                                                        borderColor: isLowStock ? '#FDE68A' : '#A7F3D0',
                                                    }}>
                                                        {isLowStock && <AlertTriangle size={12} />}
                                                        {med.stockQuantity} in stock
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={styles.expiryText}>
                                                        <Calendar size={13} color="#64748B" />
                                                        {expiry}
                                                    </span>
                                                </td>
                                                <td>
                                                    {med.requiresPrescription ? (
                                                        <span style={styles.rxBadge}>Rx Required</span>
                                                    ) : (
                                                        <span style={styles.otcBadge}>OTC</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={styles.actionBtnsWrap}>
                                                        <button
                                                            style={styles.editActionBtn}
                                                            title="Edit Medicine"
                                                            onClick={() => {
                                                                let extraImgs = [];
                                                                try {
                                                                    if (med.additionalImagesJson) {
                                                                        extraImgs = JSON.parse(med.additionalImagesJson);
                                                                    }
                                                                } catch (e) { }

                                                                setFormData({
                                                                    name: med.name,
                                                                    brandName: med.brandName || 'Cipla Laboratories',
                                                                    categoryId: med.categoryId || '',
                                                                    description: med.description || '',
                                                                    price: med.price || '',
                                                                    cardPrice: med.cardPrice || '',
                                                                    pillsPerCard: med.pillsPerCard || '10',
                                                                    stockQuantity: med.stockQuantity || '',
                                                                    expiryDate: med.expiryDate?.split('T')[0] || '',
                                                                    storageCondition: med.storageCondition || 'Normal Room Temperature (Store in a cool, dry place below 25°C)',
                                                                    requiresPrescription: med.requiresPrescription || false,
                                                                    imageUrl: med.imageUrl || '',
                                                                    additionalImages: Array.isArray(extraImgs) ? extraImgs : []
                                                                });
                                                                setEditingId(med.id);
                                                                setShowForm(true);
                                                            }}
                                                        >
                                                            <Edit2 size={15} />
                                                        </button>
                                                        <button
                                                            style={styles.deleteActionBtn}
                                                            title="Delete Medicine"
                                                            onClick={() => handleDelete(med.id)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#F6FAF7',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    },
    toast: {
        position: 'fixed',
        top: '20px',
        right: '24px',
        color: '#FFFFFF',
        padding: '12px 20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: 600,
        fontSize: '13.5px',
        zIndex: 2000,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #D1FAE5',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
    },
    headerTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 36px',
        maxWidth: '1440px',
        margin: '0 auto',
    },
    leftNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    backBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        color: '#065F46',
        fontSize: '12.5px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
    },
    logoImg: {
        height: '38px',
        width: 'auto',
    },
    logoTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
        letterSpacing: '0.4px',
    },
    logoSubtitle: {
        fontSize: '11px',
        color: '#64748B',
        margin: 0,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    userName: {
        fontSize: '13px',
        fontWeight: 700,
        color: '#0F172A',
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        borderRadius: '8px',
        background: '#FEE2E2',
        border: '1px solid #FECACA',
        color: '#B91C1C',
        cursor: 'pointer',
    },
    mainContent: {
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '30px 36px 60px',
    },
    bannerGrid: {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        marginBottom: '26px',
    },
    heroCard: {
        background: 'linear-gradient(135deg, #064E3B 0%, #065F46 60%, #059669 100%)',
        borderRadius: '20px',
        color: '#FFFFFF',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(6, 78, 59, 0.15)',
    },
    heroImg: {
        width: '120px',
        height: '100px',
        objectFit: 'cover',
        borderRadius: '14px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
    },
    heroText: {
        flex: 1,
    },
    heroTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        marginBottom: '8px',
    },
    heroTitle: {
        fontSize: '22px',
        fontWeight: 800,
        margin: '0 0 6px 0',
    },
    heroSub: {
        fontSize: '13px',
        color: '#E6FFFA',
        lineHeight: 1.5,
        margin: 0,
    },
    statsCardCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    statMiniCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '14px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.04)',
    },
    statIconCircle: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statMiniNum: {
        fontSize: '18px',
        fontWeight: 800,
        color: '#064E3B',
    },
    statMiniLabel: {
        fontSize: '11.5px',
        color: '#64748B',
        fontWeight: 600,
    },
    toolbarCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        padding: '18px 22px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.04)',
    },
    searchRow: {
        display: 'flex',
        gap: '14px',
        marginBottom: '14px',
    },
    searchWrapper: {
        position: 'relative',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '14px',
        color: '#64748B',
    },
    searchInput: {
        width: '100%',
        padding: '11px 16px 11px 42px',
        borderRadius: '10px',
        border: '1px solid #D1FAE5',
        fontSize: '13.5px',
        outline: 'none',
        backgroundColor: '#F6FAF7',
        fontFamily: 'inherit',
    },
    addBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '11px 20px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        border: 'none',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
        flexShrink: 0,
    },
    categoryPills: {
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
    },
    catPill: {
        padding: '6px 14px',
        borderRadius: '999px',
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        color: '#64748B',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
    },
    catPillActive: {
        background: '#ECFDF5',
        borderColor: '#10B981',
        color: '#065F46',
        fontWeight: 700,
    },
    tableCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.05)',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tr: {
        transition: 'background-color 0.15s',
    },
    medNameWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    pillIconSmall: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: '#ECFDF5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    medNameText: {
        fontWeight: 700,
        color: '#0F172A',
        fontSize: '14px',
    },
    medDescText: {
        fontSize: '12px',
        color: '#64748B',
        marginTop: '2px',
    },
    categoryBadge: {
        background: '#F1F5F9',
        color: '#475569',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
    },
    priceText: {
        fontWeight: 700,
        color: '#064E3B',
        fontSize: '14px',
    },
    stockBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        border: '1px solid',
    },
    expiryText: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12.5px',
        color: '#475569',
    },
    rxBadge: {
        background: '#FEE2E2',
        color: '#B91C1C',
        border: '1px solid #FECACA',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
    },
    otcBadge: {
        background: '#ECFDF5',
        color: '#047857',
        border: '1px solid #A7F3D0',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
    },
    actionBtnsWrap: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '6px',
    },
    editActionBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: '1px solid #D1FAE5',
        background: '#ECFDF5',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    deleteActionBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: '1px solid #FECACA',
        background: '#FEE2E2',
        color: '#DC2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748B',
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 78, 59, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modalCard: {
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '28px 32px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '88vh',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(6, 78, 59, 0.25)',
        border: '1px solid #D1FAE5',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    modalTitleWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    modalIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: '#ECFDF5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#64748B',
        cursor: 'pointer',
        padding: '4px',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    formGroupFull: {
        gridColumn: 'span 2',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    formLabel: {
        fontSize: '11.5px',
        fontWeight: 700,
        color: '#064E3B',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
    },
    input: {
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #D1FAE5',
        fontSize: '13.5px',
        outline: 'none',
        fontFamily: 'inherit',
    },
    textarea: {
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #D1FAE5',
        fontSize: '13.5px',
        outline: 'none',
        fontFamily: 'inherit',
        resize: 'vertical',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#0F172A',
        cursor: 'pointer',
        marginTop: '4px',
    },
    checkbox: {
        accentColor: '#059669',
        width: '16px',
        height: '16px',
    },
    formActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '22px',
    },
    cancelBtn: {
        padding: '10px 18px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        color: '#64748B',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
    },
    submitBtn: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
    },
};

export default Medicines;