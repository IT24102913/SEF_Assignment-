import React, { useState, useEffect } from 'react';
import { getDisplayConfig } from '../../../utils/getDisplayConfig';
import { api } from '../../../api/authApi';
import PrescriptionViolationModal from '../../../components/modals/PrescriptionViolationModal';
import {
    Search,
    ShoppingBag,
    Pill,
    FileCheck,
    Upload,
    CheckCircle2,
    Clock,
    AlertCircle,
    AlertTriangle,
    Bell,
    Mail,
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
    const [outOfStockMed, setOutOfStockMed] = useState(null);

    // Storage condition label map: raw key → { emoji, label }
    const STORAGE_LABELS = {
        'room_temp': { emoji: '🌡️', label: 'Normal Room Temp. (<25°C)', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
        'normal room temperature': { emoji: '🌡️', label: 'Normal Room Temp. (<25°C)', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
        'cool_dry': { emoji: '🌤️', label: 'Cool & Dry Place (<25°C)', bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
        'cool & dry': { emoji: '🌤️', label: 'Cool & Dry Place (<25°C)', bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
        'refrigerated': { emoji: '❄️', label: 'Refrigerated (2°C – 8°C)', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
        'frozen': { emoji: '🧊', label: 'Frozen (Below -18°C)', bg: '#EFF6FF', color: '#1E40AF', border: '#93C5FD' },
        'protect_light': { emoji: '☀️', label: 'Protect from Light', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
        'protect from light': { emoji: '☀️', label: 'Protect from Light', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
        'protect_moist': { emoji: '💧', label: 'Protect from Moisture', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
        'protect_moisture': { emoji: '💧', label: 'Protect from Moisture', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
        'protect from moisture': { emoji: '💧', label: 'Protect from Moisture', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
        'keep_children': { emoji: '👶', label: 'Keep Out of Reach of Children', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
        'keep_reach': { emoji: '👶', label: 'Keep Out of Reach of Children', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
        'keep out of reach': { emoji: '👶', label: 'Keep Out of Reach of Children', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
        'original_pack': { emoji: '📦', label: 'Store in Original Container', bg: '#F8FAFC', color: '#334155', border: '#CBD5E1' },
        'store_original': { emoji: '📦', label: 'Store in Original Container', bg: '#F8FAFC', color: '#334155', border: '#CBD5E1' },
        'store in original': { emoji: '📦', label: 'Store in Original Container', bg: '#F8FAFC', color: '#334155', border: '#CBD5E1' },
        'below 30': { emoji: '🌡️', label: 'Store Below 30°C', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
        'do not freeze': { emoji: '🚫', label: 'Do Not Freeze', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
    };

    const parseStorageChips = (raw) => {
        if (!raw) return [{ emoji: '🌡️', label: 'Normal Room Temp. (<25°C)', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' }];
        const parts = raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        return parts.map(part => {
            const key = part.toLowerCase();
            for (const [k, v] of Object.entries(STORAGE_LABELS)) {
                if (key.includes(k)) return v;
            }
            return { emoji: '📋', label: part, bg: '#F8FAFC', color: '#334155', border: '#CBD5E1' };
        });
    };

    const handleOutOfStockClick = (med) => {
        setOutOfStockMed(med);
        // Save notification for pharmacist/admin
        try {
            const existing = JSON.parse(localStorage.getItem('medix_admin_alerts') || '[]');
            const alert = {
                id: `oos-${med.id}-${Date.now()}`,
                type: 'OUT_OF_STOCK_REQUEST',
                medicineName: med.name,
                medicineId: med.id,
                categoryName: med.categoryName,
                patientName: user?.fullName || 'Patient',
                patientEmail: user?.email || 'unknown@patient.lk',
                message: `Patient "${user?.fullName || 'Patient'}" tried to order "${med.name}" but it is OUT OF STOCK. Please replenish stock urgently.`,
                createdAt: new Date().toISOString(),
                read: false
            };
            localStorage.setItem('medix_admin_alerts', JSON.stringify([alert, ...existing]));
        } catch (_) { }
    };

    // Checkout Form state
    const [customerName, setCustomerName] = useState(user?.fullName || '');
    const [customerEmail, setCustomerEmail] = useState(user?.email || '');
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

    // Form Field Validation State
    const [validationModalErrors, setValidationModalErrors] = useState(null);
    const [fieldTouched, setFieldTouched] = useState({});

    // Notifications & Prescription Violation Modal State
    const [showNotifsDropdown, setShowNotifsDropdown] = useState(false);
    const [notificationsList, setNotificationsList] = useState([]);
    const [selectedViolationNotif, setSelectedViolationNotif] = useState(null);

    const [isBlocked, setIsBlocked] = useState(() => {
        if (user?.isPharmacyBlocked) return true;
        try {
            const blocked = JSON.parse(localStorage.getItem('medix_blocked_users') || '[]');
            return user?.email ? blocked.includes(user.email) : false;
        } catch (e) { return false; }
    });

    useEffect(() => {
        const checkUserBlockedStatus = async () => {
            if (!user?.email) return;
            try {
                const res = await api.get(`/PharmacyOrders/check-blocked/${encodeURIComponent(user.email)}`);
                if (res.data && typeof res.data.isPharmacyBlocked === 'boolean') {
                    setIsBlocked(res.data.isPharmacyBlocked);
                }
            } catch (e) { }
        };
        checkUserBlockedStatus();
    }, [user]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('medix_notifications');
            let list = raw ? JSON.parse(raw) : [];
            const defaultViolationNotif = {
                id: 'notif-7862',
                title: '⚠️ URGENT PRESCRIPTION VIOLATION WARNING: #ORD-20260923-7862',
                message: 'We detected that you uploaded an invalid non-medical image for prescription verification (Order #ORD-20260923-7862). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to healthbridgeyourpharmacy@gmail.com.',
                targetOrderNumber: 'ORD-20260923-7862',
                isViolationWarning: true,
                read: false,
                createdAt: new Date().toISOString()
            };
            list = list.map(n => ({
                ...n,
                message: n.message ? n.message.replace(/medibridge@gmail\.com/g, 'healthbridgeyourpharmacy@gmail.com') : n.message
            }));
            if (!list.some(n => n.id === 'notif-7862' || n.targetOrderNumber === 'ORD-20260923-7862')) {
                list = [defaultViolationNotif, ...list];
            }
            localStorage.setItem('medix_notifications', JSON.stringify(list));
            setNotificationsList(list);
        } catch (e) { }
    }, [showNotifsDropdown]);

    const handleNotificationClick = (n) => {
        setShowNotifsDropdown(false);
        if (n.isViolationWarning || n.title?.includes('VIOLATION') || n.title?.includes('WARNING')) {
            setSelectedViolationNotif(n);
        } else if (n.targetOrderNumber && onNavigate) {
            onNavigate('orders');
        }
    };

    const getGalleryImages = (med) => {
        if (!med) return [];
        const list = [];

        // 1. Parse additionalImagesJson (admin uploaded photos) FIRST so valid uploaded images take priority
        if (med.additionalImagesJson) {
            try {
                const parsed = typeof med.additionalImagesJson === 'string'
                    ? JSON.parse(med.additionalImagesJson)
                    : med.additionalImagesJson;
                if (Array.isArray(parsed)) {
                    parsed.forEach(url => {
                        if (url && typeof url === 'string' && url.trim() && !list.includes(url.trim())) {
                            list.push(url.trim());
                        }
                    });
                }
            } catch (e) { }
        }

        // 2. Process main imageUrl
        if (med.imageUrl && typeof med.imageUrl === 'string' && med.imageUrl.trim()) {
            const main = med.imageUrl.trim();
            const isBrokenStock = main.includes('photo-1584308666744-24d5c474f2ae') || main.includes('photo-1471864190281');
            if (!list.includes(main)) {
                if (isBrokenStock && list.length > 0) {
                    list.push(main);
                } else {
                    list.unshift(main);
                }
            }
        }

        // 3. Guaranteed working high-res medical photo fallbacks
        if (list.length === 0) {
            list.push('https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop');
        }
        if (list.length === 1) {
            list.push('https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop');
            list.push('https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop');
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

    const addToCart = (med, unitType = 'Pill', customPrice = null) => {
        const isRx = med.requiresPrescription === true || med.RequiresPrescription === true;
        const config = getDisplayConfig(med);
        const selectedBtn = config.buttons.find(b => b.unitType === unitType) || config.buttons[0];
        const itemPrice = customPrice ?? selectedBtn.price ?? med.price ?? 0;
        const displayLabel = selectedBtn ? selectedBtn.label.replace('+ ', '') : unitType;

        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === med.id && item.unitType === unitType);
            if (existingIndex > -1) {
                if (isRx) {
                    showToastMessage(`${med.name} is already added for prescription verification quote!`, 'info');
                    return prev;
                }
                return prev.map((item, idx) => idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item);
            }

            return [...prev, {
                ...med,
                price: itemPrice,
                unitType: isRx ? 'RxQuote' : unitType,
                unitLabel: displayLabel,
                quantity: 1,
                requiresPrescription: isRx
            }];
        });

        // Trigger pop-up notification
        setAddedCartNotification({
            name: isRx ? `${med.name} (Prescription Quote)` : `${med.name} (${displayLabel})`,
            price: isRx ? 0 : itemPrice,
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
        const itemConfig = getDisplayConfig(item);
        const selectedBtn = itemConfig.buttons.find(b => b.unitType === item.unitType) || itemConfig.buttons[0];
        const itemPrice = selectedBtn ? selectedBtn.price : (item.price || 0);
        return sum + (itemPrice * item.quantity);
    }, 0);

    const deliveryFee = 0;
    const cartTotal = cartSubtotal;

    const validateField = (field, value) => {
        const val = (value || '').trim();
        if (field === 'name') {
            if (!val) return 'Enter full name';
            if (/[0-9]/.test(val)) return 'Full name cannot contain numbers';
            if (!/^[a-zA-Z\s\.\-]+$/.test(val)) return 'Full name cannot contain symbols';
            return '';
        }
        if (field === 'email') {
            if (!val) return 'Enter email address';
            if (!val.includes('@') || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(val)) {
                return 'Please enter a valid email address with @';
            }
            return '';
        }
        if (field === 'phone') {
            if (!val) return 'Telephone field is empty';
            if (val.length !== 10 || !/^\d{10}$/.test(val)) {
                return 'Phone number must be exactly 10 digits';
            }
            return '';
        }
        if (field === 'address') {
            if (!val) return 'Enter delivery address';
            if (/^\d+$/.test(val)) return 'Delivery address cannot be only numbers';
            return '';
        }
        return '';
    };

    const collectValidationErrors = () => {
        const errors = [];

        // Full Name
        const nameVal = (customerName || '').trim();
        if (!nameVal) errors.push('Full name field is empty');
        else if (/[0-9]/.test(nameVal)) errors.push('Full name cannot contain numbers');
        else if (!/^[a-zA-Z\s\.\-]+$/.test(nameVal)) errors.push('Full name cannot contain symbols');

        // Email
        const emailVal = (customerEmail || '').trim();
        if (!emailVal) errors.push('Email address field is empty');
        else if (!emailVal.includes('@') || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(emailVal)) {
            errors.push('Email address field must contain @ and a valid domain (e.g. name@gmail.com)');
        }

        // Phone
        const phoneVal = (customerPhone || '').trim();
        if (!phoneVal) errors.push('Telephone field is empty');
        else if (phoneVal.length !== 10 || !/^\d{10}$/.test(phoneVal)) {
            errors.push('Phone number must be exactly 10 digits (numbers only)');
        }

        // Address
        const addressVal = (deliveryAddress || '').trim();
        if (!addressVal) errors.push('Delivery address field is empty');
        else if (/^\d+$/.test(addressVal)) errors.push('Delivery address cannot be only numbers');

        // Prescription Upload
        if (isDirectRxOnly && !prescriptionPreview && !prescriptionFile) {
            errors.push('Doctor prescription photo is mandatory for direct prescription orders');
        } else if (hasRxItems && !prescriptionPreview && !prescriptionFile) {
            errors.push('Doctor prescription photo is mandatory for prescription-restricted items');
        }

        return errors;
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (isBlocked) {
            showToastMessage('Your account is BLOCKED from pharmacy & prescription ordering due to an administrative restriction.', 'error');
            return;
        }

        // Touch all fields to show inline red error indicators
        setFieldTouched({ name: true, email: true, phone: true, address: true });

        const validationErrors = collectValidationErrors();
        if (validationErrors.length > 0) {
            setValidationModalErrors(validationErrors);
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
            const finalCustomerEmail = customerEmail.trim() || ((user?.email && user.email.includes('@'))
                ? user.email
                : (user?.username && user.username.includes('@'))
                    ? user.username
                    : `patient+${user?.id || Date.now()}@healthbridge.lk`);

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
                customerEmail: finalCustomerEmail,
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

            const isPickupOrCounter = (deliveryMethod === 'Pickup' || paymentMethod === 'PayAtCounter');

            if (isRx || isPickupOrCounter) {
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
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            ...(isBlocked ? { opacity: 0.4, cursor: 'not-allowed' } : {})
                        }}
                        onClick={() => {
                            if (isBlocked) {
                                showToastMessage('🚫 Your account is BLOCKED from pharmacy & prescription ordering by administration.', 'error');
                                return;
                            }
                            setIsDirectRxMode(true);
                            setShowCheckoutModal(true);
                        }}
                    >
                        <FileCheck size={20} color="#A7F3D0" />
                        <span>Upload Prescription Order</span>
                    </button>
                    <button
                        style={{
                            ...ps.cartBtn,
                            ...(isBlocked ? { opacity: 0.4, cursor: 'not-allowed' } : {})
                        }}
                        onClick={() => {
                            if (isBlocked) {
                                showToastMessage('🚫 Your account is BLOCKED from pharmacy & prescription ordering by administration.', 'error');
                                return;
                            }
                            setShowCartDrawer(true);
                        }}
                    >
                        <ShoppingBag size={20} />
                        <span>View Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
                        <span style={ps.cartBadgeCount}>Rs. {cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            </div>

            {/* Account Blocked Alert Banner */}
            {isBlocked && (
                <div style={{
                    background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
                    borderRadius: '20px',
                    padding: '22px 28px',
                    color: '#FFFFFF',
                    marginBottom: '24px',
                    border: '2px solid #EF4444',
                    boxShadow: '0 12px 30px rgba(239,68,68,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ShieldAlert size={30} color="#FCA5A5" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🚫 PHARMACY & PRESCRIPTION ACCESS SUSPENDED
                        </div>
                        <p style={{ fontSize: '13px', color: '#FECACA', margin: '4px 0 0', lineHeight: 1.5 }}>
                            Your patient account has been blocked by administration from placing pharmacy orders or uploading prescriptions due to a safety violation. <strong>You can still access Doctor Channeling, Lab Reports, and EMR Records.</strong>
                        </p>
                    </div>
                </div>
            )}

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
            <div style={{
                ...ps.grid,
                ...(isBlocked ? {
                    filter: 'blur(3.5px)',
                    opacity: 0.45,
                    pointerEvents: 'none',
                    userSelect: 'none'
                } : {})
            }}>
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
                                    border: med.stockQuantity <= 0 ? '1.5px solid #CBD5E1' : isRx ? '1.5px solid #FCA5A5' : ps.card.border,
                                    cursor: 'pointer',
                                    opacity: med.stockQuantity <= 0 ? 0.75 : 1
                                }}
                                onClick={() => {
                                    if (med.stockQuantity <= 0) {
                                        handleOutOfStockClick(med);
                                        return;
                                    }
                                    setSelectedDetailMed(med);
                                    setActiveDetailImageIndex(0);
                                    setDetailQty(1);
                                }}
                            >
                                <div style={ps.imgWrapper}>
                                    <img
                                        src={getGalleryImages(med)[0] || 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop'}
                                        alt={med.name}
                                        style={ps.cardImg}
                                        onError={(e) => {
                                            const gallery = getGalleryImages(med);
                                            const fallback = gallery[1] || 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop';
                                            if (e.target.src !== fallback) {
                                                e.target.src = fallback;
                                            }
                                        }}
                                    />
                                    {isRx && (
                                        <span style={ps.rxRequiredBadge} onClick={(e) => { e.stopPropagation(); setRxModalMedicine(med); }}>
                                            <FileCheck size={12} /> Rx Required
                                        </span>
                                    )}

                                    {/* Stock status floating badge */}
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        left: '8px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        backdropFilter: 'blur(4px)',
                                        backgroundColor: med.stockQuantity <= 0 ? 'rgba(220, 38, 38, 0.85)' : isRefrigerated ? 'rgba(30, 64, 175, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {med.stockQuantity <= 0 ? '🚫 Out of Stock' : isRefrigerated ? '❄️ 2°C - 8°C' : '🌡️ Room Temp'}
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

                                    {(() => {
                                        const config = getDisplayConfig(med);
                                        return (
                                            <div style={ps.cardFooter}>
                                                <div>
                                                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>
                                                        {config.priceLine}
                                                    </div>
                                                    {config.packLine && (
                                                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                                                            {config.packLine}
                                                        </div>
                                                    )}
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
                                                        config.buttons.map(btn => (
                                                            <button
                                                                key={btn.unitType}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToCart(med, btn.unitType, btn.price);
                                                                }}
                                                                disabled={med.stockQuantity <= 0}
                                                                style={{
                                                                    ...ps.addBtn,
                                                                    padding: '6px 10px',
                                                                    fontSize: '11.5px',
                                                                    backgroundColor: med.stockQuantity > 0 ? (btn.isPack ? '#047857' : '#059669') : '#CBD5E1',
                                                                    cursor: med.stockQuantity > 0 ? 'pointer' : 'not-allowed'
                                                                }}
                                                                title={`Add 1 ${btn.unitType} to Cart`}
                                                            >
                                                                {btn.label}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
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
                                            const itemConfig = getDisplayConfig(item);
                                            const selectedBtn = itemConfig.buttons.find(b => b.unitType === item.unitType) || itemConfig.buttons[0];
                                            const itemPrice = selectedBtn ? selectedBtn.price : (item.price || 0);
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
                                                            /* Dynamic Unit Selector for OTC items */
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Order Unit:</span>
                                                                <select
                                                                    value={item.unitType || itemConfig.buttons[0]?.unitType || 'Pill'}
                                                                    onChange={(e) => updateUnitType(idx, e.target.value)}
                                                                    style={ps.cartDaysSelect}
                                                                >
                                                                    {itemConfig.buttons.map(btn => (
                                                                        <option key={btn.unitType} value={btn.unitType}>
                                                                            {btn.label.replace('+ ', '')} (Rs. {btn.price.toFixed(2)})
                                                                        </option>
                                                                    ))}
                                                                    {!itemConfig.buttons.some(b => b.unitType === item.unitType) && (
                                                                        <option value={item.unitType}>
                                                                            1 {item.unitType} (Rs. {itemPrice.toFixed(2)})
                                                                        </option>
                                                                    )}
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
                                            {"Home Delivery (+ Delivery Charges < 500)"}
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
                                            Counter Pickup (FREE)
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
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        onBlur={() => setFieldTouched(prev => ({ ...prev, name: true }))}
                                        style={{
                                            ...ps.input,
                                            borderColor: (fieldTouched.name || customerName) && validateField('name', customerName) ? '#DC2626' : ps.input.borderColor
                                        }}
                                    />
                                    {(fieldTouched.name || customerName) && validateField('name', customerName) && (
                                        <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                                            {validateField('name', customerName)}
                                        </span>
                                    )}
                                </div>
                                <div style={ps.formGroup}>
                                    <label style={ps.label}>Email Address (Order Confirmation Sent Here) *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. nirwandulaksha@gmail.com"
                                        value={customerEmail}
                                        onChange={e => setCustomerEmail(e.target.value)}
                                        onBlur={() => setFieldTouched(prev => ({ ...prev, email: true }))}
                                        style={{
                                            ...ps.input,
                                            borderColor: (fieldTouched.email || customerEmail) && validateField('email', customerEmail) ? '#DC2626' : ps.input.borderColor
                                        }}
                                    />
                                    {(fieldTouched.email || customerEmail) && validateField('email', customerEmail) && (
                                        <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                                            {validateField('email', customerEmail)}
                                        </span>
                                    )}
                                </div>
                                <div style={ps.formGroup}>
                                    <label style={ps.label}>Phone Number *</label>
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        onBlur={() => setFieldTouched(prev => ({ ...prev, phone: true }))}
                                        style={{
                                            ...ps.input,
                                            borderColor: (fieldTouched.phone || customerPhone) && validateField('phone', customerPhone) ? '#DC2626' : ps.input.borderColor
                                        }}
                                    />
                                    {(fieldTouched.phone || customerPhone) && validateField('phone', customerPhone) && (
                                        <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                                            {validateField('phone', customerPhone)}
                                        </span>
                                    )}
                                </div>
                                <div style={ps.formGroup}>
                                    <label style={ps.label}>Delivery Address *</label>
                                    <textarea
                                        rows="2"
                                        value={deliveryAddress}
                                        onChange={e => setDeliveryAddress(e.target.value)}
                                        onBlur={() => setFieldTouched(prev => ({ ...prev, address: true }))}
                                        style={{
                                            ...ps.textarea,
                                            borderColor: (fieldTouched.address || deliveryAddress) && validateField('address', deliveryAddress) ? '#DC2626' : ps.textarea.borderColor
                                        }}
                                    />
                                    {(fieldTouched.address || deliveryAddress) && validateField('address', deliveryAddress) && (
                                        <span style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                                            {validateField('address', deliveryAddress)}
                                        </span>
                                    )}
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

            {/* Validation Error Red Pop-up Window */}
            {validationModalErrors && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: '#FEF2F2', padding: '28px', borderRadius: '20px', maxWidth: '440px', width: '100%', border: '1.5px solid #FECACA', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldAlert size={22} color="#DC2626" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', color: '#991B1B', fontWeight: 800 }}>Missing / Invalid Field</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#7F1D1D', fontWeight: 600 }}>Please correct the following mistakes before placing your order:</p>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #FCA5A5', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {validationModalErrors.map((err, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#B91C1C', fontSize: '12.5px', fontWeight: 600 }}>
                                    <span style={{ color: '#DC2626', fontWeight: 800 }}>•</span>
                                    <span>{err}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setValidationModalErrors(null)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#DC2626',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(220,38,38,0.25)'
                            }}
                        >
                            Fix Mistakes
                        </button>
                    </div>
                </div>
            )}

            {/* Prescription Order & Pickup QR Pass Submission Confirmation Modal */}
            {orderSuccessData && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '24px', maxWidth: '490px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ECFDF5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle2 size={36} color="#059669" />
                        </div>

                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Order #{orderSuccessData.orderNumber || 'Submitted'}
                        </span>

                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '12px 0 6px' }}>
                            {(orderSuccessData.deliveryMethod === 'Pickup' || orderSuccessData.paymentMethod === 'PayAtCounter')
                                ? 'Counter Pickup QR Ticket Pass Generated!'
                                : 'Prescription Order Submitted!'}
                        </h3>

                        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, margin: '0 0 16px' }}>
                            {(orderSuccessData.deliveryMethod === 'Pickup' || orderSuccessData.paymentMethod === 'PayAtCounter')
                                ? 'Your pharmacy order has been placed for Counter Pickup. Present the QR code below at the hospital counter.'
                                : 'Your doctor prescription photo & details have been sent to our registered pharmacists for verification.'}
                        </p>

                        {/* Generated QR Code Digital Pass for Pickup & Counter Orders */}
                        {(orderSuccessData.deliveryMethod === 'Pickup' || orderSuccessData.paymentMethod === 'PayAtCounter') && (
                            <div style={{
                                backgroundColor: '#F8FAFC',
                                border: '2px dashed #059669',
                                borderRadius: '18px',
                                padding: '20px 16px',
                                margin: '0 0 20px 0',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: '#ECFDF5',
                                    color: '#047857',
                                    border: '1px solid #A7F3D0',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    marginBottom: '12px',
                                    textTransform: 'uppercase'
                                }}>
                                    <QrCode size={14} /> Hospital Pharmacy Counter QR Pass
                                </div>

                                <div style={{
                                    backgroundColor: '#FFFFFF',
                                    padding: '12px',
                                    borderRadius: '16px',
                                    display: 'inline-block',
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                                    marginBottom: '10px',
                                    border: '1px solid #CBD5E1'
                                }}>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`PHARMACY_ORDER|${orderSuccessData.orderNumber || orderSuccessData.id}|${orderSuccessData.customerName || 'Patient'}|${orderSuccessData.totalAmount || 0}`)}`}
                                        alt="Pharmacy Counter Pickup QR Code Ticket"
                                        style={{ width: '160px', height: '160px', display: 'block' }}
                                    />
                                </div>

                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                                    Ticket #{orderSuccessData.orderNumber || 'ORD-PICKUP'}
                                </div>
                                <p style={{ fontSize: '11.5px', color: '#64748B', margin: '0 0 10px', lineHeight: 1.45 }}>
                                    Show this QR Digital Ticket at the Hospital Pharmacy Counter for instant order collection &amp; counter payment.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`PHARMACY_ORDER|${orderSuccessData.orderNumber || orderSuccessData.id}|${orderSuccessData.customerName || 'Patient'}|${orderSuccessData.totalAmount || 0}`)}`;
                                        const a = document.createElement('a');
                                        a.href = qrUrl;
                                        a.download = `Pharmacy_QR_Ticket_${orderSuccessData.orderNumber || 'Pass'}.png`;
                                        a.target = '_blank';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 16px',
                                        backgroundColor: '#059669',
                                        color: '#FFFFFF',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(5,150,105,0.2)'
                                    }}
                                >
                                    📥 Save / Download QR Code
                                </button>
                            </div>
                        )}

                        <div style={{ textAlign: 'left', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>📋 Next Steps for your Order:</div>
                            {(orderSuccessData.deliveryMethod === 'Pickup' || orderSuccessData.paymentMethod === 'PayAtCounter') ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <span style={{ color: '#059669', fontWeight: 800 }}>1.</span>
                                        <span>Visit the HealthBridge Main Hospital Pharmacy Counter.</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <span style={{ color: '#059669', fontWeight: 800 }}>2.</span>
                                        <span>Show this QR Digital Ticket or Order #{orderSuccessData.orderNumber} to the pharmacist.</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <span style={{ color: '#059669', fontWeight: 800 }}>3.</span>
                                        <span>Pay cash or card at counter &amp; collect your medicine package instantly!</span>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
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

                                {/* Price & Spec Card — Dynamic Selling Unit */}
                                {(() => {
                                    const detailConfig = getDisplayConfig(selectedDetailMed);
                                    const sUnit = (selectedDetailMed.sellingUnit || selectedDetailMed.SellingUnit || 'PILLS').toUpperCase();

                                    let unitLabel = `UNIT PRICE (PER ${sUnit === 'PILLS' ? 'PILL' : sUnit}):`;
                                    let packPriceLabel = 'ONE CARD PRICE:';
                                    let packQtyLabel = 'PILLS IN ONE CARD:';
                                    let packQtyText = `${selectedDetailMed.pillsPerCard || 10} pills in one card`;

                                    if (sUnit === 'SACHET') {
                                        packPriceLabel = 'ONE BOX PRICE:';
                                        packQtyLabel = 'SACHETS IN ONE BOX:';
                                        packQtyText = `${selectedDetailMed.sachetsPerBox || 10} sachets in one box`;
                                    } else if (sUnit === 'VIAL') {
                                        packPriceLabel = 'ONE BOX PRICE:';
                                        packQtyLabel = 'VIALS IN ONE BOX:';
                                        packQtyText = `${selectedDetailMed.vialsPerBox || 5} vials in one box`;
                                    } else if (sUnit === 'BOTTLE') {
                                        packPriceLabel = 'BOTTLE SIZE:';
                                        packQtyLabel = 'VOLUME:';
                                        packQtyText = `${selectedDetailMed.bottleSize || 100} ml bottle`;
                                    } else if (sUnit === 'TUBE') {
                                        packPriceLabel = 'TUBE WEIGHT:';
                                        packQtyLabel = 'NET WEIGHT:';
                                        packQtyText = `${selectedDetailMed.tubeWeight || 20} g tube`;
                                    } else if (sUnit === 'INHALER') {
                                        packPriceLabel = 'INHALER SPEC:';
                                        packQtyLabel = 'PUFFS PER INHALER:';
                                        packQtyText = `${selectedDetailMed.puffsPerInhaler || 200} puffs`;
                                    }

                                    const uPrice = detailConfig.unitPrice || selectedDetailMed.price || 0;
                                    const pPrice = detailConfig.packPrice || selectedDetailMed.cardPrice || (uPrice * (selectedDetailMed.pillsPerCard || 10));

                                    return (
                                        <div style={ps.darazPriceBox}>
                                            <div style={ps.darazPriceItem}>
                                                <span style={ps.darazPriceLabel}>{unitLabel}</span>
                                                <span style={ps.darazPriceValue}>Rs. {uPrice.toFixed(2)}</span>
                                            </div>
                                            {sUnit === 'BOTTLE' || sUnit === 'TUBE' || sUnit === 'INHALER' ? (
                                                <div style={ps.darazPriceItem}>
                                                    <span style={ps.darazPriceLabel}>{packQtyLabel}</span>
                                                    <span style={ps.darazPillsPill}>{packQtyText}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={ps.darazPriceItem}>
                                                        <span style={ps.darazPriceLabel}>{packPriceLabel}</span>
                                                        <span style={ps.darazCardPriceValue}>Rs. {pPrice.toFixed(2)}</span>
                                                    </div>
                                                    <div style={ps.darazPriceItem}>
                                                        <span style={ps.darazPriceLabel}>{packQtyLabel}</span>
                                                        <span style={ps.darazPillsPill}>{packQtyText}</span>
                                                    </div>
                                                </>
                                            )}
                                            <div style={{ fontSize: '12px', color: selectedDetailMed.stockQuantity > 0 ? '#059669' : '#DC2626', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {selectedDetailMed.stockQuantity > 0
                                                    ? <><CheckCircle2 size={14} /> In Stock • Express Dispatch Ready</>
                                                    : <><AlertCircle size={14} /> Out of Stock — Currently Unavailable</>
                                                }
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Storage Requirement — Visual Chips */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={ps.darazSectionHeading}>STORAGE REQUIREMENT</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                        {parseStorageChips(selectedDetailMed.storageCondition).map((chip, i) => (
                                            <div key={i} style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '7px 13px', borderRadius: '20px',
                                                fontSize: '12px', fontWeight: 700,
                                                backgroundColor: chip.bg, color: chip.color,
                                                border: `1px solid ${chip.border}`,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <span style={{ fontSize: '15px' }}>{chip.emoji}</span>
                                                {chip.label}
                                            </div>
                                        ))}
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
                                    ) : (() => {
                                        const detailConfig = getDisplayConfig(selectedDetailMed);
                                        return (
                                            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                                {detailConfig.buttons.map(btn => (
                                                    <button
                                                        key={btn.unitType}
                                                        type="button"
                                                        onClick={() => {
                                                            for (let i = 0; i < detailQty; i++) {
                                                                addToCart(selectedDetailMed, btn.unitType, btn.price);
                                                            }
                                                            showToastMessage(`Added ${detailQty} ${btn.unitType.toLowerCase()}(s) of ${selectedDetailMed.name} to cart!`, 'success');
                                                            setSelectedDetailMed(null);
                                                        }}
                                                        style={btn.isPack ? ps.darazAddCardsBtn : ps.darazAddPillsBtn}
                                                    >
                                                        <Plus size={15} /> {btn.label} ({detailQty})
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Prescription Violation Warning Popup Modal */}
            {selectedViolationNotif && (
                <PrescriptionViolationModal
                    notification={selectedViolationNotif}
                    onClose={() => setSelectedViolationNotif(null)}
                    onNavigate={onNavigate}
                />
            )}

            {/* Out of Stock Dialog */}
            {outOfStockMed && (
                <div style={ps.modalOverlay} onClick={() => setOutOfStockMed(null)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className="animate-scale-up"
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '20px',
                            padding: '32px 28px',
                            maxWidth: '420px',
                            width: '90%',
                            textAlign: 'center',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.18)'
                        }}
                    >
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertCircle size={32} color="#DC2626" />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>CURRENTLY OUT OF STOCK</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>{outOfStockMed.name}</h3>
                        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.55, margin: '0 0 20px' }}>
                            We're sorry! This medicine is currently out of stock.
                            Our pharmacist has been notified and will replenish it soon.
                            You can check back shortly or contact us for urgent needs.
                        </p>
                        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Bell size={13} /> Pharmacist Notified
                            </div>
                            <p style={{ fontSize: '11.5px', color: '#78350F', margin: '4px 0 0', lineHeight: 1.45 }}>
                                A stock replenishment alert has been automatically sent to our pharmacy team.
                            </p>
                        </div>
                        <button
                            onClick={() => setOutOfStockMed(null)}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                        >
                            Back to Store
                        </button>
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
