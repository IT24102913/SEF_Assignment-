import React, { useState, useEffect } from 'react';
import { api } from '../../../api/authApi';
import {
    Search,
    ShoppingBag,
    Pill,
    FileCheck,
    Upload,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    Plus,
    Minus,
    Trash2,
    ShieldAlert,
    ChevronRight,
    Sparkles,
    QrCode,
    Truck,
    Lock,
    MessageSquare,
    ClipboardList
} from 'lucide-react';

const CustomerPharmacyStore = ({ user, onOrderSubmitted, onNavigate }) => {
    const [medicines, setMedicines] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [cart, setCart] = useState([]);
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [isDirectRxMode, setIsDirectRxMode] = useState(false);
    const [orderSuccessData, setOrderSuccessData] = useState(null);
    const [rxModalMedicine, setRxModalMedicine] = useState(null);

    // Advanced UI & Detailed Daraz Modal State
    const [viewMode, setViewMode] = useState('web'); // 'web' | 'mobile'
    const [selectedDetailMed, setSelectedDetailMed] = useState(null);
    const [activeDetailImageIndex, setActiveDetailImageIndex] = useState(0);
    const [detailQty, setDetailQty] = useState(1);

    // Checkout Form state
    const [customerName, setCustomerName] = useState(user?.fullName || '');
    const [customerPhone, setCustomerPhone] = useState(user?.phoneNumber || '0771234567');
    const [deliveryAddress, setDeliveryAddress] = useState('No 12, Hospital Road, Colombo 03');
    const [deliveryMethod, setDeliveryMethod] = useState('HomeDelivery'); // 'HomeDelivery' | 'Pickup'
    const [prescriptionFile, setPrescriptionFile] = useState(null);
    const [prescriptionPreview, setPrescriptionPreview] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('CashOnDelivery');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [submittingOrder, setSubmittingOrder] = useState(false);
    const [customerNotes, setCustomerNotes] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [addedCartNotification, setAddedCartNotification] = useState(null);

    const getGalleryImages = (med) => {
        if (!med) return [];
        const mainImg = med.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop';
        const list = [mainImg];
        if (med.additionalImagesJson) {
            try {
                const parsed = JSON.parse(med.additionalImagesJson);
                if (Array.isArray(parsed)) {
                    parsed.forEach(url => {
                        if (url && !list.includes(url)) list.push(url);
                    });
                }
            } catch (e) { }
        }
        if (list.length === 1) {
            list.push('https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop');
            list.push('https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop');
        }
        return list;
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    const showToastMessage = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3500);
    };

    const getErrorMessage = (err, fallback) => {
        if (err?.response?.data?.message) return err.response.data.message;
        if (err?.message) return err.message;
        return fallback;
    };

    const fetchCatalog = async () => {
        setLoading(true);
        try {
            const [medsRes, catsRes] = await Promise.all([
                api.get('/Medicines'),
                api.get('/Categories')
            ]);
            const rawMeds = medsRes.data || [];
            const normalized = rawMeds.map(m => {
                const pills = m.pillsPerCard || m.PillsPerCard || 10;
                const uPrice = m.price || m.unitPrice || 15;
                const cPrice = m.cardPrice || (uPrice * pills);
                return {
                    ...m,
                    pillsPerCard: pills,
                    price: uPrice,
                    cardPrice: cPrice
                };
            });
            setMedicines(normalized);
            setCategories(catsRes.data || []);
        } catch (err) {
            console.warn('Failed to fetch catalog from backend, using fallback data:', err);
            // Fallback catalog with unit & card pricing
            setMedicines([
                {
                    id: 1,
                    name: 'Amoxicillin 500mg Capsules',
                    categoryName: 'Antibiotics',
                    description: 'Broad spectrum antibiotic for bacterial infections.',
                    price: 45.00,
                    pillsPerCard: 10,
                    cardPrice: 450.00,
                    stockQuantity: 100,
                    requiresPrescription: true,
                    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop'
                },
                {
                    id: 2,
                    name: 'Paracetamol Extra 500mg (Panadol)',
                    categoryName: 'Analgesics',
                    description: 'Fast acting pain relief and fever reducer with caffeine booster.',
                    price: 18.00,
                    pillsPerCard: 10,
                    cardPrice: 180.00,
                    stockQuantity: 250,
                    requiresPrescription: false,
                    imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop'
                },
                {
                    id: 3,
                    name: 'Omeprazole 20mg Acid Reducer',
                    categoryName: 'Gastrointestinal',
                    description: 'Treats acid reflux, heartburn, and stomach ulcers effectively.',
                    price: 62.00,
                    pillsPerCard: 10,
                    cardPrice: 620.00,
                    stockQuantity: 85,
                    requiresPrescription: false,
                    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop'
                },
                {
                    id: 4,
                    name: 'Vitamin C 1000mg Effervescent',
                    categoryName: 'Vitamins & Supplements',
                    description: 'High potency immunity booster with Zinc for daily wellness.',
                    price: 125.00,
                    pillsPerCard: 10,
                    cardPrice: 1250.00,
                    stockQuantity: 60,
                    requiresPrescription: false,
                    imageUrl: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop'
                }
            ]);
            setCategories([
                { id: 1, name: 'Antibiotics' },
                { id: 2, name: 'Analgesics' },
                { id: 3, name: 'Gastrointestinal' },
                { id: 4, name: 'Vitamins & Supplements' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (med, defaultUnitType = 'Pill') => {
        const isRx = med.requiresPrescription === true || med.RequiresPrescription === true;
        const pills = med.pillsPerCard || med.PillsPerCard || 10;
        const uPrice = med.price || med.unitPrice || 15;
        const cPrice = med.cardPrice || (uPrice * pills);

        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === med.id);
            if (existingIndex > -1) {
                if (isRx) {
                    showToastMessage(`${med.name} is already added for prescription verification quote!`, 'info');
                    return prev;
                }
                const existingItem = prev[existingIndex];
                if (existingItem.unitType === defaultUnitType) {
                    return prev.map((item, idx) => idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item);
                }
            }

            return [...prev, {
                ...med,
                price: uPrice,
                cardPrice: cPrice,
                pillsPerCard: pills,
                unitType: isRx ? 'RxQuote' : defaultUnitType,
                quantity: 1,
                requiresPrescription: isRx
            }];
        });

        // Trigger pop-up notification
        setAddedCartNotification({
            name: isRx ? `${med.name} (Prescription Quote)` : `${med.name} (${defaultUnitType === 'Card' ? `1 Card of ${pills} Pills` : '1 Pill Unit'})`,
            price: isRx ? uPrice : (defaultUnitType === 'Card' ? cPrice : uPrice),
            imageUrl: med.imageUrl
        });

        setTimeout(() => {
            setAddedCartNotification(null);
        }, 3200);
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const updateUnitType = (itemIndex, newUnitType) => {
        setCart(prev => prev.map((item, idx) => {
            if (idx === itemIndex) {
                return { ...item, unitType: newUnitType };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const hasRxItems = cart.some(item =>
        item.requiresPrescription === true ||
        item.RequiresPrescription === true ||
        item.unitType === 'RxQuote'
    );

    const isDirectRxOnly = isDirectRxMode || cart.length === 0;
    const requiresVerification = hasRxItems || !!prescriptionPreview || !!prescriptionFile || isDirectRxOnly;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPrescriptionFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPrescriptionPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const cartSubtotal = cart.reduce((sum, item) => {
        const itemPrice = item.unitType === 'Card'
            ? (item.cardPrice || (item.price * (item.pillsPerCard || 10)))
            : item.price;
        return sum + (itemPrice * item.quantity);
    }, 0);

    const deliveryFee = 0;
    const cartTotal = cartSubtotal;

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (isDirectRxOnly && !prescriptionPreview && !prescriptionFile) {
            showToastMessage('Doctor prescription photo is mandatory for prescription orders! Please upload your doctor prescription.', 'error');
            return;
        }

        if (cart.length === 0 && !prescriptionPreview) {
            showToastMessage('Please select items or attach a doctor prescription photo!', 'error');
            return;
        }

        if (hasRxItems && !prescriptionPreview && !prescriptionFile) {
            showToastMessage('Doctor prescription photo is mandatory for prescription-restricted items! Please upload your doctor prescription.', 'error');
            return;
        }

        setSubmittingOrder(true);
        try {
            // Try to upload the prescription file to get a real server URL
            let uploadedUrl = null;
            if (prescriptionFile) {
                try {
                    const formData = new FormData();
                    formData.append('file', prescriptionFile);
                    const uploadRes = await api.post('/uploads', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (uploadRes.data?.fileUrl) {
                        uploadedUrl = uploadRes.data.fileUrl;
                    }
                } catch (uploadErr) {
                    console.warn('Prescription file upload failed (order will proceed without image URL):', uploadErr);
                }
            }

            const isRx = requiresVerification;
            const userEmail = (user?.email && user.email.includes('@'))
                ? user.email
                : (user?.username && user.username.includes('@'))
                    ? user.username
                    : `patient+${user?.id || Date.now()}@healthbridge.lk`;

            const rawPid = Number(user?.id);
            const validPatientId = (Number.isInteger(rawPid) && rawPid > 0 && rawPid <= 2147483647) ? rawPid : null;

            const orderItems = isDirectRxOnly
                ? [] // No items — pharmacist reads prescription and adds medicines themselves
                : cart.map(item => {
                    const medId = Number(item.id);
                    const isCard = item.unitType === 'Card';
                    const unitP = isCard
                        ? (item.cardPrice || (item.price * (item.pillsPerCard || 10)))
                        : item.price;
                    const medName = (isCard && !item.name.toLowerCase().includes('(card)'))
                        ? `${item.name} (Card)`
                        : item.name;
                    return {
                        medicineId: (Number.isInteger(medId) && medId > 0 && medId <= 2147483647) ? medId : 1,
                        medicineName: medName,
                        requiresPrescription: item.requiresPrescription || item.RequiresPrescription || item.unitType === 'RxQuote',
                        unitType: item.unitType || 'Pill',
                        quantity: Math.max(1, Number(item.quantity) || 1),
                        price: isRx ? 0 : (unitP || 0),
                        unitPrice: isRx ? 0 : (unitP || 0)
                    };
                });

            const orderPayload = {
                patientId: validPatientId,
                customerName: customerName.trim() || user?.fullName || 'Patient',
                customerEmail: userEmail,
                customerPhone: customerPhone ? customerPhone.trim() : '',
                deliveryAddress: deliveryAddress ? deliveryAddress.trim() : '',
                deliveryMethod: deliveryMethod, // 'HomeDelivery' or 'Pickup'
                paymentMethod: isRx ? 'PendingPharmacistQuote' : paymentMethod,
                prescriptionImageUrl: uploadedUrl || null,
                status: isRx ? 'PendingVerification' : 'Confirmed',
                totalAmount: isRx ? 0 : cartTotal,
                adminNote: customerNotes ? `[Patient Note]: ${customerNotes.trim()}` : (isDirectRxOnly ? '[Direct Prescription Upload Order]' : null),
                items: orderItems
            };

            // This MUST succeed — no silent fallback. Errors surface to the user.
            const res = await api.post('/PharmacyOrders', orderPayload);
            const createdOrder = res.data;

            try {
                const cache = JSON.parse(localStorage.getItem('medix_pharmacy_orders') || '[]');
                const updatedCache = [createdOrder, ...cache.filter(o => o.id !== createdOrder.id && o.orderNumber !== createdOrder.orderNumber)];
                localStorage.setItem('medix_pharmacy_orders', JSON.stringify(updatedCache));
            } catch (cacheErr) {
                console.warn('localStorage cache update failed (non-critical):', cacheErr);
            }

            setCart([]);
            setCustomerNotes('');
            setShowCheckoutModal(false);
            setShowCartDrawer(false);
            setPrescriptionPreview(null);
            setPrescriptionFile(null);

            if (isRx) {
                setOrderSuccessData(createdOrder);
            } else {
                showToastMessage('Order placed successfully!', 'success');
            }

            if (onOrderSubmitted) onOrderSubmitted();
        } catch (err) {
            console.error('Order placement error:', err);
            showToastMessage(
                getErrorMessage(err, 'Failed to submit order. Please check your connection and try again.'),
                'error'
            );
        } finally {
            setSubmittingOrder(false);
        }
    };

    const filteredMedicines = medicines.filter(med => {
        const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            med.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = selectedCategory === 'ALL' || med.categoryName === selectedCategory;
        return matchesSearch && matchesCat;
    });

    return (
        <div style={{
            ...ps.container,
            ...(viewMode === 'mobile' ? {
                maxWidth: '430px',
                margin: '0 auto',
                border: '12px solid #0F172A',
                borderRadius: '40px',
                padding: '16px',
                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)',
                backgroundColor: '#F8FAFC',
                position: 'relative'
            } : {})
        }}>
            {viewMode === 'mobile' && (
                <div style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    padding: '4px 12px 12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#64748B',
                    borderBottom: '1px solid #E2E8F0',
                    marginBottom: '16px'
                }}>
                    <span>📱 HealthBridge Mobile App</span>
                    <span style={{ color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '10px' }}>5G Live</span>
                </div>
            )}

            {/* Toast */}
            {toast.show && (
                <div style={{
                    ...ps.toast,
                    backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Added to Cart Mini Popup Notification */}
            {addedCartNotification && (
                <div style={ps.cartPopupToast}>
                    <div style={ps.cartPopupIconBox}>
                        <ShoppingBag size={22} color="#FFFFFF" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ✓ Successfully Added to Cart
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                            {addedCartNotification.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                            Rs. {addedCartNotification.price?.toFixed(2)} • Item in your cart
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setAddedCartNotification(null);
                            setShowCartDrawer(true);
                        }}
                        style={ps.cartPopupViewBtn}
                    >
                        View Cart
                    </button>
                    <button
                        onClick={() => setAddedCartNotification(null)}
                        style={ps.cartPopupCloseBtn}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Antigravity floating motion keyframes style */}
            <style>{`
                @keyframes antigravityFloat {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-7px) rotate(0.4deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .antigravity-card {
                    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                .antigravity-card:hover {
                    animation: antigravityFloat 4s ease-in-out infinite;
                    transform: translateY(-8px) scale(1.015) !important;
                    box-shadow: 0 20px 35px -10px rgba(5, 150, 105, 0.25), 0 10px 15px -5px rgba(0,0,0,0.08) !important;
                }
                .animate-scale-up {
                    animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes scaleUp {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {/* View Mode Mode Switcher (Web Desktop Storefront vs Mobile App View) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                padding: '10px 20px',
                borderRadius: '14px',
                marginBottom: '20px',
                boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800 }}>
                    <Sparkles size={16} color="#10B981" />
                    <span>STOREFRONT PLATFORM VIEW DISPLAY MODE</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', backgroundColor: '#1E293B', padding: '4px', borderRadius: '10px' }}>
                    <button
                        type="button"
                        onClick={() => setViewMode('web')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: viewMode === 'web' ? '#059669' : 'transparent',
                            color: viewMode === 'web' ? '#FFFFFF' : '#94A3B8',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        🖥️ Web Desktop View
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('mobile')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: viewMode === 'mobile' ? '#059669' : 'transparent',
                            color: viewMode === 'mobile' ? '#FFFFFF' : '#94A3B8',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        📱 Mobile App View
                    </button>
                </div>
            </div>

            {/* Store Topbar Banner */}
            <div style={ps.banner}>
                <div style={ps.bannerContent}>
                    <div style={ps.rxBadgeTop}>
                        <Pill size={16} color="#10B981" />
                        <span>HEALTH BRIDGE CUSTOMER PHARMACY STORE</span>
                    </div>
                    <h2 style={ps.bannerTitle}>Genuine Medicines & Express Health Delivery</h2>
                    <p style={ps.bannerSub}>
                        Upload your doctor prescription for restricted items or order daily healthcare essentials online.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        style={{
                            ...ps.cartBtn,
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            color: '#FFFFFF',
                            border: '1px solid rgba(255, 255, 255, 0.4)'
                        }}
                        onClick={() => {
                            setIsDirectRxMode(true);
                            setShowCheckoutModal(true);
                        }}
                    >
                        <FileCheck size={20} color="#A7F3D0" />
                        <span>Upload Prescription Order</span>
                    </button>
                    <button style={ps.cartBtn} onClick={() => setShowCartDrawer(true)}>
                        <ShoppingBag size={20} />
                        <span>View Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
                        <span style={ps.cartBadgeCount}>Rs. {cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            </div>

            {/* Toolbar & Categories */}
            <div style={ps.toolbar}>
                <div style={ps.searchBox}>
                    <Search size={18} color="#64748B" />
                    <input
                        type="text"
                        placeholder="Search medicines, supplements, active ingredients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={ps.searchInput}
                    />
                </div>

                <div style={ps.categoryRow}>
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        style={{
                            ...ps.catPill,
                            ...(selectedCategory === 'ALL' ? ps.catPillActive : {})
                        }}
                    >
                        All Products ({medicines.length})
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.name)}
                            style={{
                                ...ps.catPill,
                                ...(selectedCategory === cat.name ? ps.catPillActive : {})
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid */}
            <div style={ps.grid}>
                {loading ? (
                    <div style={ps.loadingBox}>
                        <div className="spinner" />
                        <p>Loading pharmacy store catalog...</p>
                    </div>
                ) : filteredMedicines.length === 0 ? (
                    <div style={ps.emptyBox}>
                        <Pill size={48} color="#94A3B8" />
                        <h3>No Medicines Found</h3>
                        <p>Try searching for a different drug name or clear your filters.</p>
                    </div>
                ) : (
                    filteredMedicines.map(med => {
                        const isRx = med.requiresPrescription === true || med.RequiresPrescription === true;
                        const storageCondition = med.storageCondition || 'Normal Room Temperature (Below 25°C)';
                        const isRefrigerated = storageCondition.includes('Refrigerated');
                        const brandName = med.brandName || med.BrandName || 'Cipla Laboratories';

                        return (
                            <div
                                key={med.id}
                                className="antigravity-card"
                                style={{
                                    ...ps.card,
                                    border: isRx ? '1.5px solid #FCA5A5' : ps.card.border,
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    setSelectedDetailMed(med);
                                    setActiveDetailImageIndex(0);
                                    setDetailQty(1);
                                }}
                            >
                                <div style={ps.imgWrapper}>
                                    <img
                                        src={med.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop'}
                                        alt={med.name}
                                        style={ps.cardImg}
                                    />
                                    {isRx && (
                                        <span style={ps.rxRequiredBadge} onClick={(e) => { e.stopPropagation(); setRxModalMedicine(med); }}>
                                            <FileCheck size={12} /> Rx Required
                                        </span>
                                    )}

                                    {/* Storage condition floating badge */}
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        left: '8px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        backdropFilter: 'blur(4px)',
                                        backgroundColor: isRefrigerated ? 'rgba(30, 64, 175, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {isRefrigerated ? '❄️ 2°C - 8°C' : '🌡️ Room Temp'}
                                    </span>
                                </div>

                                <div style={ps.cardBody}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={ps.cardCat}>{med.categoryName || 'General'}</span>
                                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase' }}>
                                            {brandName}
                                        </span>
                                    </div>
                                    <h3 style={ps.cardTitle}>{med.name}</h3>
                                    <p style={ps.cardDesc}>{med.description || 'Quality pharmaceuticals.'}</p>

                                    <div style={ps.cardFooter}>
                                        <div>
                                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>
                                                Rs. {med.price?.toFixed(2)} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>/ pill</span>
                                            </div>
                                            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                                                Card ({med.pillsPerCard || 10} pills): <span style={{ color: '#0F172A', fontWeight: 700 }}>Rs. {(med.cardPrice || med.price * (med.pillsPerCard || 10))?.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {isRx ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRxModalMedicine(med);
                                                    }}
                                                    disabled={med.stockQuantity <= 0}
                                                    style={{
                                                        ...ps.addBtn,
                                                        padding: '7px 12px',
                                                        fontSize: '11.5px',
                                                        backgroundColor: med.stockQuantity > 0 ? '#D97706' : '#CBD5E1',
                                                        cursor: med.stockQuantity > 0 ? 'pointer' : 'not-allowed',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                    title="Doctor Prescription Required: Tap to view details & request quote"
                                                >
                                                    <FileCheck size={13} /> Quote
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(med, 'Pill');
                                                        }}
                                                        disabled={med.stockQuantity <= 0}
                                                        style={{
                                                            ...ps.addBtn,
                                                            padding: '6px 10px',
                                                            fontSize: '11.5px',
                                                            backgroundColor: med.stockQuantity > 0 ? '#059669' : '#CBD5E1',
                                                            cursor: med.stockQuantity > 0 ? 'pointer' : 'not-allowed'
                                                        }}
                                                        title="Add 1 Pill to Cart"
                                                    >
                                                        + Pill
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(med, 'Card');
                                                        }}
                                                        disabled={med.stockQuantity <= 0}
                                                        style={{
                                                            ...ps.addBtn,
                                                            padding: '6px 10px',
                                                            fontSize: '11.5px',
                                                            backgroundColor: med.stockQuantity > 0 ? '#047857' : '#CBD5E1',
                                                            cursor: med.stockQuantity > 0 ? 'pointer' : 'not-allowed'
                                                        }}
                                                        title={`Add 1 Card (${med.pillsPerCard || 10} pills) to Cart`}
                                                    >
                                                        + Card
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Cart Drawer */}
            {showCartDrawer && (
                <div style={ps.drawerOverlay} onClick={() => setShowCartDrawer(false)}>
                    <div style={ps.drawer} onClick={e => e.stopPropagation()}>
                        <div style={ps.drawerHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShoppingBag size={20} color="#059669" />
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A' }}>Shopping Cart</h3>
                            </div>
                            <button onClick={() => setShowCartDrawer(false)} style={ps.closeBtn}><X size={20} /></button>
                        </div>

                        <div style={ps.drawerBody}>
                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                                    <ShoppingBag size={48} color="#CBD5E1" />
                                    <p style={{ marginTop: '12px', fontWeight: 600 }}>Your cart is empty</p>
                                </div>
                            ) : (
                                <>
                                    {hasRxItems && (
                                        <div style={ps.rxNoticeBanner}>
                                            <ShieldAlert size={20} color="#DC2626" />
                                            <div>
                                                <strong style={{ color: '#991B1B', fontSize: '13px' }}>[Rx Required Items Included]</strong>
                                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#7F1D1D' }}>
                                                    Doctor prescription receipt upload is required at checkout. Direct payment is locked until Pharmacist approval.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {cart.map((item, idx) => {
                                            const isRx = item.requiresPrescription || item.RequiresPrescription || item.unitType === 'RxQuote';
                                            const itemPrice = item.unitType === 'Card'
                                                ? (item.cardPrice || item.price * (item.pillsPerCard || 10))
                                                : item.price;
                                            const lineTotal = itemPrice * item.quantity;

                                            return (
                                                <div key={`${item.id}-${item.unitType}-${idx}`} style={ps.cartItem}>
                                                    <div style={{ flex: 1, paddingRight: '8px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span>{item.name}</span>
                                                            {isRx ? <span style={ps.rxTagSmall}>Rx Verification</span> : <span style={{ ...ps.rxTagSmall, background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>OTC</span>}
                                                        </div>

                                                        {isRx ? (
                                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', marginTop: '6px', background: '#FFFBEB', padding: '4px 8px', borderRadius: '6px', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <Lock size={12} /> Pharmacist will calculate price &amp; dosage from prescription
                                                            </div>
                                                        ) : (
                                                            /* Unit vs Card Selector for OTC items */
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Order Unit:</span>
                                                                <select
                                                                    value={item.unitType || 'Pill'}
                                                                    onChange={(e) => updateUnitType(idx, e.target.value)}
                                                                    style={ps.cartDaysSelect}
                                                                >
                                                                    <option value="Pill">💊 1 Pill (Rs. {item.price?.toFixed(2)})</option>
                                                                    <option value="Card">🎴 1 Card ({item.pillsPerCard || 10} Pills - Rs. {(item.cardPrice || item.price * (item.pillsPerCard || 10))?.toFixed(2)})</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {!isRx && (
                                                                <div style={ps.qtyControls}>
                                                                    <button onClick={() => updateQuantity(item.id, -1)} style={ps.qtyBtn}><Minus size={12} /></button>
                                                                    <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                                                                    <button onClick={() => updateQuantity(item.id, 1)} style={ps.qtyBtn}><Plus size={12} /></button>
                                                                </div>
                                                            )}
                                                            <button onClick={() => removeFromCart(item.id)} style={ps.deleteBtn}><Trash2 size={14} /></button>
                                                        </div>
                                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: isRx ? '#D97706' : '#059669' }}>
                                                            {isRx ? 'Quote Pending' : `Rs. ${lineTotal.toFixed(2)}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div style={ps.drawerFooter}>
                                {/* Fulfillment Delivery Options */}
                                <div style={{ marginBottom: '14px', paddingTop: '4px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Truck size={15} color="#059669" /> Select Delivery Option:
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setDeliveryMethod('HomeDelivery')}
                                            style={{
                                                flex: 1,
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: deliveryMethod === 'HomeDelivery' ? '2px solid #059669' : '1px solid #CBD5E1',
                                                backgroundColor: deliveryMethod === 'HomeDelivery' ? '#ECFDF5' : '#FFFFFF',
                                                color: deliveryMethod === 'HomeDelivery' ? '#065F46' : '#475569',
                                                fontWeight: 700,
                                                fontSize: '11.5px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {"🚚 Home Delivery (+ Delivery Charges < 500)"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeliveryMethod('Pickup')}
                                            style={{
                                                flex: 1,
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: deliveryMethod === 'Pickup' ? '2px solid #059669' : '1px solid #CBD5E1',
                                                backgroundColor: deliveryMethod === 'Pickup' ? '#ECFDF5' : '#FFFFFF',
                                                color: deliveryMethod === 'Pickup' ? '#065F46' : '#475569',
                                                fontWeight: 700,
                                                fontSize: '11.5px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🏥 Counter Pickup (FREE)
                                        </button>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                                    {requiresVerification ? (
                                        <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', marginBottom: '10px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={16} color="#D97706" /> Pharmacist Verification &amp; Quote Flow
                                            </div>
                                            <p style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.45, color: '#78350F' }}>
                                                Your order contains prescription-required items. Final total cost will be calculated and quoted by our Pharmacist after reviewing your doctor prescription.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748B', marginBottom: '4px' }}>
                                                <span>Items Subtotal:</span>
                                                <span style={{ fontWeight: 600, color: '#0F172A' }}>Rs. {cartSubtotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748B', marginBottom: '8px' }}>
                                                <span>Delivery Charge:</span>
                                                <span style={{ fontWeight: 700, color: '#059669' }}>
                                                    {deliveryMethod === 'HomeDelivery' ? 'Payable on Delivery (< Rs. 500)' : 'FREE'}
                                                </span>
                                            </div>
                                            <div style={ps.subtotalRow}>
                                                <span>Total Amount</span>
                                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>Rs. {cartTotal.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setIsDirectRxMode(false);
                                        setShowCartDrawer(false);
                                        setShowCheckoutModal(true);
                                    }}
                                    style={ps.checkoutBtn}
                                >
                                    Proceed to Checkout <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Checkout & Prescription Modal */}
            {showCheckoutModal && (
                <div style={ps.drawerOverlay} onClick={() => setShowCheckoutModal(false)}>
                    <div style={ps.checkoutModal} onClick={e => e.stopPropagation()}>
                        <div style={ps.drawerHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isDirectRxOnly ? '🏥 Direct Doctor Prescription Order' : 'Order Checkout & Verification'}
                            </h3>
                            <button onClick={() => setShowCheckoutModal(false)} style={ps.closeBtn}><X size={20} /></button>
                        </div>

                        <form onSubmit={handlePlaceOrder} style={ps.modalBody}>
                            {isDirectRxOnly && (
                                <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#ECFDF5', border: '1.5px solid #A7F3D0', color: '#065F46', marginBottom: '16px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={18} color="#059669" /> Senior &amp; Direct Prescription Ordering Service
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#065F46' }}>
                                        No need to search for individual medicines! Simply upload a photo of your doctor prescription below. Our registered pharmacist will calculate the price, set dosage, and send your total cost quote to your <strong>My Orders</strong> tab for easy confirmation &amp; payment.
                                    </p>
                                </div>
                            )}

                            {/* Contact Details */}
                            <div style={ps.formSection}>
                                <h4 style={ps.sectionTitle}>1. Delivery &amp; Contact Details</h4>
                                <div style={ps.formGroup}>
                                    <label style={ps.label}>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        style={ps.input}
                                    />
                                </div>
                                <div style={ps.formGroup}>
                                    <label style={ps.label}>Phone Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        style={ps.input}
                                    />
                                </div>
                                <div style={ps.formGroup}>
                                    <label style={ps.label}>Delivery Address *</label>
                                    <textarea
                                        rows="2"
                                        required
                                        value={deliveryAddress}
                                        onChange={e => setDeliveryAddress(e.target.value)}
                                        style={ps.textarea}
                                    />
                                </div>
                            </div>

                            {/* Prescription Upload Section */}
                            <div style={ps.rxUploadSection}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <FileCheck size={18} color={(hasRxItems || isDirectRxOnly) ? '#DC2626' : '#059669'} />
                                    <h4 style={{ ...ps.sectionTitle, margin: 0, color: (hasRxItems || isDirectRxOnly) ? '#991B1B' : '#065F46' }}>
                                        2. Doctor Prescription Upload {(hasRxItems || isDirectRxOnly) ? '(MANDATORY)' : '(Optional Verification)'}
                                    </h4>
                                </div>

                                <div style={{ ...ps.alertInfo, background: (hasRxItems || isDirectRxOnly) ? '#FEF2F2' : '#ECFDF5', borderColor: (hasRxItems || isDirectRxOnly) ? '#FECACA' : '#A7F3D0', color: (hasRxItems || isDirectRxOnly) ? '#991B1B' : '#065F46' }}>
                                    <Sparkles size={16} color={(hasRxItems || isDirectRxOnly) ? '#DC2626' : '#059669'} />
                                    <span>
                                        {isDirectRxOnly
                                            ? '⚠️ Doctor prescription photo is required so our pharmacist can inspect the medicine list & calculate your dosage cost.'
                                            : hasRxItems
                                                ? '⚠️ Doctor prescription photo is required because your cart includes prescription-restricted items. Upload receipt so our pharmacist can verify dosage.'
                                                : 'Attach a doctor prescription photo or bill receipt if you want our Pharmacist to verify dosage instructions for your order.'}
                                    </span>
                                </div>

                                <div style={{ ...ps.uploadBox, borderColor: (hasRxItems || isDirectRxOnly) && !prescriptionPreview ? '#DC2626' : '#A7F3D0', background: (hasRxItems || isDirectRxOnly) && !prescriptionPreview ? '#FFF5F5' : '#F0FDFA' }}>
                                    <Upload size={32} color={(hasRxItems || isDirectRxOnly) ? '#DC2626' : '#059669'} />
                                    <p style={{ margin: '8px 0 4px', fontWeight: 600, fontSize: '13px', color: (hasRxItems || isDirectRxOnly) ? '#991B1B' : '#065F46' }}>
                                        Click to Upload Doctor Prescription Photo
                                    </p>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                                        Select image from PC Storage (JPG, PNG, PDF)
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        style={ps.fileInput}
                                    />
                                </div>

                                {prescriptionPreview && (
                                    <div style={ps.previewBox}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>✓ Doctor Prescription Receipt Attached:</span>
                                        <img src={prescriptionPreview} alt="Rx Preview" style={ps.previewImg} />
                                    </div>
                                )}

                                {/* Customer Notes & Allergies Field */}
                                <div style={{ marginTop: '16px' }}>
                                    <label style={{ ...ps.label, display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontWeight: 700, fontSize: '13px' }}>
                                        <Sparkles size={15} color="#059669" />
                                        Customer Notes, Medical Details &amp; Allergies (Optional):
                                    </label>
                                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 6px 0' }}>
                                        Inform our pharmacist about any drug allergies (e.g. penicillin allergy), dosage preferences, or special requests.
                                    </p>
                                    <textarea
                                        rows="2"
                                        placeholder="e.g. Allergic to penicillin, need 5 days supply, please verify capsule dosage..."
                                        value={customerNotes}
                                        onChange={e => setCustomerNotes(e.target.value)}
                                        style={ps.textarea}
                                    />
                                </div>
                            </div>

                            {/* Section 3: Payment Method Selection OR Pharmacist Verification Notice */}
                            <div style={{ ...ps.formSection, marginTop: '16px' }}>
                                {requiresVerification ? (
                                    <div style={{ padding: '16px', borderRadius: '12px', background: '#ECFDF5', border: '1.5px solid #A7F3D0', color: '#065F46' }}>
                                        <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CheckCircle2 size={18} color="#059669" /> Prescription Verification &amp; Pharmacist Quote Flow
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.55, color: '#047857' }}>
                                            After our Pharmacist approves your prescription and calculates the final cost, you can review the total amount and complete payment on your <strong>"My Orders"</strong> page. Direct online payment is disabled until pharmacist approval.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <h4 style={ps.sectionTitle}>3. Select Payment Method</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {/* Option 1: Cash On Delivery */}
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justify: 'space-between',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: paymentMethod === 'CashOnDelivery' ? '2px solid #059669' : '1px solid #CBD5E1',
                                                backgroundColor: paymentMethod === 'CashOnDelivery' ? '#ECFDF5' : '#FFFFFF',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input
                                                        type="radio"
                                                        name="payMethod"
                                                        checked={paymentMethod === 'CashOnDelivery'}
                                                        onChange={() => setPaymentMethod('CashOnDelivery')}
                                                        style={{ accentColor: '#059669' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>💵 Cash on Home Delivery (COD)</div>
                                                        <div style={{ fontSize: '12px', color: '#64748B' }}>Pay cash when medicines arrive at your doorstep</div>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: '6px' }}>Popular</span>
                                            </label>

                                            {/* Option 2: Credit / Debit Card */}
                                            <label style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: paymentMethod === 'Card' ? '2px solid #059669' : '1px solid #CBD5E1',
                                                backgroundColor: paymentMethod === 'Card' ? '#ECFDF5' : '#FFFFFF',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <input
                                                            type="radio"
                                                            name="payMethod"
                                                            checked={paymentMethod === 'Card'}
                                                            onChange={() => setPaymentMethod('Card')}
                                                            style={{ accentColor: '#059669' }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>💳 Credit / Debit Card</div>
                                                            <div style={{ fontSize: '12px', color: '#64748B' }}>Visa, MasterCard, AMEX (Instant Online Checkout)</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {paymentMethod === 'Card' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #A7F3D0' }} onClick={e => e.stopPropagation()}>
                                                        <div>
                                                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>Cardholder Name</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Name as printed on card"
                                                                value={cardHolder}
                                                                onChange={e => setCardHolder(e.target.value)}
                                                                style={ps.input}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>Card Number</label>
                                                            <input
                                                                type="text"
                                                                placeholder="4532 •••• •••• 8912"
                                                                value={cardNumber}
                                                                onChange={e => setCardNumber(e.target.value)}
                                                                style={ps.input}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>Expiry Date</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="MM / YY"
                                                                    value={cardExpiry}
                                                                    onChange={e => setCardExpiry(e.target.value)}
                                                                    style={ps.input}
                                                                />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>CVV</label>
                                                                <input
                                                                    type="password"
                                                                    placeholder="123"
                                                                    maxLength={4}
                                                                    value={cardCvv}
                                                                    onChange={e => setCardCvv(e.target.value)}
                                                                    style={ps.input}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>

                                            {/* Option 3: Pay at Counter / Generate QR Code */}
                                            <label style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: paymentMethod === 'PayAtCounter' ? '2px solid #059669' : '1px solid #CBD5E1',
                                                backgroundColor: paymentMethod === 'PayAtCounter' ? '#ECFDF5' : '#FFFFFF',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <input
                                                            type="radio"
                                                            name="payMethod"
                                                            checked={paymentMethod === 'PayAtCounter'}
                                                            onChange={() => setPaymentMethod('PayAtCounter')}
                                                            style={{ accentColor: '#059669' }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>📱 Pay at Counter / Generate QR Code</div>
                                                            <div style={{ fontSize: '12px', color: '#64748B' }}>Instant QR pickup ticket &amp; in-person counter payment</div>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', background: '#CCFBF1', padding: '3px 8px', borderRadius: '6px' }}>QR Instant</span>
                                                </div>
                                                {paymentMethod === 'PayAtCounter' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px', marginTop: '4px', borderTop: '1px solid #A7F3D0' }} onClick={e => e.stopPropagation()}>
                                                        <div style={{ padding: '8px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <QrCode size={40} color="#059669" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>Hospital Counter QR Digital Pass</div>
                                                            <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>A digital QR order ticket will be generated upon submission for counter pickup or fast scan.</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={ps.modalFooter}>
                                <button type="button" onClick={() => setShowCheckoutModal(false)} style={ps.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submittingOrder} style={ps.submitOrderBtn}>
                                    {submittingOrder ? 'Submitting Order...' : requiresVerification ? 'Submit Order for Pharmacist Verification' : 'Confirm & Place Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Prescription Order Submission Confirmation Modal */}
            {orderSuccessData && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '24px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ECFDF5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle2 size={36} color="#059669" />
                        </div>

                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Order #{orderSuccessData.orderNumber || 'Submitted'}
                        </span>

                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '12px 0 8px' }}>
                            Prescription Order Submitted!
                        </h3>

                        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, margin: '0 0 20px' }}>
                            Your doctor prescription photo &amp; details have been sent to our registered pharmacists for verification.
                        </p>

                        <div style={{ textAlign: 'left', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>📋 Next Steps for your Order:</div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <span style={{ color: '#059669', fontWeight: 800 }}>1.</span>
                                <span>Licensed pharmacist reviews your doctor prescription receipt.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <span style={{ color: '#059669', fontWeight: 800 }}>2.</span>
                                <span>Pharmacist calculates total cost for medicines and home delivery charges (payable on delivery &lt; Rs. 500).</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <span style={{ color: '#059669', fontWeight: 800 }}>3.</span>
                                <span>An updated quote will be posted under <strong>My Orders</strong> tab.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <span style={{ color: '#059669', fontWeight: 800 }}>4.</span>
                                <span>You can review the approved price and click <strong>Confirm &amp; Pay</strong>.</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setOrderSuccessData(null);
                                    if (onNavigate) onNavigate('orders');
                                }}
                                style={{ flex: 1, padding: '12px 18px', backgroundColor: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <ClipboardList size={16} /> Go to My Orders
                            </button>
                            <button
                                onClick={() => setOrderSuccessData(null)}
                                style={{ padding: '12px 18px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '12px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer' }}
                            >
                                Back to Store
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rx Explanation Pop-up Window */}
            {rxModalMedicine && (
                <div style={ps.modalOverlay} onClick={() => setRxModalMedicine(null)}>
                    <div style={{ ...ps.checkoutModal, maxWidth: '480px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileCheck size={24} color="#DC2626" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800 }}>Doctor Prescription Needed</h3>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '2px' }}>Rx / Restricted Medicine</div>
                                </div>
                            </div>
                            <button onClick={() => setRxModalMedicine(null)} style={ps.closeBtn} title="Close">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Medicine Summary */}
                        <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                            <Pill size={24} color="#059669" />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{rxModalMedicine.name}</div>
                                <div style={{ fontSize: '12px', color: '#64748B' }}>Category: {rxModalMedicine.categoryName || 'General'}</div>
                            </div>
                        </div>

                        {/* Explanation for patients */}
                        <div style={{ marginBottom: '14px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#0F172A', display: 'block', marginBottom: '6px' }}>What does "Rx Required" mean?</strong>
                            <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                                In medical terminology, "Rx" stands for a Doctor's Prescription. This medicine is regulated for patient safety and cannot be dispensed without a valid prescription written by a doctor.
                            </p>
                        </div>

                        <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <Sparkles size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#065F46', lineHeight: 1.45 }}>
                                <strong>How to order:</strong> Tap "Request Quote", upload a photo of your doctor's prescription, and our licensed pharmacist will calculate your price &amp; dosage!
                            </p>
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setRxModalMedicine(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#FFFFFF',
                                    color: '#475569',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    const med = rxModalMedicine;
                                    setRxModalMedicine(null);
                                    addToCart(med, 'RxQuote');
                                }}
                                style={{
                                    flex: 2,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: '#D97706',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Upload size={16} /> Request Quote
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Daraz-Style Detailed Product Specification & Multi-Image Gallery Modal */}
            {selectedDetailMed && (
                <div style={ps.modalOverlay} onClick={() => setSelectedDetailMed(null)}>
                    <div style={ps.darazModalCard} onClick={e => e.stopPropagation()} className="animate-scale-up">
                        {/* Header Toolbar */}
                        <div style={ps.darazModalHeader}>
                            <button
                                type="button"
                                onClick={() => setSelectedDetailMed(null)}
                                style={ps.darazBackBtn}
                            >
                                ← Back to Products
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={ps.darazCatBadge}>
                                    {selectedDetailMed.categoryName?.toUpperCase() || 'GENERAL'}
                                </span>
                                <button type="button" onClick={() => setSelectedDetailMed(null)} style={ps.closeBtn}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body Grid */}
                        <div style={ps.darazModalGrid}>
                            {/* Left Column: Multi-Angle Gallery */}
                            <div style={ps.darazGallerySection}>
                                <div style={ps.darazMainImgContainer}>
                                    <img
                                        src={getGalleryImages(selectedDetailMed)[activeDetailImageIndex] || selectedDetailMed.imageUrl}
                                        alt={selectedDetailMed.name}
                                        style={ps.darazMainImg}
                                    />
                                    <div style={ps.genuineSeal}>
                                        <Sparkles size={12} color="#059669" /> 100% Genuine Medicine
                                    </div>
                                </div>

                                {/* Thumbnail Selector */}
                                <div style={ps.darazThumbStrip}>
                                    {getGalleryImages(selectedDetailMed).map((url, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActiveDetailImageIndex(idx)}
                                            style={{
                                                ...ps.darazThumbBtn,
                                                borderColor: activeDetailImageIndex === idx ? '#059669' : '#E2E8F0',
                                                transform: activeDetailImageIndex === idx ? 'scale(1.05)' : 'scale(1)'
                                            }}
                                        >
                                            <img src={url} alt={`Angle ${idx + 1}`} style={ps.darazThumbImg} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Detailed Product Specs */}
                            <div style={ps.darazSpecsSection}>
                                <div style={ps.darazBrandHeader}>
                                    <span style={ps.darazBrandBadge}>
                                        {(selectedDetailMed.brandName || selectedDetailMed.BrandName || 'CIPLA LABORATORIES').toUpperCase()}
                                    </span>
                                    <span style={ps.darazVerifiedText}>• Verified Pharmaceutical Brand</span>
                                </div>

                                <h2 style={ps.darazProductTitle}>{selectedDetailMed.name}</h2>

                                {/* Product Description Box */}
                                <div style={ps.darazDescContainer}>
                                    <div style={ps.darazSectionHeading}>PRODUCT DESCRIPTION</div>
                                    <p style={ps.darazDescParagraph}>
                                        {selectedDetailMed.description || 'Broad spectrum medical formulation produced under strict clinical quality standards.'}
                                    </p>
                                </div>

                                {/* Price & Pill Spec Card */}
                                <div style={ps.darazPriceBox}>
                                    <div style={ps.darazPriceItem}>
                                        <span style={ps.darazPriceLabel}>UNIT PRICE (PER PILL):</span>
                                        <span style={ps.darazPriceValue}>Rs. {selectedDetailMed.price?.toFixed(2)}</span>
                                    </div>
                                    <div style={ps.darazPriceItem}>
                                        <span style={ps.darazPriceLabel}>ONE CARD PRICE:</span>
                                        <span style={ps.darazCardPriceValue}>Rs. {(selectedDetailMed.cardPrice || selectedDetailMed.price * (selectedDetailMed.pillsPerCard || 10))?.toFixed(2)}</span>
                                    </div>
                                    <div style={ps.darazPriceItem}>
                                        <span style={ps.darazPriceLabel}>PILLS IN ONE CARD:</span>
                                        <span style={ps.darazPillsPill}>{selectedDetailMed.pillsPerCard || 10} pills in one card</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle2 size={14} /> In stock ({selectedDetailMed.stockQuantity} available) • Express Dispatch Ready
                                    </div>
                                </div>

                                {/* Storage Requirement */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={ps.darazSectionHeading}>STORAGE REQUIREMENT</div>
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        fontSize: '12.5px',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: selectedDetailMed.storageCondition?.includes('Refrigerated') ? '#EFF6FF' : '#ECFDF5',
                                        color: selectedDetailMed.storageCondition?.includes('Refrigerated') ? '#1E40AF' : '#047857',
                                        border: selectedDetailMed.storageCondition?.includes('Refrigerated') ? '1px solid #BFDBFE' : '1px solid #A7F3D0'
                                    }}>
                                        {selectedDetailMed.storageCondition || 'Normal Room Temperature (Store in a cool, dry place below 25°C)'}
                                    </div>
                                </div>

                                {/* Google Search Drug Details Button */}
                                <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent((selectedDetailMed.brandName || 'Cipla') + ' ' + selectedDetailMed.name + ' medicine dosage indication')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={ps.googleIdentifyBtn}
                                >
                                    🔍 Search &amp; Identify More Details on Google ↗
                                </a>

                                {/* Add to Cart Buttons */}
                                <div style={ps.darazCartBar}>
                                    <div style={ps.darazQtyWrap}>
                                        <button type="button" onClick={() => setDetailQty(q => Math.max(1, q - 1))} style={ps.darazQtyBtn}>-</button>
                                        <span style={ps.darazQtyNum}>{detailQty}</span>
                                        <button type="button" onClick={() => setDetailQty(q => q + 1)} style={ps.darazQtyBtn}>+</button>
                                    </div>

                                    {selectedDetailMed.requiresPrescription ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const med = selectedDetailMed;
                                                setSelectedDetailMed(null);
                                                setRxModalMedicine(med);
                                            }}
                                            style={ps.darazRxRequestBtn}
                                        >
                                            <FileCheck size={16} /> Request Doctor Quote
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    for (let i = 0; i < detailQty; i++) {
                                                        addToCart(selectedDetailMed, 'Pill');
                                                    }
                                                    showToastMessage(`Added ${detailQty} pill unit(s) of ${selectedDetailMed.name} to cart!`, 'success');
                                                    setSelectedDetailMed(null);
                                                }}
                                                style={ps.darazAddPillsBtn}
                                            >
                                                <Plus size={15} /> Add Pill ({detailQty})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    for (let i = 0; i < detailQty; i++) {
                                                        addToCart(selectedDetailMed, 'Card');
                                                    }
                                                    showToastMessage(`Added ${detailQty} card (${selectedDetailMed.pillsPerCard || 10}s) of ${selectedDetailMed.name} to cart!`, 'success');
                                                    setSelectedDetailMed(null);
                                                }}
                                                style={ps.darazAddCardsBtn}
                                            >
                                                <Plus size={15} /> Add Card ({selectedDetailMed.pillsPerCard || 10}s)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ps = {
    container: {
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    toast: {
        position: 'fixed',
        top: '24px',
        right: '24px',
        color: '#FFFFFF',
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    },
    cartPopupToast: {
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        backgroundColor: '#FFFFFF',
        border: '2px solid #10B981',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 20px 35px -5px rgba(16, 185, 129, 0.25), 0 10px 20px -5px rgba(0,0,0,0.08)',
        zIndex: 99999,
        minWidth: '340px',
        maxWidth: '440px',
    },
    cartPopupIconBox: {
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        backgroundColor: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
    },
    cartPopupViewBtn: {
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        border: 'none',
        padding: '8px 14px',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '12px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    cartPopupCloseBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#94A3B8',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
    },
    banner: {
        background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        color: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.25)',
    },
    bannerContent: {
        maxWidth: '650px',
    },
    rxBadgeTop: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.5px',
        marginBottom: '10px',
    },
    bannerTitle: {
        fontSize: '22px',
        fontWeight: 800,
        margin: '0 0 6px',
    },
    bannerSub: {
        fontSize: '13px',
        color: '#A7F3D0',
        margin: 0,
    },
    cartBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#FFFFFF',
        color: '#064E3B',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    cartBadgeCount: {
        backgroundColor: '#059669',
        color: '#FFFFFF',
        padding: '2px 8px',
        borderRadius: '8px',
        fontSize: '12px',
    },
    toolbar: {
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '10px',
        padding: '12px 18px',
    },
    searchInput: {
        border: 'none',
        outline: 'none',
        width: '100%',
        fontSize: '14px',
    },
    categoryRow: {
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
    },
    catPill: {
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        color: '#475569',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    catPillActive: {
        backgroundColor: '#059669',
        color: '#FFFFFF',
        borderColor: '#059669',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
    },
    imgWrapper: {
        position: 'relative',
        height: '160px',
        backgroundColor: '#F1F5F9',
    },
    cardImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    rxRequiredBadge: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: '#DC2626',
        color: '#FFFFFF',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    cardBody: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
    },
    cardCat: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#059669',
        textTransform: 'uppercase',
    },
    cardTitle: {
        fontSize: '15px',
        fontWeight: 700,
        color: '#0F172A',
        margin: '4px 0 6px',
    },
    cardDesc: {
        fontSize: '12px',
        color: '#64748B',
        margin: '0 0 16px',
        flex: 1,
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
    },
    cardPrice: {
        fontSize: '16px',
        fontWeight: 800,
        color: '#0F172A',
    },
    stockText: {
        fontSize: '11px',
        fontWeight: 600,
    },
    addBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: '#FFFFFF',
        border: 'none',
        padding: '8px 14px',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '12px',
    },
    drawerOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
    },
    drawer: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: '420px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    drawerHeader: {
        padding: '18px 24px',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#64748B',
    },
    drawerBody: {
        padding: '24px',
        flex: 1,
        overflowY: 'auto',
    },
    rxNoticeBanner: {
        backgroundColor: '#FEF2F2',
        border: '1px solid #FCA5A5',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        marginBottom: '16px',
    },
    cartItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        borderRadius: '10px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
    },
    cartDaysSelect: {
        padding: '3px 8px',
        borderRadius: '6px',
        border: '1px solid #059669',
        fontSize: '11px',
        fontWeight: 700,
        color: '#065F46',
        backgroundColor: '#FFFFFF',
        outline: 'none',
        cursor: 'pointer',
    },
    rxTagSmall: {
        fontSize: '10.5px',
        fontWeight: 800,
        color: '#DC2626',
        backgroundColor: '#FEE2E2',
        padding: '1px 6px',
        borderRadius: '4px',
        border: '1px solid #FCA5A5',
    },
    qtyControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        padding: '2px 6px',
    },
    qtyBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        color: '#475569',
    },
    deleteBtn: {
        background: 'none',
        border: 'none',
        color: '#EF4444',
        cursor: 'pointer',
    },
    drawerFooter: {
        padding: '20px 24px',
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    subtotalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
        fontSize: '14px',
        fontWeight: 600,
        color: '#475569',
    },
    checkoutBtn: {
        width: '100%',
        backgroundColor: '#059669',
        color: '#FFFFFF',
        border: 'none',
        padding: '14px',
        borderRadius: '10px',
        fontWeight: 700,
        fontSize: '15px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        margin: 'auto',
    },
    modalBody: {
        padding: '24px',
    },
    formSection: {
        marginBottom: '20px',
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: '12px',
    },
    formGroup: {
        marginBottom: '12px',
    },
    label: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 700,
        color: '#475569',
        marginBottom: '4px',
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #CBD5E1',
        fontSize: '13px',
        outline: 'none',
    },
    textarea: {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #CBD5E1',
        fontSize: '13px',
        outline: 'none',
        resize: 'vertical',
    },
    rxUploadSection: {
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
    },
    alertInfo: {
        display: 'flex',
        gap: '8px',
        fontSize: '12px',
        color: '#B45309',
        marginBottom: '14px',
    },
    uploadBox: {
        position: 'relative',
        border: '2px dashed #059669',
        borderRadius: '10px',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
    },
    fileInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
    },
    previewBox: {
        marginTop: '12px',
        textAlign: 'center',
    },
    previewImg: {
        width: '100%',
        maxHeight: '180px',
        objectFit: 'contain',
        borderRadius: '8px',
        marginTop: '6px',
        border: '1px solid #CBD5E1',
    },
    daysBtn: {
        flex: 1,
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '20px',
    },
    cancelBtn: {
        padding: '10px 18px',
        borderRadius: '8px',
        border: '1px solid #CBD5E1',
        backgroundColor: '#FFFFFF',
        color: '#475569',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    submitOrderBtn: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#059669',
        color: '#FFFFFF',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    loadingBox: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '60px 0',
        color: '#64748B',
    },
    emptyBox: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '60px 0',
        color: '#64748B',
    },
    // Daraz-Style Detailed Modal Styles
    darazModalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #E2E8F0',
        padding: '24px'
    },
    darazModalHeader: {
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        paddingBottom: '16px',
        marginBottom: '20px',
        borderBottom: '1px solid #E2E8F0'
    },
    darazBackBtn: {
        background: 'none',
        border: 'none',
        color: '#059669',
        fontWeight: 800,
        fontSize: '13.5px',
        cursor: 'pointer',
        padding: 0
    },
    darazCatBadge: {
        backgroundColor: '#ECFDF5',
        color: '#047857',
        border: '1px solid #A7F3D0',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.5px'
    },
    darazModalGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '28px',
        alignItems: 'start'
    },
    darazGallerySection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    darazMainImgContainer: {
        position: 'relative',
        width: '100%',
        height: '320px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justify: 'center'
    },
    darazMainImg: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        padding: '12px'
    },
    genuineSeal: {
        position: 'absolute',
        top: '12px',
        left: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        color: '#047857',
        fontSize: '11px',
        fontWeight: 800,
        padding: '4px 10px',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    darazThumbStrip: {
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
        paddingBottom: '4px'
    },
    darazThumbBtn: {
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        border: '2px solid',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        overflow: 'hidden',
        padding: '2px',
        transition: 'all 0.2s ease',
        flexShrink: 0
    },
    darazThumbImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '8px'
    },
    darazSpecsSection: {
        display: 'flex',
        flexDirection: 'column'
    },
    darazBrandHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px'
    },
    darazBrandBadge: {
        fontSize: '11.5px',
        fontWeight: 900,
        color: '#2563EB',
        backgroundColor: '#EFF6FF',
        padding: '3px 8px',
        borderRadius: '6px',
        letterSpacing: '0.5px'
    },
    darazVerifiedText: {
        fontSize: '11.5px',
        color: '#64748B',
        fontWeight: 600
    },
    darazProductTitle: {
        fontSize: '22px',
        fontWeight: 900,
        color: '#0F172A',
        margin: '0 0 14px',
        lineHeight: 1.3
    },
    darazDescContainer: {
        marginBottom: '16px'
    },
    darazSectionHeading: {
        fontSize: '11px',
        fontWeight: 800,
        color: '#64748B',
        letterSpacing: '0.5px',
        marginBottom: '6px'
    },
    darazDescParagraph: {
        fontSize: '13px',
        color: '#334155',
        lineHeight: 1.55,
        margin: 0
    },
    darazPriceBox: {
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    darazPriceItem: {
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        fontSize: '12.5px'
    },
    darazPriceLabel: {
        color: '#64748B',
        fontWeight: 700,
        fontSize: '11.5px'
    },
    darazPriceValue: {
        color: '#059669',
        fontWeight: 800,
        fontSize: '14px'
    },
    darazCardPriceValue: {
        color: '#0F172A',
        fontWeight: 900,
        fontSize: '15px'
    },
    darazPillsPill: {
        backgroundColor: '#E2E8F0',
        color: '#334155',
        fontSize: '11.5px',
        fontWeight: 800,
        padding: '2px 8px',
        borderRadius: '6px'
    },
    googleIdentifyBtn: {
        display: 'block',
        textAlign: 'center',
        backgroundColor: '#F1F5F9',
        color: '#1E293B',
        border: '1px solid #CBD5E1',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12px',
        fontWeight: 800,
        textDecoration: 'none',
        marginBottom: '20px',
        transition: 'all 0.2s ease'
    },
    darazCartBar: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    },
    darazQtyWrap: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #CBD5E1',
        borderRadius: '10px',
        backgroundColor: '#F8FAFC',
        padding: '4px'
    },
    darazQtyBtn: {
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    darazQtyNum: {
        padding: '0 12px',
        fontWeight: 800,
        fontSize: '14px',
        color: '#0F172A'
    },
    darazRxRequestBtn: {
        flex: 1,
        padding: '12px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: '#D97706',
        color: '#FFFFFF',
        fontWeight: 800,
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        gap: '6px'
    },
    darazAddPillsBtn: {
        flex: 1,
        padding: '12px 10px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: '#059669',
        color: '#FFFFFF',
        fontWeight: 800,
        fontSize: '12.5px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        gap: '4px'
    },
    darazAddCardsBtn: {
        flex: 1,
        padding: '12px 10px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: '#047857',
        color: '#FFFFFF',
        fontWeight: 800,
        fontSize: '12.5px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        gap: '4px'
    }
};

export default CustomerPharmacyStore;
