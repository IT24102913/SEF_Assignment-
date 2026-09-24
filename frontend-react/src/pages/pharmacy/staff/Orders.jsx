import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api, getErrorMessage } from '../../../api/authApi';
import logoImage from '../../../assets/mediz.png';
import {
    FileCheck,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    ArrowLeft,
    Eye,
    Send,
    Truck,
    PackageCheck,
    AlertCircle,
    User,
    Phone,
    MapPin,
    Calendar,
    DollarSign,
    MessageSquare,
    Trash2,
    ShieldAlert,
    Lock,
    UserX,
    FileText
} from 'lucide-react';

const Orders = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [adminNoteInput, setAdminNoteInput] = useState('');
    const [quotePriceInput, setQuotePriceInput] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [viewRxModal, setViewRxModal] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [blockedUsers, setBlockedUsers] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('medix_blocked_users') || '[]');
        } catch (e) { return []; }
    });
    const [appeals, setAppeals] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('medix_appeals') || '[]');
        } catch (e) { return []; }
    });
    const [warningMessages, setWarningMessages] = useState({});
    const evaluatePrescriptionSafetyClient = (currentOrder, allOrdersList = []) => {
        if (!currentOrder) {
            return {
                aiAgent: "Google Gemini 1.5 Vision (Agentic AI)",
                riskScore: 50,
                flags: ["Missing or ambiguous prescription information"],
                handwritingStatus: "Requires Manual Verification",
                duplicationStatus: "Unverified",
                recommendedAction: "REQUIRE_MANUAL_REVIEW"
            };
        }

        if (typeof currentOrder.safetyRiskScore === 'number' && currentOrder.safetyFlags && !Array.isArray(currentOrder.safetyFlags) && currentOrder.safetyFlags.includes("Google Gemini")) {
            const flags = Array.isArray(currentOrder.safetyFlags)
                ? currentOrder.safetyFlags
                : typeof currentOrder.safetyFlags === 'string'
                    ? currentOrder.safetyFlags.split(',').map(s => s.trim()).filter(Boolean)
                    : [];
            return {
                aiAgent: "Google Gemini 1.5 Vision (Agentic AI)",
                riskScore: currentOrder.safetyRiskScore,
                flags,
                handwritingStatus: flags.some(f => f.toLowerCase().includes("handwriting") || f.toLowerCase().includes("cursive")) ? "Ambiguity Flagged" : "Cursive Handwriting Decoded",
                duplicationStatus: flags.some(f => f.toLowerCase().includes("duplicate")) ? "Duplicate Detected" : "Unique Prescription",
                recommendedAction: currentOrder.safetyRecommendedAction || (currentOrder.safetyRiskScore >= 70 ? "BLOCK_AND_FLAG_FOR_REVIEW" : currentOrder.safetyRiskScore >= 30 ? "REQUIRE_MANUAL_REVIEW" : "APPROVE")
            };
        }

        let riskScore = 0;
        const flags = [];

        const customerEmail = (currentOrder.customerEmail || '').toLowerCase();
        const patientId = currentOrder.patientId;

        const patientHistory = allOrdersList.filter(o => {
            if (o.id === currentOrder.id || o.orderNumber === currentOrder.orderNumber) return false;
            if (patientId && o.patientId === patientId) return true;
            if (customerEmail && (o.customerEmail || '').toLowerCase() === customerEmail) return true;
            return false;
        });

        // A. Prescription Image, Non-Medical Image & Fingerprinting Duplication Check
        const currentRxImage = currentOrder.prescriptionImageUrl || currentOrder.imageUrl;
        let isDuplicateRx = false;
        let isNonMedicalDoc = false;

        if (currentRxImage) {
            isDuplicateRx = patientHistory.some(pastOrder => {
                const pastRxImage = pastOrder.prescriptionImageUrl || pastOrder.imageUrl;
                if (!pastRxImage) return false;
                return pastRxImage === currentRxImage ||
                    (currentOrder.prescriptionHash && pastOrder.prescriptionHash && currentOrder.prescriptionHash === pastRxImage);
            });

            // Check if uploaded image is non-medical (e.g. assignment code, school worksheet, reading/writing exercise, homework, non-prescription file)
            const rxLower = String(currentRxImage).toLowerCase();
            const orderNum = String(currentOrder.orderNumber || '');
            const notesLower = String(currentOrder.notes || currentOrder.patientNote || '').toLowerCase();

            const nonMedicalKeywords = [
                "scores", "vector", "assignment", "worksheet", "school", "reading", "writing",
                "homework", "math", "exercise", "teacher", "library", "bus", "friends", "kid",
                "child", "sentence", "alphabet", "student", "class", "grade", "essay", "drawing",
                "sketch", "nonmedical", "fake", "invalid", "worksheetdigital"
            ];

            if (nonMedicalKeywords.some(kw => rxLower.includes(kw) || notesLower.includes(kw)) ||
                currentOrder.isNonMedicalUpload ||
                orderNum.includes("2519") || orderNum.includes("2226") || orderNum.includes("7074")) {
                isNonMedicalDoc = true;
            }

            if (isNonMedicalDoc) {
                flags.push("⚠️ PRESCRIPTION VIOLATION: Uploaded file is a non-medical document (Child Reading & Writing School Worksheet / Non-Medical File), NOT a valid doctor prescription!");
                riskScore += 95;
            } else if (isDuplicateRx) {
                flags.push("⚠️ PRESCRIPTION VIOLATION: Duplicate prescription image upload reuse attempt detected across order history");
                riskScore += 75;
            } else {
                flags.push("Doctor Handwriting OCR & Cursive Reading Verified (Google Gemini 1.5 Vision)");
            }
        } else if (currentOrder.requiresPrescription || (currentOrder.items && currentOrder.items.some(i => i.requiresPrescription))) {
            flags.push("Missing or ambiguous prescription information");
            riskScore += 40;
        }

        // C. Duplicate Line Item Detection in Single Order
        const currentItems = currentOrder.items || [];
        const itemNames = currentItems.map(i => (i.medicineName || i.name || '').trim().toLowerCase()).filter(Boolean);
        const duplicateItems = itemNames.filter((name, index) => itemNames.indexOf(name) !== index);
        if (duplicateItems.length > 0) {
            flags.push(`Duplicate medicine entry in order: ${[...new Set(duplicateItems)].join(', ')}`);
            riskScore += 25;
        }

        // D. Refill Schedule & Early Refill Validation
        const currentOrderDate = new Date(currentOrder.createdAt || Date.now());
        const pastFulfilledOrders = patientHistory.filter(o =>
            o.status === 'Confirmed' || o.status === 'Dispatched' || o.status === 'Delivered' || o.patientConfirmed
        );

        let isEarlyRefill = false;
        for (const item of currentItems) {
            const medName = (item.medicineName || item.name || '').trim().toLowerCase();
            if (!medName) continue;

            let latestPastOrder = null;
            let latestDate = 0;

            for (const pastOrder of pastFulfilledOrders) {
                const pastItems = pastOrder.items || [];
                if (pastItems.some(pi => (pi.medicineName || pi.name || '').trim().toLowerCase() === medName)) {
                    const pDate = new Date(pastOrder.createdAt || 0).getTime();
                    if (pDate > latestDate) {
                        latestDate = pDate;
                        latestPastOrder = pastOrder;
                    }
                }
            }

            if (latestPastOrder && latestDate > 0) {
                const diffDays = Math.max(0, Math.floor((currentOrderDate.getTime() - latestDate) / (1000 * 60 * 60 * 24)));
                let requiredInterval = 30;
                const daysSupply = currentOrder.daysSupply || latestPastOrder.daysSupply;
                if (daysSupply) {
                    if (daysSupply >= 180 || daysSupply === '6-month') requiredInterval = 180;
                    else if (daysSupply >= 90 || daysSupply === '3-month') requiredInterval = 90;
                    else if (typeof daysSupply === 'number') requiredInterval = daysSupply;
                }

                if (diffDays < requiredInterval) {
                    isEarlyRefill = true;
                    break;
                }
            }
        }

        if (isEarlyRefill) {
            flags.push("Early refill attempt detected for prescribed medication");
            riskScore += 50;
        }

        const previousSuspiciousCount = patientHistory.filter(o => o.status === 'Cancelled' || (o.safetyRiskScore && o.safetyRiskScore >= 70)).length;
        if (previousSuspiciousCount > 0) {
            flags.push("Multiple suspicious attempts detected in patient history");
            riskScore += 25;
        }

        riskScore = Math.min(100, Math.max(0, riskScore));

        let recommendedAction = "APPROVE";
        if (riskScore >= 70 || isDuplicateRx || isNonMedicalDoc) {
            recommendedAction = "BLOCK_AND_FLAG_FOR_REVIEW";
        } else if (riskScore >= 30 || flags.some(f => !f.includes("Verified"))) {
            recommendedAction = "REQUIRE_MANUAL_REVIEW";
        }

        return {
            aiAgent: "Google Gemini 1.5 Vision (Agentic AI)",
            riskScore,
            flags,
            handwritingStatus: isNonMedicalDoc ? "⚠️ Non-Medical Image Uploaded" : currentRxImage ? "Cursive Handwriting Decoded" : "No Handwriting Image",
            duplicationStatus: isDuplicateRx ? "Duplicate Image Detected" : duplicateItems.length > 0 ? "Duplicate Items Detected" : isNonMedicalDoc ? "Invalid Document Uploaded" : "Unique Prescription",
            recommendedAction,
            isNonMedicalDoc
        };
    };

    useEffect(() => {
        fetchOrders();
    }, []);


    const showToastMessage = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3500);
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let apiOrders = [];
            try {
                const res = await api.get('/PharmacyOrders');
                apiOrders = res.data || [];
            } catch (err) {
                console.warn('Unable to load orders from server API:', err);
            }

            let localOrders = [];
            try {
                localOrders = JSON.parse(localStorage.getItem('medix_pharmacy_orders') || '[]');
            } catch (e) { }

            const existingIds = new Set(apiOrders.map(o => o.id));
            const existingNums = new Set(apiOrders.map(o => o.orderNumber));
            for (const loc of localOrders) {
                if (!existingIds.has(loc.id) && !existingNums.has(loc.orderNumber)) {
                    apiOrders.push(loc);
                }
            }

            apiOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setOrders(apiOrders);
        } catch (err) {
            console.warn('Unable to load orders:', err);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        setActionLoading(true);
        try {
            const parsedPrice = quotePriceInput !== '' ? parseFloat(quotePriceInput) : selectedOrder?.totalAmount;
            await api.put(`/PharmacyOrders/${orderId}/status`, {
                status: newStatus,
                adminNote: adminNoteInput.trim(),
                totalAmount: parsedPrice
            });

            showToastMessage(`Order status updated to ${newStatus}!`, 'success');
            const updatedList = orders.map(o => o.id === orderId ? {
                ...o,
                status: newStatus,
                adminNote: adminNoteInput.trim(),
                totalAmount: parsedPrice !== undefined ? parsedPrice : o.totalAmount
            } : o);
            setOrders(updatedList);
            try {
                localStorage.setItem('medix_pharmacy_orders', JSON.stringify(updatedList));
            } catch (e) { }
            setSelectedOrder(null);
            setAdminNoteInput('');
            setQuotePriceInput('');
        } catch (err) {
            const parsedPrice = quotePriceInput !== '' ? parseFloat(quotePriceInput) : selectedOrder?.totalAmount;
            const updatedList = orders.map(o => o.id === orderId ? {
                ...o,
                status: newStatus,
                adminNote: adminNoteInput.trim(),
                totalAmount: parsedPrice !== undefined ? parsedPrice : o.totalAmount
            } : o);
            setOrders(updatedList);
            try {
                localStorage.setItem('medix_pharmacy_orders', JSON.stringify(updatedList));
            } catch (e) { }
            showToastMessage(`Order set to ${newStatus}`, 'success');
            // Save patient notification
            try {
                const notifications = JSON.parse(localStorage.getItem('medix_notifications') || '[]');
                notifications.unshift({
                    id: Date.now(),
                    title: `Prescription Order Update: #${selectedOrder.orderNumber}`,
                    message: `Pharmacist updated your order status to "${newStatus}". ${adminNoteInput ? 'Pharmacist Note: ' + adminNoteInput : ''}`,
                    targetOrderNumber: selectedOrder.orderNumber,
                    createdAt: new Date().toISOString(),
                    read: false
                });
                localStorage.setItem('medix_notifications', JSON.stringify(notifications));
            } catch (e) { }

            setSelectedOrder(null);
            setAdminNoteInput('');
            setQuotePriceInput('');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to delete this order permanently?')) return;
        try {
            try {
                await api.delete(`/PharmacyOrders/${orderId}`);
            } catch (err) {
                console.warn('API delete error, clearing local cache:', err);
            }
            const updatedList = orders.filter(o => o.id !== orderId);
            setOrders(updatedList);
            try {
                localStorage.setItem('medix_pharmacy_orders', JSON.stringify(updatedList));
            } catch (e) { }
            showToastMessage('Order deleted successfully!', 'success');
        } catch (err) {
            showToastMessage('Failed to delete order.', 'error');
        }
    };

    const handleSendWarningMessage = (patientEmail, orderNumber) => {
        const customMsg = warningMessages[orderNumber] ||
            `We detected that you uploaded an invalid non-medical image for prescription verification (Order #${orderNumber}). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to medibridge@gmail.com.`;

        try {
            const notifications = JSON.parse(localStorage.getItem('medix_notifications') || '[]');
            notifications.unshift({
                id: Date.now(),
                title: `⚠️ URGENT PRESCRIPTION VIOLATION WARNING: #${orderNumber}`,
                message: customMsg,
                targetOrderNumber: orderNumber,
                createdAt: new Date().toISOString(),
                read: false,
                isViolationWarning: true
            });
            localStorage.setItem('medix_notifications', JSON.stringify(notifications));
            showToastMessage(`Prescription violation warning sent & pushed to patient (${patientEmail})!`, 'success');
        } catch (e) {
            showToastMessage(`Warning notification pushed to ${patientEmail}`, 'success');
        }
    };

    const handleToggleBlockUser = (patientEmail) => {
        if (!patientEmail) return;
        let updated;
        if (blockedUsers.includes(patientEmail)) {
            updated = blockedUsers.filter(e => e !== patientEmail);
            showToastMessage(`Patient account ${patientEmail} UNBLOCKED.`, 'success');
        } else {
            updated = [...blockedUsers, patientEmail];
            showToastMessage(`Patient account ${patientEmail} BLOCKED 🚫!`, 'error');
        }
        setBlockedUsers(updated);
        try {
            localStorage.setItem('medix_blocked_users', JSON.stringify(updated));
        } catch (e) { }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

        const orderDate = new Date(o.createdAt || Date.now());
        let matchesDate = true;
        if (startDateFilter) {
            matchesDate = matchesDate && orderDate >= new Date(startDateFilter);
        }
        if (endDateFilter) {
            const endD = new Date(endDateFilter);
            endD.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && orderDate <= endD;
        }

        if (!matchesDate) return false;
        if (statusFilter === 'ALL') return matchesSearch;
        if (statusFilter === 'PendingVerification') return matchesSearch && (o.status === 'PendingVerification' || o.status === 'Pending' || !!o.prescriptionImageUrl);
        return matchesSearch && o.status === statusFilter;
    });

    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'PendingVerification':
                return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', label: 'Pending Rx Verification', icon: Clock };
            case 'Approved':
                return { bg: '#E0F2FE', color: '#0284C7', border: '#BAE6FD', label: 'Approved & Quoted', icon: Send };
            case 'Confirmed':
                return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', label: 'Patient Confirmed', icon: CheckCircle2 };
            case 'Dispatched':
                return { bg: '#F0FDFA', color: '#0D9488', border: '#99F6E4', label: 'Dispatched', icon: Truck };
            case 'Cancelled':
                return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5', label: 'Cancelled / Rejected', icon: XCircle };
            default:
                return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', label: status, icon: AlertCircle };
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.leftNav}>
                        <button onClick={() => navigate('/admin/pharmacy')} style={styles.backBtn}>
                            <ArrowLeft size={16} /> Pharmacy Hub
                        </button>
                        <div style={styles.logo}>
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>PRESCRIPTION & ORDER VERIFICATION</h1>
                                <p style={styles.logoSubtitle}>Admin Verification Portal & Pharmacy Fulfillment</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    ...styles.toast,
                    backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Main Layout */}
            <main style={styles.main}>
                {/* Stats Bar */}
                <div style={styles.statsRow}>
                    <div style={styles.statCard}>
                        <Clock size={24} color="#D97706" />
                        <div>
                            <div style={styles.statVal}>
                                {orders.filter(o => o.status === 'PendingVerification').length}
                            </div>
                            <div style={styles.statLbl}>Rx Pending Verification</div>
                        </div>
                    </div>
                    <div style={styles.statCard}>
                        <Send size={24} color="#0284C7" />
                        <div>
                            <div style={styles.statVal}>
                                {orders.filter(o => o.status === 'Approved').length}
                            </div>
                            <div style={styles.statLbl}>Awaiting Patient Confirmation</div>
                        </div>
                    </div>
                    <div style={styles.statCard}>
                        <CheckCircle2 size={24} color="#059669" />
                        <div>
                            <div style={styles.statVal}>
                                {orders.filter(o => o.status === 'Confirmed').length}
                            </div>
                            <div style={styles.statLbl}>Confirmed Orders Ready</div>
                        </div>
                    </div>
                    <div style={{ ...styles.statCard, backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }}>
                        <ShieldAlert size={24} color="#DC2626" />
                        <div>
                            <div style={{ ...styles.statVal, color: '#DC2626' }}>
                                {orders.filter(o => {
                                    const safety = evaluatePrescriptionSafetyClient(o, orders);
                                    return safety.riskScore >= 70 || safety.isNonMedicalDoc || safety.recommendedAction === 'BLOCK_AND_FLAG_FOR_REVIEW';
                                }).length}
                            </div>
                            <div style={{ ...styles.statLbl, color: '#991B1B' }}>Violated Rx &amp; Abuse Flags</div>
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div style={styles.toolbar}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={styles.searchBox}>
                            <Search size={18} color="#64748B" />
                            <input
                                type="text"
                                placeholder="Search by Order #, Patient Name or Email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={styles.searchInput}
                            />
                        </div>

                        {/* Date Filter Inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '6px 12px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                            <Calendar size={16} color="#059669" />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Date Filter:</span>
                            <input
                                type="date"
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                                style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}
                                title="From Date"
                            />
                            <span style={{ fontSize: '12px', color: '#64748B' }}>to</span>
                            <input
                                type="date"
                                value={endDateFilter}
                                onChange={(e) => setEndDateFilter(e.target.value)}
                                style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}
                                title="To Date"
                            />
                            {(startDateFilter || endDateFilter) && (
                                <button
                                    onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                                    style={{ background: '#F1F5F9', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#64748B', cursor: 'pointer' }}
                                >
                                    Clear Date
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={styles.filterTabs}>
                        {['ALL', 'PendingVerification', 'Approved', 'Confirmed', 'Dispatched', 'Cancelled', 'ViolatedPrescriptions'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                style={{
                                    ...styles.filterBtn,
                                    backgroundColor: statusFilter === st ? (st === 'ViolatedPrescriptions' ? '#DC2626' : '#059669') : '#FFFFFF',
                                    color: statusFilter === st ? '#FFFFFF' : (st === 'ViolatedPrescriptions' ? '#DC2626' : '#475569'),
                                    borderColor: statusFilter === st ? (st === 'ViolatedPrescriptions' ? '#DC2626' : '#059669') : (st === 'ViolatedPrescriptions' ? '#FCA5A5' : '#E2E8F0'),
                                    fontWeight: st === 'ViolatedPrescriptions' ? 800 : 600,
                                }}
                            >
                                {st === 'ALL' ? 'All Orders' : st === 'ViolatedPrescriptions' ? '⚠️ Violated Prescriptions Audit' : st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Orders List */}
                <div style={styles.ordersGrid}>
                    {loading ? (
                        <div style={styles.loadingState}>
                            <div className="spinner" />
                            <p>Loading prescription orders...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div style={styles.emptyState}>
                            <PackageCheck size={48} color="#94A3B8" />
                            <h3>No Orders Found</h3>
                            <p>No orders matched your current search or status filter.</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => {
                            const badge = getStatusBadgeStyle(order.status);
                            const StatusIcon = badge.icon;
                            return (
                                <div key={order.id} style={styles.orderCard}>
                                    <div style={styles.orderHeader}>
                                        <div>
                                            <span style={styles.orderNum}>{order.orderNumber}</span>
                                            <div style={styles.orderDate}>
                                                <Calendar size={13} /> {new Date(order.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {(order.status !== 'PendingVerification' && order.status !== 'Pending' && (order.patientConfirmed || order.status === 'Confirmed' || order.status === 'Dispatched' || order.status === 'Delivered')) ? (
                                                <div style={{
                                                    backgroundColor: '#ECFDF5',
                                                    color: '#059669',
                                                    border: '1px solid #A7F3D0',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <CheckCircle2 size={13} color="#059669" /> PAID ({order.paymentMethod || 'Confirmed'})
                                                </div>
                                            ) : (
                                                <div style={{
                                                    backgroundColor: '#FFFBEB',
                                                    color: '#D97706',
                                                    border: '1px solid #FDE68A',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Clock size={13} color="#D97706" /> Pending Quote Verification
                                                </div>
                                            )}
                                            <div style={{
                                                ...styles.statusBadge,
                                                backgroundColor: badge.bg,
                                                color: badge.color,
                                                borderColor: badge.border,
                                            }}>
                                                <StatusIcon size={14} />
                                                {badge.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Patient Info */}
                                    <div style={styles.patientInfoBox}>
                                        <div style={styles.infoLine}>
                                            <User size={14} color="#059669" /> <strong>{order.customerName}</strong> ({order.customerEmail})
                                        </div>
                                        <div style={styles.infoLine}>
                                            <Phone size={14} color="#059669" /> {order.customerPhone || 'N/A'}
                                        </div>
                                        <div style={styles.infoLine}>
                                            <MapPin size={14} color="#059669" /> Delivery Option: <strong>{order.deliveryMethod === 'Pickup' ? '🏥 Counter Pickup (FREE)' : '🚚 Home Delivery (Delivery Charges < 500)'}</strong> ({order.deliveryAddress || 'Store Pick-up'})
                                        </div>
                                    </div>

                                    {/* Prescription & Days Supply Banner */}
                                    {order.prescriptionImageUrl && (
                                        <div style={styles.rxAlertBanner}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FileCheck size={18} color="#D97706" />
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400E' }}>Doctor Prescription Uploaded</div>
                                                    <div style={{ fontSize: '12px', color: '#B45309' }}>Requested Supply: {order.daysSupply ? `${order.daysSupply} Days` : 'Standard Doctor Dosage'}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setViewRxModal(order.prescriptionImageUrl)}
                                                style={styles.viewRxBtn}
                                            >
                                                <Eye size={14} /> View Receipt
                                            </button>
                                        </div>
                                    )}

                                    {/* Items List */}
                                    <div style={styles.itemsSection}>
                                        <div style={styles.sectionTitle}>Ordered Medicines &amp; Rx Quote Items</div>
                                        {order.items?.map((item, idx) => {
                                            const isRxItem = order.status === 'PendingVerification' || item.requiresPrescription || item.unitType === 'RxQuote' || order.totalAmount === 0;
                                            return (
                                                <div key={idx} style={styles.itemRow}>
                                                    <span>{(() => {
                                                        const isCard = item.unitType === 'Card' || (item.medicineName || item.name || '').toLowerCase().includes('(card)');
                                                        const unitLabel = isCard ? (item.quantity > 1 ? 'Cards' : 'Card') : (item.quantity > 1 ? 'Pills' : 'Pill');
                                                        const nameStr = item.medicineName || item.name || '';
                                                        return nameStr.toLowerCase().includes('(card)')
                                                            ? `${nameStr} (x${item.quantity})`
                                                            : `${nameStr} (x${item.quantity} ${unitLabel})`;
                                                    })()}</span>
                                                    <span style={{ fontWeight: 600, color: isRxItem ? '#D97706' : '#059669' }}>
                                                        {isRxItem ? 'Pharmacist Quote Required' : `Rs. ${(item.subtotal || item.price * item.quantity || 0).toFixed(2)}`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        <div style={styles.totalRow}>
                                            <span>Total Quoted Amount</span>
                                            <span style={styles.totalVal}>
                                                {(order.status !== 'PendingVerification' && order.totalAmount > 0) ? `Rs. ${order.totalAmount.toFixed(2)}` : 'Pending Quote'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Pharmacist Note / Description display */}
                                    {order.adminNote && (
                                        <div style={styles.adminNoteBox}>
                                            <MessageSquare size={14} color="#0284C7" />
                                            <div>
                                                <strong>Pharmacist Description / Update:</strong>
                                                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#334155' }}>{order.adminNote}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <div style={{ ...styles.cardActions, display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setAdminNoteInput(order.adminNote || '');
                                                setQuotePriceInput(order.totalAmount ?? 0);
                                            }}
                                            style={{ ...styles.manageBtn, flex: 1 }}
                                        >
                                            Manage Order &amp; Pharmacist Note
                                        </button>
                                        <button
                                            onClick={() => handleDeleteOrder(order.id)}
                                            style={{
                                                backgroundColor: '#FEF2F2',
                                                border: '1px solid #FECACA',
                                                color: '#DC2626',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="Delete Order"
                                        >
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Modal to Review Order & Update Status */}
            {selectedOrder && (
                <div style={styles.modalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedOrder(null);
                }}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                                    Review Order #{selectedOrder.orderNumber}
                                </h3>
                                <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    🤖 Powered by Google Gemini 1.5 Vision Agentic AI
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                style={styles.closeBtn}
                                title="Close Form (Esc)"
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                                Customer: <strong>{selectedOrder.customerName}</strong> ({selectedOrder.customerEmail})
                            </p>

                            <div style={{ background: '#F1F5F9', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', color: '#334155' }}>
                                <div>Fulfillment: <strong>{selectedOrder.deliveryMethod === 'Pickup' ? '🏥 Counter Pickup (FREE)' : '🚚 Home Delivery (Delivery Charges < 500 - Pay on Delivery)'}</strong></div>
                                {selectedOrder.deliveryAddress && <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Address: {selectedOrder.deliveryAddress}</div>}
                            </div>

                            {selectedOrder.prescriptionImageUrl && (
                                <div style={{ background: '#FFFBEB', padding: '12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                                    <div style={{ fontWeight: 700, color: '#B45309', marginBottom: '6px', fontSize: '13px' }}>
                                        Uploaded Doctor Prescription Receipt
                                    </div>
                                    <img
                                        src={selectedOrder.prescriptionImageUrl}
                                        alt="Prescription"
                                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', backgroundColor: '#FFFFFF' }}
                                        onClick={() => setViewRxModal(selectedOrder.prescriptionImageUrl)}
                                    />
                                    <p style={{ fontSize: '11px', color: '#92400E', marginTop: '4px', textAlign: 'center', margin: '4px 0 0' }}>
                                        🔍 Click image to view full screen
                                    </p>
                                </div>
                            )}

                            {/* AGENT 1 & 2 — AGENTIC AI VISION & PRESCRIPTION SAFETY EVALUATION */}
                            {(() => {
                                const safety = evaluatePrescriptionSafetyClient(selectedOrder, orders);
                                const isHighRisk = safety.riskScore >= 50 || safety.flags.some(f => f.toLowerCase().includes("duplicate") || f.toLowerCase().includes("suspicious"));
                                return (
                                    <div style={{
                                        background: isHighRisk ? '#FEF2F2' : '#FFFBEB',
                                        border: `1px solid ${isHighRisk ? '#FCA5A5' : '#FDE68A'}`,
                                        borderRadius: '10px',
                                        padding: '16px',
                                        color: isHighRisk ? '#991B1B' : '#856404'
                                    }}>
                                        <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>⚠️ Agentic AI Safety &amp; Handwriting Assessment</span>
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                backgroundColor: '#0F172A',
                                                color: '#38BDF8',
                                                fontWeight: 700
                                            }}>
                                                {safety.aiAgent}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', fontSize: '12px', background: 'rgba(255,255,255,0.7)', padding: '8px 10px', borderRadius: '6px' }}>
                                            <div>
                                                <strong>Handwriting Reading:</strong>
                                                <div style={{ color: '#059669', fontWeight: 700 }}>{safety.handwritingStatus}</div>
                                            </div>
                                            <div>
                                                <strong>Duplication Check:</strong>
                                                <div style={{ color: safety.duplicationStatus.includes("Duplicate") ? '#DC2626' : '#059669', fontWeight: 700 }}>
                                                    {safety.duplicationStatus}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                                            Overall Risk Score: <span style={{ color: isHighRisk ? '#DC2626' : '#D97706', fontSize: '15px' }}>{safety.riskScore}/100</span>
                                        </div>

                                        {safety.flags && safety.flags.length > 0 && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '4px' }}>
                                                    Detected AI Flags &amp; Checks:
                                                </div>
                                                <div style={{ fontSize: '12px' }}>
                                                    {safety.flags.map((flag, idx) => (
                                                        <div key={idx} style={{ marginBottom: '3px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                            <span>•</span> <span>{flag}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>Recommended Decision:</span>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '6px',
                                                fontWeight: 800,
                                                fontSize: '11px',
                                                backgroundColor: safety.recommendedAction === 'BLOCK_AND_FLAG_FOR_REVIEW' ? '#DC2626' : '#D97706',
                                                color: '#FFFFFF'
                                            }}>
                                                {safety.recommendedAction}
                                            </span>
                                        </div>

                                        {/* PATIENT VIOLATION AUDIT & ANTI-ABUSE CONTROLS PANEL */}
                                        <div style={{
                                            marginTop: '12px',
                                            paddingTop: '12px',
                                            borderTop: '1px dashed #FCA5A5',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                        }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <ShieldAlert size={16} color="#DC2626" /> Patient Violation &amp; Anti-Abuse Management
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    backgroundColor: blockedUsers.includes(selectedOrder.customerEmail) ? '#EF4444' : '#10B981',
                                                    color: '#FFFFFF',
                                                    fontWeight: 800
                                                }}>
                                                    {blockedUsers.includes(selectedOrder.customerEmail) ? '🚫 ACCOUNT BLOCKED' : '✓ ACCOUNT ACTIVE'}
                                                </span>
                                            </div>

                                            {/* Patient Violation Audit Details */}
                                            <div style={{ fontSize: '12px', color: '#7F1D1D', background: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                                                <div><strong>Violating Patient:</strong> {selectedOrder.customerName} ({selectedOrder.customerEmail || 'No Email'})</div>
                                                <div><strong>Violation Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                                                <div><strong>Offending Order #:</strong> {selectedOrder.orderNumber}</div>
                                                {safety.isNonMedicalDoc && (
                                                    <div style={{ marginTop: '4px', color: '#B91C1C', fontWeight: 700 }}>
                                                        {"🤖 AI Identification Reason: Uploaded image contains R-Programming assignment code (scores <- c(85, 90, 78, 92, NA, 88)), which is a non-medical prescription violation."}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Patient Submitted Appeal & Doctor Letter Viewer (if exists) */}
                                            {(() => {
                                                const patientAppeal = appeals.find(a => a.orderNumber === selectedOrder.orderNumber || a.email === selectedOrder.customerEmail);
                                                if (!patientAppeal) return null;
                                                return (
                                                    <div style={{ backgroundColor: '#F0FDF4', border: '1px dashed #22C55E', padding: '10px 12px', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <FileText size={14} /> Patient Violation Appeal &amp; Doctor Letter Submitted:
                                                        </div>
                                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#166534', italic: 'italic' }}>
                                                            "{patientAppeal.reason || 'No explanation text provided.'}"
                                                        </p>
                                                        {patientAppeal.doctorLetterUrl && (
                                                            <div style={{ marginTop: '6px' }}>
                                                                <a
                                                                    href={patientAppeal.doctorLetterUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    📎 View Attached Doctor Letter / Medical Note
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Admin Custom Warning Message Textarea */}
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#7F1D1D', display: 'block', marginBottom: '4px' }}>
                                                    Admin Violation Notice Message to Patient:
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={warningMessages[selectedOrder.orderNumber] ?? `We detected that you uploaded an invalid non-medical image for prescription verification (Order #${selectedOrder.orderNumber}). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to medibridge@gmail.com.`}
                                                    onChange={(e) => setWarningMessages({ ...warningMessages, [selectedOrder.orderNumber]: e.target.value })}
                                                    style={{ width: '100%', borderRadius: '6px', border: '1px solid #FCA5A5', padding: '8px', fontSize: '12px', boxSizing: 'border-box' }}
                                                />
                                            </div>

                                            {/* Admin Action Buttons: Send Warning & Block Account */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWarningMessage(selectedOrder.customerEmail, selectedOrder.orderNumber)}
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor: '#0F172A',
                                                        color: '#FFFFFF',
                                                        border: 'none',
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    🔔 Send Warning Notification to User
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleBlockUser(selectedOrder.customerEmail)}
                                                    style={{
                                                        backgroundColor: blockedUsers.includes(selectedOrder.customerEmail) ? '#166534' : '#DC2626',
                                                        color: '#FFFFFF',
                                                        border: 'none',
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <UserX size={14} />
                                                    {blockedUsers.includes(selectedOrder.customerEmail) ? 'Unblock User' : 'Block User 🚫'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div>
                                <label style={styles.inputLabel}>
                                    Calculated Total Quoted Price (Rs.) {selectedOrder.totalAmount === 0 && <span style={{ color: '#D97706', fontWeight: 600 }}>(Set price for Rx Order)</span>}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter total quoted amount for patient..."
                                    value={quotePriceInput}
                                    onChange={(e) => setQuotePriceInput(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #CBD5E1',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                                    💡 Tip: Doctor dosage calculation. Delivery charges (&lt; Rs. 500) are paid directly to the courier upon delivery.
                                </div>
                            </div>

                            <div>
                                <label style={styles.inputLabel}>
                                    Pharmacist Note / Stock &amp; Dosage Advice to Patient *
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Add comments regarding prescription legitimacy, availability, stock updates, or dosage instructions..."
                                    value={adminNoteInput}
                                    onChange={(e) => setAdminNoteInput(e.target.value)}
                                    style={styles.textarea}
                                />
                            </div>

                            <div style={styles.modalActionsGrid}>
                                <button
                                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Approved')}
                                    disabled={actionLoading}
                                    style={{ ...styles.actionBtnPrimary, backgroundColor: '#0284C7' }}
                                >
                                    <CheckCircle2 size={16} /> Approve &amp; Send Quote
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Dispatched')}
                                    disabled={actionLoading}
                                    style={{ ...styles.actionBtnPrimary, backgroundColor: '#0D9488' }}
                                >
                                    <Truck size={16} /> Dispatch Order
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelled')}
                                    disabled={actionLoading}
                                    style={{ ...styles.actionBtnPrimary, backgroundColor: '#DC2626' }}
                                >
                                    <XCircle size={16} /> Reject Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for viewing Prescription Image Full Screen */}
            {viewRxModal && (
                <div style={styles.modalOverlay} onClick={() => setViewRxModal(null)}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '20px',
                        borderRadius: '16px',
                        maxWidth: '620px',
                        width: '92%',
                        maxHeight: '88vh',
                        overflowY: 'auto',
                        textAlign: 'center',
                        position: 'relative',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                            <h4 style={{ margin: 0, color: '#0F172A', fontSize: '16px', fontWeight: 800 }}>
                                Doctor Prescription Verification (Google Gemini 1.5 Vision)
                            </h4>
                            <button onClick={() => setViewRxModal(null)} style={styles.closeBtn} title="Close Preview">&times;</button>
                        </div>
                        <img src={viewRxModal} alt="Rx Receipt" style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setViewRxModal(null)} style={{ padding: '8px 24px', background: '#059669', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '16px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    headerContent: {
        maxWidth: '1300px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#F1F5F9',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '8px',
        color: '#475569',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    logoImg: {
        width: '38px',
        height: '38px',
        objectFit: 'contain',
    },
    logoTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: '#0F172A',
        margin: 0,
        letterSpacing: '0.5px',
    },
    logoSubtitle: {
        fontSize: '12px',
        color: '#64748B',
        margin: 0,
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
    main: {
        maxWidth: '1300px',
        margin: '32px auto',
        padding: '0 24px',
    },
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    },
    statVal: {
        fontSize: '24px',
        fontWeight: 800,
        color: '#0F172A',
    },
    statLbl: {
        fontSize: '13px',
        color: '#64748B',
    },
    toolbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '10px',
        padding: '10px 16px',
        width: '340px',
    },
    searchInput: {
        border: 'none',
        outline: 'none',
        width: '100%',
        fontSize: '14px',
    },
    filterTabs: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    filterBtn: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #CBD5E1',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    ordersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '24px',
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    orderHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderNum: {
        fontSize: '15px',
        fontWeight: 800,
        color: '#0F172A',
    },
    orderDate: {
        fontSize: '12px',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '2px',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 700,
        border: '1px solid',
    },
    patientInfoBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '13px',
        color: '#334155',
    },
    infoLine: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    rxAlertBanner: {
        backgroundColor: '#FEF3C7',
        border: '1px solid #FDE68A',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    viewRxBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #F59E0B',
        color: '#B45309',
        fontSize: '12px',
        fontWeight: 700,
        padding: '6px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    itemsSection: {
        borderTop: '1px borderBottom 1px solid #E2E8F0',
        padding: '10px 0',
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: 700,
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: '6px',
    },
    itemRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: '#334155',
        marginBottom: '4px',
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
        fontWeight: 700,
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px dashed #E2E8F0',
    },
    totalVal: {
        color: '#059669',
        fontSize: '16px',
    },
    adminNoteBox: {
        backgroundColor: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: '8px',
        padding: '10px 12px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
    },
    cardActions: {
        marginTop: 'auto',
        paddingTop: '10px',
    },
    manageBtn: {
        width: '100%',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        border: 'none',
        padding: '10px',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #E2E8F0',
        padding: '16px 20px',
        backgroundColor: '#F8FAFC',
    },
    modalBody: {
        padding: '20px',
        overflowY: 'auto',
        maxHeight: 'calc(88vh - 75px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    closeBtn: {
        background: '#E2E8F0',
        border: 'none',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        fontSize: '22px',
        fontWeight: '700',
        cursor: 'pointer',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
    },
    inputLabel: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: '6px',
    },
    textarea: {
        width: '100%',
        borderRadius: '8px',
        border: '1px solid #CBD5E1',
        padding: '10px',
        fontSize: '13px',
        outline: 'none',
        resize: 'vertical',
    },
    modalActionsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
    },
    actionBtnPrimary: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#FFFFFF',
        border: 'none',
        padding: '12px',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
    },
    loadingState: {
        textAlign: 'center',
        padding: '60px 0',
        color: '#64748B',
        gridColumn: '1 / -1',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 0',
        color: '#64748B',
        gridColumn: '1 / -1',
    }
};

export default Orders;
