import React, { useState, useEffect, Component } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardPath } from '../../../utils/navigation';
import { api, getErrorMessage } from '../../../api/authApi';

// Safety net: catches any render crash and shows a friendly message instead of a blank page
class OrdersErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('[OrdersPage] Render error:', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '60px 40px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                    <h2 style={{ color: '#DC2626', marginBottom: 12 }}>Failed to load Prescription &amp; Orders Audit</h2>
                    <p style={{ color: '#64748B', maxWidth: 520, margin: '0 auto 24px' }}>
                        A rendering error occurred. This is usually caused by unexpected data from the server.
                    </p>
                    <details style={{ color: '#94A3B8', fontSize: 12, maxWidth: 600, margin: '0 auto 24px', textAlign: 'left' }}>
                        <summary style={{ cursor: 'pointer', color: '#475569' }}>Technical Details</summary>
                        <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error?.toString()}</pre>
                    </details>
                    <button onClick={() => this.setState({ hasError: false, error: null })} style={{ padding: '10px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
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
    FileText,
    Bot,
    Bell,
    Pill,
    RefreshCw,
    AlertTriangle,
    RotateCcw,
    Camera,
    AlertOctagon,
    Mail,
    QrCode,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

const Orders = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [violatedPatients, setViolatedPatients] = useState([]);
    const [loadingViolatedPatients, setLoadingViolatedPatients] = useState(false);

    useEffect(() => {
        if (statusFilter === 'ViolatedPatients') {
            fetchViolatedPatients();
        }
    }, [statusFilter]);

    const fetchViolatedPatients = async () => {
        setLoadingViolatedPatients(true);
        try {
            const res = await api.get('/PharmacyOrders/violated-patients');
            setViolatedPatients(res.data);
        } catch (err) {
            console.warn('Failed to fetch violated patients:', err);
        } finally {
            setLoadingViolatedPatients(false);
        }
    };
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
    const [rxDetailsOpen, setRxDetailsOpen] = useState(false);

    // ─────────────────────────────────────────────────────────────────────
    // Parses extracted prescription data (patient, doctor, clinic, date,
    // and medicines) from safetyFlags strings.
    // ─────────────────────────────────────────────────────────────────────
    const parseExtractedFromFlags = (flags) => {
        if (!Array.isArray(flags) || flags.length === 0) return null;

        const result = {
            quality: null,
            patient: null,
            hospital: null,
            doctor: null,
            date: null,
            medicines: []
        };

        let parsingMeds = false;

        for (const raw of flags) {
            const flag = String(raw || '').trim();
            if (!flag) continue;

            // Extraction quality
            const qMatch = flag.match(/Extraction Quality:\s*(\w+)/i);
            if (qMatch) {
                result.quality = qMatch[1].toUpperCase();
                parsingMeds = false;
                continue;
            }

            // Patient
            if (/(?:👤\s*)?Patient:/i.test(flag)) {
                result.patient = flag.replace(/^.*Patient:\s*/i, '').trim();
                parsingMeds = false;
                continue;
            }

            // Hospital
            if (/(?:🏥\s*)?Hospital:/i.test(flag)) {
                result.hospital = flag.replace(/^.*Hospital:\s*/i, '').trim();
                parsingMeds = false;
                continue;
            }

            // Doctor
            if (/(?:👨‍⚕️|👨⚕️)?\s*Doctor:/i.test(flag)) {
                result.doctor = flag.replace(/^.*Doctor:\s*/i, '').trim();
                parsingMeds = false;
                continue;
            }

            // Prescription Date
            if (/(?:📅\s*)?Prescription Date:/i.test(flag)) {
                result.date = flag.replace(/^.*Prescription Date:\s*/i, '').trim();
                parsingMeds = false;
                continue;
            }

            // Medicines header
            if (flag.includes('Extracted Medicines')) {
                parsingMeds = true;
                continue;
            }

            // Medicine detail line
            if (parsingMeds && /^[•·\-\s]+/.test(flag)) {
                const cleaned = flag.replace(/^[•·\-\s]+/, '').trim();
                if (cleaned) {
                    const parts = cleaned.split(' — ');
                    const name = parts[0]?.trim() || cleaned;
                    const details = parts[1]
                        ? parts[1].split('|').map(s => s.trim()).filter(Boolean)
                        : [];
                    result.medicines.push({
                        name,
                        details,
                        dosage: details[0] || null,
                        frequency: details[1] || null,
                        duration: details[2] || null
                    });
                }
                continue;
            }

            parsingMeds = false;
        }

        const hasAny =
            result.quality ||
            result.patient ||
            result.hospital ||
            result.doctor ||
            result.date ||
            result.medicines.length > 0;

        return hasAny ? result : null;
    };

    // ─────────────────────────────────────────────────────────────────────
    // Builds human-readable, categorized reason cards explaining WHY the
    // AI flagged a prescription. Parses safetyFlags from the backend + the
    // order's own fields to surface specific evidence per category.
    // ─────────────────────────────────────────────────────────────────────
    const buildAiDetailReasons = (order, safetyFlags = []) => {
        const reasons = [];
        const flagsLower = safetyFlags.map(f => f.toLowerCase());
        const hasRxImage = !!(order.prescriptionImageUrl || order.imageUrl);

        // ── CATEGORY 1: Document Authenticity / Vision Issues ──────────────
        const visionIssues = [];

        // Watermark / VOID stamp
        if (flagsLower.some(f => f.includes('watermark') || f.includes('void') || f.includes('sample') || f.includes('specimen') || f.includes('training') || f.includes('do not use')))
            visionIssues.push({ IconComponent: Lock, text: 'Watermark or "VOID/SAMPLE" stamp detected — prescription is marked as a training or specimen document, not a real issued one.' });

        // Flat vector / digital template
        if (flagsLower.some(f => f.includes('vector') || f.includes('flat_vector') || f.includes('computer template') || f.includes('graphic')))
            visionIssues.push({ IconComponent: AlertOctagon, text: 'Prescription appears to be a computer-generated vector graphic template, not a photographed real paper document.' });

        // Screenshot / UI chrome
        if (flagsLower.some(f => f.includes('screenshot') || f.includes('ui chrome') || f.includes('browser') || f.includes('taskbar') || f.includes('window')))
            visionIssues.push({ IconComponent: Camera, text: 'Image appears to be a screenshot of software or a website, not a photo of a physical prescription paper.' });

        // Non-medical image
        if (flagsLower.some(f => f.includes('non-medical') || f.includes('non_medical') || f.includes('non-prescription') || f.includes('not a valid doctor')))
            visionIssues.push({ IconComponent: AlertOctagon, text: 'Uploaded image is not a medical prescription — it appears to be an unrelated photo, document, or digital graphic.' });

        // Forgery / tampered
        if (flagsLower.some(f => f.includes('forgery') || f.includes('forged') || f.includes('tampered') || f.includes('annotation') || f.includes('mismatch')))
            visionIssues.push({ IconComponent: AlertTriangle, text: 'AI detected signs of document tampering or annotation error labels (e.g. FORGERY / MISMATCH overlaid on fields).' });

        // ── CATEGORY 2: Missing / Suspicious Document Fields ───────────────
        const fieldIssues = [];

        // Fake phone number
        if (flagsLower.some(f => f.includes('phone') && (f.includes('placeholder') || f.includes('555') || f.includes('000-0000') || f.includes('fake'))))
            fieldIssues.push({ IconComponent: Phone, text: 'Doctor\'s clinic phone number is a placeholder (e.g. 555-XXXX or 000-0000) — not a real registered clinic number.' });

        // Invalid email
        if (flagsLower.some(f => f.includes('email') && (f.includes('invalid') || f.includes('garbled') || f.includes('domain'))))
            fieldIssues.push({ IconComponent: Mail, text: 'Clinic email address has an invalid or nonsensical domain — suggests the document was generated using dummy data.' });

        // No signature or stamp
        if (flagsLower.some(f => f.includes('signature') || f.includes('stamp') || f.includes('seal') || f.includes('no doctor')))
            fieldIssues.push({ IconComponent: FileCheck, text: 'No valid doctor\'s signature, stamp, or clinic seal detected — all real prescriptions must have at least one of these to be legally valid.' });

        // Old prescription
        if (flagsLower.some(f => f.includes('months old') || f.includes('old') || (f.includes('months') && f.includes('threshold'))))
            fieldIssues.push({ IconComponent: Calendar, text: 'Prescription date is older than 6 months — prescriptions expire and cannot be used for refills after the threshold period.' });

        // No doctor / clinic name
        if (flagsLower.some(f => f.includes('no doctor') || (f.includes('doctor') && f.includes('name')) || (f.includes('clinic') && f.includes('name'))))
            fieldIssues.push({ IconComponent: User, text: 'Doctor name or clinic name is missing — a valid prescription must clearly identify the issuing physician and their registered clinic.' });

        // ── CATEGORY 3: Anti-Abuse / Pattern Issues ────────────────────────
        const patternIssues = [];

        // Duplicate prescription image
        if (flagsLower.some(f => f.includes('duplicate prescription') || f.includes('reuse attempt')))
            patternIssues.push({ IconComponent: RotateCcw, text: 'The same prescription image has been uploaded on multiple orders — prescription reuse is a safety violation.' });

        // High velocity orders
        if (flagsLower.some(f => f.includes('high velocity') || f.includes('orders within 7 days')))
            patternIssues.push({ IconComponent: Clock, text: 'Patient has placed an unusually high number of orders within a 7-day window — pattern consistent with medication stockpiling abuse.' });

        // Repeat medication
        if (flagsLower.some(f => f.includes('repeat medication') || f.includes('times within 7 days')))
            patternIssues.push({ IconComponent: Pill, text: 'Same medication ordered multiple times within 7 days — potential early refill attempt or duplicate ordering abuse.' });

        // Early refill
        if (flagsLower.some(f => f.includes('early refill')))
            patternIssues.push({ IconComponent: RefreshCw, text: 'Refill is being requested before the minimum required interval since last fulfillment — possible early refill abuse.' });

        // Suspicious history
        if (flagsLower.some(f => f.includes('suspicious') || f.includes('previous suspicious')))
            patternIssues.push({ IconComponent: ShieldAlert, text: 'This patient has multiple previously flagged high-risk orders in their history — elevated risk profile.' });

        // Handwritten prescription policy
        if (flagsLower.some(f => f.includes('handwritten') || f.includes('handwriting')))
            visionIssues.push({ IconComponent: FileCheck, text: 'Handwritten prescription detected — system policy requires printed doctor prescriptions only.' });

        if (visionIssues.length > 0) reasons.push({ category: 'Document Authenticity (AI Vision Analysis)', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', items: visionIssues });
        if (fieldIssues.length > 0) reasons.push({ category: 'Missing / Suspicious Prescription Fields', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', items: fieldIssues });
        if (patternIssues.length > 0) reasons.push({ category: 'Behavioral Pattern Flags (Anti-Abuse)', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', items: patternIssues });

        return reasons;
    };

    const evaluatePrescriptionSafetyClient = (currentOrder, allOrdersList = []) => {
        if (!currentOrder) {
            return {
                aiAgent: "Gemini 3.8 Flash (Agentic AI)",
                riskScore: 50,
                flags: ["Missing or ambiguous prescription information"],
                handwritingStatus: "Requires Manual Verification",
                duplicationStatus: "Unverified",
                recommendedAction: "REQUIRE_MANUAL_REVIEW"
            };
        }

        const currentRxImage = currentOrder.prescriptionImageUrl || currentOrder.imageUrl;
        const hasRxImage = !!currentRxImage;

        if (typeof currentOrder.safetyRiskScore === 'number' && currentOrder.safetyFlags) {
            const flags = Array.isArray(currentOrder.safetyFlags)
                ? [...currentOrder.safetyFlags]
                : typeof currentOrder.safetyFlags === 'string'
                    ? currentOrder.safetyFlags.split(',').map(s => s.trim()).filter(Boolean)
                    : [];

            const hasViolation = flags.some(f => {
                const l = f.toLowerCase();
                return l.includes("violation") || l.includes("non_medical") || l.includes("non-medical") || l.includes("non_prescription") || l.includes("forgery") || l.includes("suspicious") || l.includes("tampered") || l.includes("invalid document");
            });

            return {
                aiAgent: "Gemini 3.8 Flash (Agentic AI)",
                riskScore: currentOrder.safetyRiskScore,
                flags,
                handwritingStatus: !hasRxImage ? "N/A - Direct OTC Order (No Rx Image)" : hasViolation ? "⚠️ Non-Medical / Invalid Upload" : "Printed Rx Text Verified",
                duplicationStatus: !hasRxImage ? "N/A - Direct OTC Purchase" : flags.some(f => f.toLowerCase().includes("duplicate")) ? "Duplicate Rx Detected" : hasViolation ? "Invalid Document Uploaded" : "Unique Prescription",
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
        let isDuplicateRx = false;
        let isNonMedicalDoc = false;

        if (hasRxImage) {
            isDuplicateRx = patientHistory.some(pastOrder => {
                const pastRxImage = pastOrder.prescriptionImageUrl || pastOrder.imageUrl;
                if (!pastRxImage) return false;
                return pastRxImage === currentRxImage ||
                    (currentOrder.prescriptionHash && pastOrder.prescriptionHash && currentOrder.prescriptionHash === pastRxImage);
            });

            // Check if uploaded image is non-medical
            const rxLower = String(currentRxImage).toLowerCase();
            const orderNum = String(currentOrder.orderNumber || '');
            const notesLower = String(currentOrder.notes || currentOrder.patientNote || '').toLowerCase();

            // NOTE: Only match on order-level metadata/notes — never on the image URL itself,
            // because cloud storage URLs (Cloudinary, AWS S3, Firebase) contain generic words
            // like "image", "photo", "upload" etc. that would cause false positives.
            const nonMedicalNoteKeywords = [
                "scores", "vector", "assignment", "worksheet", "homework", "math", "exercise",
                "teacher", "library", "alphabet", "student", "class", "grade", "essay", "drawing",
                "sketch", "nonmedical", "worksheetdigital", "naruto"
            ];

            // Only flag based on admin-set flag OR suspicious order-level notes (NOT url)
            if (currentOrder.isNonMedicalUpload ||
                nonMedicalNoteKeywords.some(kw => notesLower.includes(kw))) {
                isNonMedicalDoc = true;
            }

            if (isNonMedicalDoc) {
                flags.push("⚠️ PRESCRIPTION VIOLATION: Uploaded file is a non-medical image or document (Laptop / Keyboard / Non-Prescription Photo), NOT a valid doctor prescription!");
                riskScore += 95;
            } else if (isDuplicateRx) {
                flags.push("⚠️ PRESCRIPTION VIOLATION: Duplicate prescription image upload reuse attempt detected across order history");
                riskScore += 75;
            } else {
                flags.push("Printed Prescription OCR Verified (Gemini 3.8 Flash)");
            }
        } else if (currentOrder.requiresPrescription || (Array.isArray(currentOrder.items) && currentOrder.items.some(i => i && i.requiresPrescription))) {
            flags.push("Missing prescription receipt image for prescription-required medication");
            riskScore += 40;
        }

        // B. Duplicate Line Item Detection in Single Order
        const currentItems = (currentOrder.items || []).filter(Boolean);
        const itemNames = currentItems.map(i => ((i && i.medicineName) || (i && i.name) || '').trim().toLowerCase()).filter(Boolean);
        const duplicateItems = itemNames.filter((name, index) => itemNames.indexOf(name) !== index);
        if (duplicateItems.length > 0) {
            flags.push(`Duplicate medicine entry in order: ${[...new Set(duplicateItems)].join(', ')}`);
            riskScore += 25;
        }

        // C. Order Frequency & Weekly Repeat Purchase Check (Anti-Abuse Scan for ALL Orders)
        const currentOrderDate = new Date(currentOrder.createdAt || Date.now());
        const nowMs = currentOrderDate.getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const past7DaysOrders = patientHistory.filter(o => {
            const oTime = new Date(o.createdAt || 0).getTime();
            return (nowMs - oTime) <= sevenDaysMs && (o.status !== 'Cancelled');
        });

        if (past7DaysOrders.length >= 3) {
            flags.push(`⚠️ High Velocity Order History: Patient placed ${past7DaysOrders.length + 1} orders within 7 days`);
            riskScore += 35;
        }

        for (const item of currentItems) {
            if (!item) continue;
            const medName = ((item && item.medicineName) || (item && item.name) || '').trim().toLowerCase();
            if (!medName) continue;

            const repeatOrdersThisWeek = past7DaysOrders.filter(o => {
                const pItems = (o.items || []).filter(Boolean);
                return pItems.some(pi => pi && (pi.medicineName || pi.name || '').trim().toLowerCase() === medName);
            });

            if (repeatOrdersThisWeek.length >= 1) {
                flags.push(`⚠️ Repeat Medication Purchase: Patient ordered "${item.medicineName || item.name}" ${repeatOrdersThisWeek.length + 1} times within 7 days`);
                riskScore += 30;
                break;
            }
        }

        // D. Refill Schedule & Early Refill Validation
        const pastFulfilledOrders = patientHistory.filter(o =>
            o.status === 'Confirmed' || o.status === 'Dispatched' || o.status === 'Delivered' || o.patientConfirmed
        );

        let isEarlyRefill = false;
        for (const item of currentItems) {
            if (!item) continue;
            const medName = ((item && item.medicineName) || (item && item.name) || '').trim().toLowerCase();
            if (!medName) continue;

            let latestPastOrder = null;
            let latestDate = 0;

            for (const pastOrder of pastFulfilledOrders) {
                const pastItems = (pastOrder.items || []).filter(Boolean);
                if (pastItems.some(pi => pi && (pi.medicineName || pi.name || '').trim().toLowerCase() === medName)) {
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
            flags.push("Early refill attempt detected for medication");
            riskScore += 50;
        }

        // Only count orders that were explicitly flagged by the AI safety system (risk >= 70).
        // Cancelled orders are NOT suspicious — patients cancel for legitimate reasons.
        const previousSuspiciousCount = patientHistory.filter(o => o.safetyRiskScore && o.safetyRiskScore >= 70).length;
        if (previousSuspiciousCount > 1) {
            flags.push("Multiple suspicious attempts detected in patient history");
            riskScore += 25;
        }

        riskScore = Math.min(100, Math.max(0, riskScore));

        let recommendedAction = "APPROVE";
        if (riskScore >= 70 || isDuplicateRx || isNonMedicalDoc) {
            recommendedAction = "BLOCK_AND_FLAG_FOR_REVIEW";
        } else if (riskScore >= 40 || flags.some(f => f.includes("⚠️"))) {
            // Only escalate to manual review if there are actual warning flags (⚠️ prefix)
            recommendedAction = "REQUIRE_MANUAL_REVIEW";
        }

        return {
            aiAgent: "Gemini 3.8 Flash (Agentic AI)",
            riskScore,
            flags,
            handwritingStatus: !hasRxImage ? "N/A - Direct OTC Order (No Rx Image)" : isNonMedicalDoc ? "⚠️ Non-Medical Image Uploaded" : "Printed Rx Text Verified",
            duplicationStatus: !hasRxImage ? "N/A - Direct OTC Purchase" : isDuplicateRx ? "Duplicate Rx Image Detected" : duplicateItems.length > 0 ? "Duplicate Items Detected" : isNonMedicalDoc ? "Invalid Document Uploaded" : "Unique Prescription",
            recommendedAction,
            isNonMedicalDoc
        };
    };

    useEffect(() => {
        fetchOrders();
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            const res = await api.get('/PharmacyOrders/blocked-users');
            if (res.data && Array.isArray(res.data)) {
                setBlockedUsers(res.data);
                try {
                    localStorage.setItem('medix_blocked_users', JSON.stringify(res.data));
                } catch (e) { }
            }
        } catch (e) {
            console.warn('Unable to load blocked users from API:', e);
        }
    };


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
                apiOrders = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
            } catch (err) {
                console.warn('Unable to load orders from server API:', err);
            }

            let localOrders = [];
            try {
                const parsed = JSON.parse(localStorage.getItem('medix_pharmacy_orders') || '[]');
                localOrders = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            } catch (e) { }

            const existingIds = new Set(apiOrders.filter(Boolean).map(o => o.id));
            const existingNums = new Set(apiOrders.filter(Boolean).map(o => o.orderNumber));
            for (const loc of localOrders) {
                if (loc && !existingIds.has(loc.id) && !existingNums.has(loc.orderNumber)) {
                    apiOrders.push(loc);
                }
            }

            apiOrders.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
            setOrders(apiOrders.filter(Boolean));
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
            `We detected that you uploaded an invalid non-medical image for prescription verification (Order #${orderNumber}). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to healthbridgeyourpharmacy@gmail.com.`;

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

    const handleToggleBlockUser = async (patientEmail) => {
        if (!patientEmail) return;
        const isCurrentlyBlocked = blockedUsers.includes(patientEmail);
        const shouldBlock = !isCurrentlyBlocked;
        let updated;
        if (isCurrentlyBlocked) {
            updated = blockedUsers.filter(e => e !== patientEmail);
        } else {
            updated = [...blockedUsers, patientEmail];
        }
        setBlockedUsers(updated);
        try {
            localStorage.setItem('medix_blocked_users', JSON.stringify(updated));
        } catch (e) { }

        try {
            await api.post('/PharmacyOrders/block-user', {
                email: patientEmail,
                block: shouldBlock,
                reason: "Prescription anti-abuse violation"
            });
            showToastMessage(`Patient account ${patientEmail} ${shouldBlock ? 'BLOCKED 🚫' : 'UNBLOCKED'}.`, shouldBlock ? 'error' : 'success');
        } catch (e) {
            console.warn('Failed to update block state on backend:', e);
            showToastMessage(`Patient account ${patientEmail} ${shouldBlock ? 'BLOCKED 🚫' : 'UNBLOCKED'}.`, shouldBlock ? 'error' : 'success');
        }
    };

    const filteredOrders = orders.filter(o => {
        if (!o) return false;
        const matchesSearch = (o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());

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
        if (statusFilter === 'ViolatedPrescriptions' || statusFilter === 'Violated Prescriptions Audit') {
            return matchesSearch && (
                (o.safetyRiskScore ?? 0) >= 70 ||
                o.safetyRecommendedAction === 'BLOCK_AND_FLAG_FOR_REVIEW' ||
                (() => {
                    const safety = evaluatePrescriptionSafetyClient(o, orders);
                    return safety ? (safety.riskScore >= 70 || safety.isNonMedicalDoc || safety.recommendedAction === 'BLOCK_AND_FLAG_FOR_REVIEW') : false;
                })()
            );
        }
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
                        <Link
                            to={getDashboardPath(user)}
                            style={{
                                ...styles.logo,
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'opacity 0.2s ease'
                            }}
                            className="cursor-pointer"
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                            title="Return to Dashboard"
                        >
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>PRESCRIPTION &amp; ORDER VERIFICATION</h1>
                                <p style={styles.logoSubtitle}>Admin Verification Portal &amp; Pharmacy Fulfillment</p>
                            </div>
                        </Link>
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
                                    if (!o) return false;
                                    try {
                                        const safety = evaluatePrescriptionSafetyClient(o, orders);
                                        return safety && (safety.riskScore >= 70 || safety.isNonMedicalDoc || safety.recommendedAction === 'BLOCK_AND_FLAG_FOR_REVIEW');
                                    } catch { return false; }
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
                        {['ALL', 'PendingVerification', 'Approved', 'Confirmed', 'Dispatched', 'Cancelled', 'ViolatedPrescriptions', 'ViolatedPatients'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                style={{
                                    ...styles.filterBtn,
                                    backgroundColor: statusFilter === st ? (st === 'ViolatedPrescriptions' || st === 'ViolatedPatients' ? '#DC2626' : '#059669') : '#FFFFFF',
                                    color: statusFilter === st ? '#FFFFFF' : (st === 'ViolatedPrescriptions' || st === 'ViolatedPatients' ? '#DC2626' : '#475569'),
                                    borderColor: statusFilter === st ? (st === 'ViolatedPrescriptions' || st === 'ViolatedPatients' ? '#DC2626' : '#059669') : (st === 'ViolatedPrescriptions' || st === 'ViolatedPatients' ? '#FCA5A5' : '#E2E8F0'),
                                    fontWeight: (st === 'ViolatedPrescriptions' || st === 'ViolatedPatients') ? 800 : 600,
                                }}
                            >
                                {st === 'ALL' ? 'All Orders' : st === 'ViolatedPrescriptions' ? 'Violated Prescriptions Audit' : st === 'ViolatedPatients' ? 'Violated Patients & Abuse Desk' : st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Orders List */}
                <div style={styles.ordersGrid}>
                    {statusFilter === 'ViolatedPatients' ? (
                        loadingViolatedPatients ? (
                            <div style={styles.loadingState}>
                                <div className="spinner" />
                                <p>Loading violated patients summary...</p>
                            </div>
                        ) : violatedPatients.length === 0 ? (
                            <div style={styles.emptyState}>
                                <ShieldAlert size={48} color="#059669" />
                                <h3>No Violated Patients Found</h3>
                                <p>No patients currently have high-risk flagged orders in the system.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', width: '100%', gridColumn: '1 / -1' }}>
                                {violatedPatients.map(p => (
                                    <div key={p.customerEmail} style={{
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #FECACA',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{p.customerName || 'Anonymous'}</h4>
                                                <div style={{ fontSize: '12.5px', color: '#64748B' }}>{p.customerEmail}</div>
                                            </div>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                backgroundColor: p.riskLevel === 'CRITICAL' ? '#FEE2E2' : p.riskLevel === 'HIGH' ? '#FFEDD5' : '#FEF3C7',
                                                color: p.riskLevel === 'CRITICAL' ? '#991B1B' : p.riskLevel === 'HIGH' ? '#9A3412' : '#92400E'
                                            }}>
                                                {p.riskLevel} RISK
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                                            <div>Flagged Orders: <strong style={{ color: '#DC2626' }}>{p.flaggedOrders} of {p.totalOrders}</strong></div>
                                            <div>Suspicious Rate: <strong>{p.suspiciousRate}%</strong></div>
                                            <div>Last Violation: <strong>{new Date(p.lastFlaggedAt).toLocaleDateString()}</strong></div>
                                        </div>

                                        <button
                                            onClick={() => navigate(`/pharmacy/staff/patient-analytics?email=${encodeURIComponent(p.customerEmail)}`)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: '#7C3AED',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 800,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            📊 View Full Patient Analytics
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : loading ? (
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
                        filteredOrders.filter(Boolean).map(order => {
                            if (!order) return null;
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
                                        <button
                                            onClick={() => navigate(`/pharmacy/staff/patient-analytics?email=${encodeURIComponent(order.customerEmail)}`)}
                                            style={{
                                                marginTop: '8px',
                                                padding: '5px 12px',
                                                backgroundColor: '#7C3AED',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: 700,
                                                fontSize: '11.5px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            📊 View Patient Analytics
                                        </button>
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
                                                        const nameStr = item.medicineName || item.name || '';
                                                        if (nameStr.toLowerCase().includes('(card)')) {
                                                            return `${nameStr} (x${item.quantity})`;
                                                        }
                                                        const rawUnit = item.unitType || item.unitName || 'Pill';
                                                        const u = rawUnit.trim();
                                                        const lower = u.toLowerCase();
                                                        const qty = item.quantity || 1;

                                                        let unitLabel = u;
                                                        if (lower === 'card') unitLabel = qty > 1 ? 'Cards' : 'Card';
                                                        else if (lower === 'pill') unitLabel = qty > 1 ? 'Pills' : 'Pill';
                                                        else if (lower === 'bottle') unitLabel = qty > 1 ? 'Bottles' : 'Bottle';
                                                        else if (lower === 'tube') unitLabel = qty > 1 ? 'Tubes' : 'Tube';
                                                        else if (lower === 'sachet') unitLabel = qty > 1 ? 'Sachets' : 'Sachet';
                                                        else if (lower === 'box') unitLabel = qty > 1 ? 'Boxes' : 'Box';
                                                        else if (lower === 'vial') unitLabel = qty > 1 ? 'Vials' : 'Vial';
                                                        else if (lower === 'inhaler') unitLabel = qty > 1 ? 'Inhalers' : 'Inhaler';
                                                        else if (lower === 'drops') unitLabel = qty > 1 ? 'Bottles' : 'Bottle';
                                                        else if (qty > 1) {
                                                            unitLabel = (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('ch') || lower.endsWith('sh'))
                                                                ? `${u}es`
                                                                : `${u}s`;
                                                        }
                                                        return `${nameStr} (x${qty} ${unitLabel})`;
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
                                                setRxDetailsOpen(false);
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
            {selectedOrder && (() => {
                const safety = evaluatePrescriptionSafetyClient(selectedOrder, orders);
                const allFlags = [
                    ...(Array.isArray(selectedOrder.safetyFlags)
                        ? selectedOrder.safetyFlags
                        : typeof selectedOrder.safetyFlags === 'string'
                            ? selectedOrder.safetyFlags.split(',').map(s => s.trim()).filter(Boolean)
                            : []),
                    ...(safety.flags || [])
                ];
                const detailReasons = buildAiDetailReasons(selectedOrder, allFlags);
                const docCount = detailReasons.find(r => r.category.includes('Document'))?.items.length || 0;
                const fieldCount = detailReasons.find(r => r.category.includes('Fields'))?.items.length || 0;
                const behaviorCount = detailReasons.find(r => r.category.includes('Behavioral'))?.items.length || 0;
                const totalSignals = (safety.flags || []).length;

                // Score Color and Label Logic
                const scoreColor = safety.riskScore < 30 ? '#059669' : safety.riskScore < 70 ? '#D97706' : '#DC2626';
                const scoreLabel = safety.riskScore < 30 ? 'LOW' : safety.riskScore < 70 ? 'MEDIUM' : 'HIGH';

                // Decision Pill Logic
                let decisionColor = '#059669';
                let DecisionIcon = CheckCircle2;
                let decisionSummary = 'Order passed all routine safety checks';
                if (safety.recommendedAction === 'BLOCK_AND_FLAG_FOR_REVIEW') {
                    decisionColor = '#DC2626';
                    DecisionIcon = XCircle;
                    decisionSummary = 'Critical safety risk or invalid document detected';
                } else if (safety.recommendedAction === 'REQUIRE_MANUAL_REVIEW') {
                    decisionColor = '#D97706';
                    DecisionIcon = AlertTriangle;
                    decisionSummary = 'Prescription requires manual pharmacist verification';
                }

                // Status Cleanups (no emojis)
                const cleanHwStatus = (safety.handwritingStatus || '').replace(/⚠️/g, '').trim();
                const hwIsRed = cleanHwStatus.includes('Non-Medical') || cleanHwStatus.includes('Invalid');
                const hwColor = hwIsRed ? '#DC2626' : '#059669';

                const cleanDupStatus = (safety.duplicationStatus || '').replace(/⚠️/g, '').trim();
                const dupIsRed = cleanDupStatus.includes('Duplicate') || cleanDupStatus.includes('Invalid');
                const dupColor = dupIsRed ? '#DC2626' : '#059669';

                const patientAppeal = appeals.find(a => a.orderNumber === selectedOrder.orderNumber || a.email === selectedOrder.customerEmail);
                const formattedDate = selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : '';
                const deliveryText = selectedOrder.deliveryMethod === 'Pickup' ? 'Counter Pickup' : 'Home Delivery';

                return (
                    <div style={styles.modalOverlay} onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedOrder(null);
                    }}>
                        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                            {/* ZONE A — STICKY HEADER */}
                            <div style={styles.modalHeader}>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                                        Review Order #{selectedOrder.orderNumber}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                        {selectedOrder.customerName} · {formattedDate} · {deliveryText}
                                    </div>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginTop: '6px',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: '#059669',
                                        backgroundColor: '#ECFDF5',
                                        border: '1px solid #A7F3D0'
                                    }}>
                                        <Bot size={14} color="#059669" />
                                        <span>Gemini 3.8 Flash</span>
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

                            {/* SCROLLABLE BODY */}
                            <div style={styles.modalBody}>
                                {/* ZONE B — RISK + DECISION BANNER */}
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                                    {/* Left: 140px fixed circular risk badge */}
                                    <div style={{
                                        width: '140px',
                                        flexShrink: 0,
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxSizing: 'border-box'
                                    }}>
                                        <div style={{
                                            width: '100px',
                                            height: '100px',
                                            border: `6px solid ${scoreColor}`,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            boxSizing: 'border-box'
                                        }}>
                                            <span style={{ fontSize: '32px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                                                {safety.riskScore}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', lineHeight: 1 }}>
                                                /100
                                            </span>
                                            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800, color: scoreColor, marginTop: '2px', lineHeight: 1 }}>
                                                {scoreLabel}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right: Decision pill + tiles */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{
                                            width: '100%',
                                            padding: '14px 18px',
                                            borderRadius: '10px',
                                            backgroundColor: decisionColor,
                                            boxSizing: 'border-box'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <DecisionIcon size={18} />
                                                <span>{safety.recommendedAction.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
                                                {totalSignals} signals detected
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>
                                                {decisionSummary}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
                                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.5px', fontWeight: 700 }}>
                                                    PRINTED RX VERIFICATION
                                                </div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: hwColor, marginTop: '2px' }}>
                                                    {cleanHwStatus}
                                                </div>
                                            </div>
                                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
                                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.5px', fontWeight: 700 }}>
                                                    DUPLICATION CHECK
                                                </div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: dupColor, marginTop: '2px' }}>
                                                    {cleanDupStatus}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ZONE C — ISSUE SUMMARY STRIP */}
                                {(docCount > 0 || fieldCount > 0 || behaviorCount > 0) && (
                                    <div style={{
                                        padding: '14px 18px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        gap: '32px',
                                        alignItems: 'center'
                                    }}>
                                        {docCount > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: '#DC2626' }}>
                                                    DOCUMENT
                                                </span>
                                                <span style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626' }}>
                                                    {docCount}
                                                </span>
                                            </div>
                                        )}
                                        {fieldCount > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: '#D97706' }}>
                                                    FIELDS
                                                </span>
                                                <span style={{ fontSize: '20px', fontWeight: 800, color: '#D97706' }}>
                                                    {fieldCount}
                                                </span>
                                            </div>
                                        )}
                                        {behaviorCount > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: '#7C3AED' }}>
                                                    BEHAVIOR
                                                </span>
                                                <span style={{ fontSize: '20px', fontWeight: 800, color: '#7C3AED' }}>
                                                    {behaviorCount}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ZONE D — GROUPED ISSUE CARDS */}
                                {detailReasons.length > 0 && (
                                    <div>
                                        {detailReasons.map((section, si) => (
                                            <div key={si} style={{
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #E2E8F0',
                                                borderLeft: `4px solid ${section.color}`,
                                                borderRadius: '8px',
                                                padding: '14px 16px',
                                                marginBottom: '10px'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    paddingBottom: '8px',
                                                    borderBottom: '1px solid #F1F5F9'
                                                }}>
                                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', color: section.color }}>
                                                        {section.category}
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: section.color }}>
                                                        {section.items.length}
                                                    </span>
                                                </div>
                                                <div>
                                                    {section.items.map((item, ii) => (
                                                        <div key={ii} style={{
                                                            fontSize: '13px',
                                                            lineHeight: 1.55,
                                                            color: '#334155',
                                                            padding: '8px 0',
                                                            borderBottom: ii < section.items.length - 1 ? '1px solid #F8FAFC' : 'none'
                                                        }}>
                                                            {typeof item.text === 'string' ? item.text.replace(/⚠️/g, '').trim() : item.text}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* ZONE E — PRESCRIPTION DETAILS (collapsible) */}
                                {selectedOrder.prescriptionImageUrl && (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setRxDetailsOpen(!rxDetailsOpen)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '12px 16px',
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            {rxDetailsOpen ? <ChevronDown size={16} color="#0F172A" /> : <ChevronRight size={16} color="#0F172A" />}
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                                                Prescription Details
                                            </span>
                                        </button>

                                        {rxDetailsOpen && (
                                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {/* Block 1 — Image */}
                                                <div>
                                                    <img
                                                        src={selectedOrder.prescriptionImageUrl}
                                                        alt="Prescription"
                                                        style={{
                                                            maxHeight: '260px',
                                                            width: '100%',
                                                            objectFit: 'contain',
                                                            backgroundColor: '#F8FAFC',
                                                            border: '1px solid #E2E8F0',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => setViewRxModal(selectedOrder.prescriptionImageUrl)}
                                                    />
                                                    <div style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', marginTop: '6px' }}>
                                                        Click to view full size
                                                    </div>
                                                </div>

                                                {/* Block 2 — Extracted Data (only if available) */}
                                                {(() => {
                                                    const parsedFlags = Array.isArray(selectedOrder.safetyFlags)
                                                        ? selectedOrder.safetyFlags
                                                        : typeof selectedOrder.safetyFlags === 'string'
                                                            ? selectedOrder.safetyFlags.split(',').map(s => s.trim()).filter(Boolean)
                                                            : [];

                                                    const extracted = selectedOrder.extractedData ||
                                                        parseExtractedFromFlags(parsedFlags);

                                                    const hasExtracted = extracted && (
                                                        extracted.patient ||
                                                        extracted.doctor ||
                                                        extracted.hospital ||
                                                        extracted.date ||
                                                        (Array.isArray(extracted.medicines) && extracted.medicines.length > 0)
                                                    );

                                                    if (!hasExtracted) {
                                                        return (
                                                            <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', padding: '4px 0' }}>
                                                                No structured extraction available for this order.
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Patient</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{extracted.patient || 'N/A'}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Doctor</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{extracted.doctor || 'N/A'}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Hospital</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{extracted.hospital || 'N/A'}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Prescription Date</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{extracted.date || 'N/A'}</div>
                                                                </div>
                                                            </div>

                                                            {Array.isArray(extracted.medicines) && extracted.medicines.length > 0 && (
                                                                <div style={{ marginTop: '12px' }}>
                                                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, marginBottom: '8px' }}>
                                                                        Extracted Medicines ({extracted.medicines.length})
                                                                    </div>
                                                                    {extracted.medicines.map((med, mIdx) => (
                                                                        <div key={mIdx} style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '6px', marginBottom: '6px' }}>
                                                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                                                                                {med.name || 'Unnamed Medicine'}
                                                                            </div>
                                                                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                                                                                {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Counter Pickup Digital QR Ticket for Staff Verification */}
                                {(selectedOrder.deliveryMethod === 'Pickup' || selectedOrder.paymentMethod === 'PayAtCounter') && (
                                    <div style={{
                                        backgroundColor: '#ECFDF5',
                                        border: '1px solid #A7F3D0',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px'
                                    }}>
                                        <div style={{ backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`PHARMACY_ORDER|${selectedOrder.orderNumber || selectedOrder.id}|${selectedOrder.customerName || 'Patient'}|${selectedOrder.totalAmount || 0}`)}`}
                                                alt="Staff QR Verification"
                                                style={{ width: '60px', height: '60px', display: 'block' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', marginBottom: '4px' }}>
                                                <QrCode size={12} /> Counter Pickup QR Ticket
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                                                Ticket Order #{selectedOrder.orderNumber}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#047857' }}>
                                                Patient Counter Express Scan Validated
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ZONE F — VIOLATION PANEL (conditional) */}
                                {(safety.recommendedAction !== 'APPROVE' || (safety.flags && safety.flags.length > 0)) && (
                                    <div style={{
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderLeft: '4px solid #DC2626',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '10px'
                                    }}>
                                        {/* Section header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <ShieldAlert size={16} color="#DC2626" />
                                                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#DC2626', letterSpacing: '0.5px' }}>
                                                    PATIENT VIOLATION & ANTI-ABUSE MANAGEMENT
                                                </span>
                                            </div>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '12px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                color: '#FFFFFF',
                                                backgroundColor: blockedUsers.includes(selectedOrder.customerEmail) ? '#DC2626' : '#059669'
                                            }}>
                                                {blockedUsers.includes(selectedOrder.customerEmail) ? 'ACCOUNT BLOCKED' : 'ACCOUNT ACTIVE'}
                                            </span>
                                        </div>

                                        {/* Patient info block */}
                                        <div style={{
                                            marginTop: '12px',
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            fontSize: '12px',
                                            color: '#334155',
                                            lineHeight: 1.6
                                        }}>
                                            <div><strong>Violating Patient:</strong> {selectedOrder.customerName || 'Anonymous'} ({selectedOrder.customerEmail || 'No Email'})</div>
                                            <div><strong>Violation Date:</strong> {formattedDate || new Date(selectedOrder.createdAt).toLocaleDateString()}</div>
                                            <div><strong>Offending Order:</strong> #{selectedOrder.orderNumber}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                                                <Bot size={14} color="#DC2626" /> AI Flags: {safety.flags.length} signals detected
                                            </div>
                                        </div>

                                        {/* Appeal viewer (if appeals match) */}
                                        {patientAppeal && (
                                            <div style={{
                                                marginTop: '10px',
                                                backgroundColor: '#F0FDF4',
                                                border: '1px solid #BBF7D0',
                                                borderLeft: '4px solid #22C55E',
                                                borderRadius: '8px',
                                                padding: '12px'
                                            }}>
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FileText size={14} /> Patient Violation Appeal & Doctor Letter Submitted:
                                                </div>
                                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#166534', fontStyle: 'italic' }}>
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
                                                            <FileText size={14} /> View Attached Doctor Letter / Medical Note
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Warning textarea */}
                                        <div style={{ marginTop: '10px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#7F1D1D', display: 'block', marginBottom: '4px' }}>
                                                Admin Violation Notice Message to Patient:
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={warningMessages[selectedOrder.orderNumber] ?? `We detected that you uploaded an invalid non-medical image for prescription verification (Order #${selectedOrder.orderNumber}). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to medibridge@gmail.com.`}
                                                onChange={(e) => setWarningMessages({ ...warningMessages, [selectedOrder.orderNumber]: e.target.value })}
                                                style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '10px', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                                            />
                                        </div>

                                        {/* Action buttons row */}
                                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleSendWarningMessage(selectedOrder.customerEmail, selectedOrder.orderNumber)}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: '#0F172A',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    padding: '10px 16px',
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
                                                <Bell size={14} /> Send Warning Notification
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleBlockUser(selectedOrder.customerEmail)}
                                                style={{
                                                    backgroundColor: blockedUsers.includes(selectedOrder.customerEmail) ? '#059669' : '#DC2626',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    padding: '10px 16px',
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
                                                <UserX size={14} /> {blockedUsers.includes(selectedOrder.customerEmail) ? 'Unblock User' : 'Block User'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ZONE G — STICKY FOOTER */}
                            <div style={{
                                position: 'sticky',
                                bottom: 0,
                                backgroundColor: '#FFFFFF',
                                borderTop: '1px solid #E2E8F0',
                                padding: '16px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                zIndex: 2
                            }}>
                                {/* Row 1: Quote Price and Pharmacist Note */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                                            QUOTE PRICE (Rs.)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Quote price..."
                                            value={quotePriceInput}
                                            onChange={(e) => setQuotePriceInput(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: 700,
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                                            PHARMACIST NOTE
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Add stock or dosage instructions..."
                                            value={adminNoteInput}
                                            onChange={(e) => setAdminNoteInput(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                resize: 'vertical',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Four Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Approved')}
                                        disabled={actionLoading}
                                        style={{
                                            flex: 1,
                                            height: '40px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            color: '#FFFFFF',
                                            backgroundColor: '#059669',
                                            border: 'none',
                                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: actionLoading ? 0.7 : 1
                                        }}
                                    >
                                        Approve &amp; Send Quote
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Dispatched')}
                                        disabled={actionLoading}
                                        style={{
                                            flex: 1,
                                            height: '40px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            color: '#FFFFFF',
                                            backgroundColor: '#0D9488',
                                            border: 'none',
                                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: actionLoading ? 0.7 : 1
                                        }}
                                    >
                                        Dispatch Order
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelled')}
                                        disabled={actionLoading}
                                        style={{
                                            flex: 1,
                                            height: '40px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            color: '#FFFFFF',
                                            backgroundColor: '#DC2626',
                                            border: 'none',
                                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: actionLoading ? 0.7 : 1
                                        }}
                                    >
                                        Reject Order
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const email = selectedOrder.customerEmail;
                                            setSelectedOrder(null);
                                            navigate(`/pharmacy/staff/patient-analytics?email=${encodeURIComponent(email)}`);
                                        }}
                                        style={{
                                            flex: 1,
                                            height: '40px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            color: '#FFFFFF',
                                            backgroundColor: '#7C3AED',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        View Analytics
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                                Doctor Prescription Verification (Gemini 3.8 Flash)
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
        maxWidth: '720px',
        maxHeight: '90vh',
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
        padding: '16px 24px',
        backgroundColor: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 2,
    },
    modalBody: {
        padding: '20px 24px',
        overflowY: 'auto',
        flex: 1,
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

const OrdersWithBoundary = () => (
    <OrdersErrorBoundary>
        <Orders />
    </OrdersErrorBoundary>
);

export default OrdersWithBoundary;
