import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardPath } from '../../../utils/navigation';
import api from '../../../api/authApi';
import { resolveImageUrl, getImageUrl } from '../../../utils/imageUrl';
import medicineImg from '../../../assets/medicine_capsules.jpg';
import pillBg from '../../../assets/pill.jpg';
import logoImage from '../../../assets/mediz.png';
import ShortDatedWarningModal from '../../../components/modals/ShortDatedWarningModal';
import {
    SELLING_UNITS,
    UnitFieldConfig,
    validateSellingUnitPrice,
    formatSellingUnitPrice,
    validateSellingUnitQty,
    validateCustomUnitName,
    validateMedicineName,
    validateBrandName,
    validateUnitPrice,
    formatUnitPrice,
    validatePillsInCard,
    validateCardPrice,
    formatCardPrice,
    DEFAULT_STORAGE_OPTIONS,
    validateStorageRequirement,
    validateCustomStorageOption,
    validateMedicineVsBrand,
    normalize,
    normalizeMedicineName,
    getBaseName,
    similarity,
    checkDuplicate,
    isDuplicateMedicine,
    formatDate,
    parseDateString,
    isShortDated,
    getShortDatedWarning,
    validateExpiryDate
} from '../../../utils/medicineValidation';
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
        brandName: '',
        categoryId: '',
        sellingUnit: 'PILLS',
        unitPrice: '',
        pillsInCard: '10',
        oneCardPrice: '',
        bottleSize: '',
        volumeMl: '',
        tubeWeight: '',
        sachetsPerBox: '',
        vialsPerBox: '',
        puffsPerInhaler: '',
        pricePerBottle: '',
        pricePerTube: '',
        pricePerSachet: '',
        pricePerVial: '',
        boxPrice: '',
        pricePerInhaler: '',
        unitName: '',
        pricePerUnit: '',
        price: '',
        cardPrice: '',
        pillsPerCard: '10',
        description: '',
        stockQuantity: '',
        expiryDate: '',
        storageCondition: [],
        requiresPrescription: false,
        imageUrl: '',
        additionalImages: []
    });
    const [qtyError, setQtyError] = useState('');
    const [unitPriceError, setUnitPriceError] = useState('');
    const [customNameError, setCustomNameError] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [nameError, setNameError] = useState('');
    const [brandError, setBrandError] = useState('');
    const [priceError, setPriceError] = useState('');
    const [pillsError, setPillsError] = useState('');
    const [cardPriceError, setCardPriceError] = useState('');
    const [storageError, setStorageError] = useState('');
    const [expiryError, setExpiryError] = useState('');
    const [categoryError, setCategoryError] = useState('');
    const [validationErrorModal, setValidationErrorModal] = useState({ show: false, errors: [] });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
    const [isStorageDropdownOpen, setIsStorageDropdownOpen] = useState(false);
    const [customStorageOptions, setCustomStorageOptions] = useState(() => {
        try {
            const saved = localStorage.getItem('custom_storage_options');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isAddStorageModalOpen, setIsAddStorageModalOpen] = useState(false);
    const [newStorageInput, setNewStorageInput] = useState('');
    const [newStorageError, setNewStorageError] = useState('');

    const allStorageOptions = useMemo(() => {
        return [...DEFAULT_STORAGE_OPTIONS, ...customStorageOptions];
    }, [customStorageOptions]);

    const expiryInputRef = useRef(null);
    const [confirmedExpiryDate, setConfirmedExpiryDate] = useState(null);
    const [shortDatedWarningModal, setShortDatedWarningModal] = useState({
        isOpen: false,
        warning: null,
        expiryDate: ''
    });

    const [duplicateModalConfig, setDuplicateModalConfig] = useState({
        show: false,
        title: 'Possible Duplicate Found',
        message: '',
        confirmText: 'Yes, Add Anyway',
        cancelText: 'Cancel',
        type: 'DUPLICATE'
    });
    const [pendingSubmitData, setPendingSubmitData] = useState(null);

    const activeUnitConfig = useMemo(() => {
        return UnitFieldConfig[formData.sellingUnit] || UnitFieldConfig.PILLS;
    }, [formData.sellingUnit]);

    const calculateAutoPrice = (qtyVal, priceVal) => {
        const qtyInt = parseInt(qtyVal, 10);
        const priceFloat = parseFloat(priceVal);
        if (!isNaN(qtyInt) && qtyInt > 0 && !isNaN(priceFloat) && priceFloat > 0) {
            return (qtyInt * priceFloat).toFixed(2);
        }
        return '';
    };

    const handleSellingUnitChange = (newUnit) => {
        setQtyError('');
        setUnitPriceError('');
        setCustomNameError('');

        const newConfig = UnitFieldConfig[newUnit] || UnitFieldConfig.PILLS;
        setFormData(prev => {
            const updated = { ...prev, sellingUnit: newUnit };
            if (newConfig.hasAutoCalc) {
                const qtyVal = updated[newConfig.qtyKey];
                const priceVal = updated[newConfig.priceKey];
                updated[newConfig.autoCalcKey] = calculateAutoPrice(qtyVal, priceVal);
            }
            return updated;
        });
    };

    const handleSellingUnitQtyChange = (e) => {
        const val = e.target.value;
        const config = activeUnitConfig;
        if (config.isCustomName) return;

        setFormData(prev => {
            const updated = { ...prev, [config.qtyKey]: val };
            if (config.hasAutoCalc) {
                updated[config.autoCalcKey] = calculateAutoPrice(val, prev[config.priceKey]);
            }
            return updated;
        });
        if (qtyError) setQtyError('');
    };

    const handleSellingUnitQtyBlur = () => {
        const config = activeUnitConfig;
        if (config.isCustomName) return;
        const val = formData[config.qtyKey];
        const res = validateSellingUnitQty(val, config.qtyErrorMsg, config.qtyMax);
        if (!res.valid) {
            setQtyError(res.error);
        } else {
            setQtyError('');
        }
    };

    const handleSellingUnitPriceChange = (e) => {
        const val = e.target.value;
        const config = activeUnitConfig;
        setFormData(prev => {
            const updated = { ...prev, [config.priceKey]: val };
            if (config.hasAutoCalc) {
                updated[config.autoCalcKey] = calculateAutoPrice(prev[config.qtyKey], val);
            }
            return updated;
        });
        if (unitPriceError) setUnitPriceError('');
    };

    const handleSellingUnitPriceBlur = () => {
        const config = activeUnitConfig;
        const val = formData[config.priceKey];
        const res = validateSellingUnitPrice(val, config.priceLabel.replace(' *', ''));
        if (!res.valid) {
            setUnitPriceError(res.error);
        } else {
            setUnitPriceError('');
            const formatted = formatSellingUnitPrice(val, config.priceLabel.replace(' *', ''));
            setFormData(prev => {
                const updated = { ...prev, [config.priceKey]: formatted };
                if (config.hasAutoCalc) {
                    updated[config.autoCalcKey] = calculateAutoPrice(prev[config.qtyKey], formatted);
                }
                return updated;
            });
        }
    };

    const handleCustomUnitNameChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, unitName: val }));
        if (customNameError) setCustomNameError('');
    };

    const handleCustomUnitNameBlur = () => {
        const res = validateCustomUnitName(formData.unitName);
        if (!res.valid) {
            setCustomNameError(res.error);
        } else {
            setCustomNameError('');
        }
    };

    const handleNameBlur = () => {
        const res = validateMedicineName(formData.name);
        if (!res.valid) {
            setNameError(res.error);
        } else {
            setNameError('');
            if (formData.brandName) {
                const crossRes = validateMedicineVsBrand(formData.name, formData.brandName);
                if (!crossRes.valid) {
                    setBrandError(crossRes.error);
                }
            }
        }
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, name: val }));
        if (nameError) setNameError('');
    };

    const handleBrandBlur = () => {
        const res = validateBrandName(formData.brandName);
        if (!res.valid) {
            setBrandError(res.error);
        } else {
            if (formData.name) {
                const crossRes = validateMedicineVsBrand(formData.name, formData.brandName);
                if (!crossRes.valid) {
                    setBrandError(crossRes.error);
                } else {
                    setBrandError('');
                }
            } else {
                setBrandError('');
            }
        }
    };

    const handleBrandChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, brandName: val }));
        if (brandError) setBrandError('');
    };

    const handlePriceBlur = () => {
        const val = validateUnitPrice(formData.price);
        if (!val.valid) {
            setPriceError(val.error);
        } else {
            setPriceError('');
            const formatted = formatUnitPrice(formData.price);
            setFormData(prev => ({ ...prev, price: formatted }));
        }
    };

    const handlePriceChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, price: val }));
        if (priceError) setPriceError('');
    };

    const handlePillsBlur = () => {
        const val = validatePillsInCard(formData.pillsPerCard);
        if (!val.valid) {
            setPillsError(val.error);
        } else {
            setPillsError('');
        }
    };

    const handlePillsChange = (e) => {
        const val = e.target.value;
        const pillsInt = parseInt(val);
        const unitPriceVal = parseFloat(formData.price);
        setFormData(prev => ({
            ...prev,
            pillsPerCard: val,
            cardPrice: !isNaN(unitPriceVal) && unitPriceVal > 0 && !isNaN(pillsInt) && pillsInt > 0
                ? (unitPriceVal * pillsInt).toFixed(2)
                : prev.cardPrice
        }));
        if (pillsError) setPillsError('');
    };

    const handleCardPriceBlur = () => {
        const val = validateCardPrice(formData.cardPrice);
        if (!val.valid) {
            setCardPriceError(val.error);
        } else {
            setCardPriceError('');
            if (formData.cardPrice) {
                const formatted = formatCardPrice(formData.cardPrice);
                setFormData(prev => ({ ...prev, cardPrice: formatted }));
            }
        }
    };

    const handleCardPriceChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, cardPrice: val }));
        if (cardPriceError) setCardPriceError('');
    };

    const parseStorageConditionForForm = (raw) => {
        if (!raw) return ['room_temp'];
        if (Array.isArray(raw)) return raw;
        const str = String(raw).trim();
        if (!str) return ['room_temp'];

        const parts = str.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        const result = [];

        parts.forEach(part => {
            const lower = part.toLowerCase();
            const exactOpt = DEFAULT_STORAGE_OPTIONS.find(o => o.value === part || o.label === part);
            if (exactOpt) {
                if (!result.includes(exactOpt.value)) result.push(exactOpt.value);
                return;
            }

            if (lower.includes('room') || lower.includes('temp') || lower.includes('room_temp')) {
                if (!result.includes('room_temp')) result.push('room_temp');
            } else if (lower.includes('cool') || lower.includes('dry') || lower.includes('cool_dry')) {
                if (!result.includes('cool_dry')) result.push('cool_dry');
            } else if (lower.includes('refrigerat') || lower.includes('2°c') || lower.includes('8°c')) {
                if (!result.includes('refrigerated')) result.push('refrigerated');
            } else if (lower.includes('freez') || lower.includes('frozen') || lower.includes('-18')) {
                if (!result.includes('frozen')) result.push('frozen');
            } else if (lower.includes('light') || lower.includes('sun')) {
                if (!result.includes('protect_light')) result.push('protect_light');
            } else if (lower.includes('moisture') || lower.includes('water')) {
                if (!result.includes('protect_moist')) result.push('protect_moist');
            } else if (lower.includes('children') || lower.includes('reach')) {
                if (!result.includes('keep_children')) result.push('keep_children');
            } else if (lower.includes('original') || lower.includes('pack') || lower.includes('container')) {
                if (!result.includes('original_pack')) result.push('original_pack');
            } else {
                result.push(part);
            }
        });

        return result.length > 0 ? result : ['room_temp'];
    };

    const handleEditMedicine = (med) => {
        let extraImgs = [];
        try {
            if (med.additionalImagesJson) {
                extraImgs = JSON.parse(med.additionalImagesJson);
            }
        } catch (e) { }

        const editSellingUnit = med.sellingUnit || 'PILLS';
        const priceValStr = med.price !== undefined && med.price !== null ? String(med.price) : '';
        const cardPriceValStr = med.cardPrice !== undefined && med.cardPrice !== null ? String(med.cardPrice) : '';
        const pillsValStr = med.pillsPerCard !== undefined && med.pillsPerCard !== null ? String(med.pillsPerCard) : '10';

        setNameError('');
        setBrandError('');
        setPriceError('');
        setPillsError('');
        setCardPriceError('');
        setQtyError('');
        setUnitPriceError('');
        setCustomNameError('');
        setStorageError('');
        setExpiryError('');

        setFormData({
            name: med.name || '',
            brandName: med.brandName || '',
            categoryId: med.categoryId ? String(med.categoryId) : '',
            sellingUnit: editSellingUnit,
            unitPrice: med.pricePerUnit ? String(med.pricePerUnit) : priceValStr,
            pillsInCard: pillsValStr,
            oneCardPrice: cardPriceValStr,
            bottleSize: med.bottleSize ? String(med.bottleSize) : '',
            volumeMl: med.volumeMl ? String(med.volumeMl) : '',
            tubeWeight: med.tubeWeight ? String(med.tubeWeight) : '',
            sachetsPerBox: med.sachetsPerBox ? String(med.sachetsPerBox) : '',
            vialsPerBox: med.vialsPerBox ? String(med.vialsPerBox) : '',
            puffsPerInhaler: med.puffsPerInhaler ? String(med.puffsPerInhaler) : '',
            pricePerBottle: med.pricePerBottle ? String(med.pricePerBottle) : priceValStr,
            pricePerTube: med.pricePerTube ? String(med.pricePerTube) : priceValStr,
            pricePerSachet: med.pricePerSachet ? String(med.pricePerSachet) : priceValStr,
            pricePerVial: med.pricePerVial ? String(med.pricePerVial) : priceValStr,
            boxPrice: med.boxPrice ? String(med.boxPrice) : cardPriceValStr,
            pricePerInhaler: med.pricePerInhaler ? String(med.pricePerInhaler) : priceValStr,
            unitName: med.unitName || '',
            pricePerUnit: med.pricePerUnit ? String(med.pricePerUnit) : priceValStr,
            price: priceValStr,
            cardPrice: cardPriceValStr,
            pillsPerCard: pillsValStr,
            description: med.description || '',
            stockQuantity: med.stockQuantity !== undefined && med.stockQuantity !== null ? String(med.stockQuantity) : '',
            expiryDate: med.expiryDate?.split('T')[0] || '',
            storageCondition: parseStorageConditionForForm(med.storageCondition),
            requiresPrescription: med.requiresPrescription || false,
            imageUrl: med.imageUrl || '',
            additionalImages: Array.isArray(extraImgs) ? extraImgs : []
        });

        const existingExpStr = med.expiryDate?.split('T')[0] || '';
        setConfirmedExpiryDate(existingExpStr);
        setEditingId(med.id);
        setShowForm(true);
    };

    const handleStorageBlur = () => {
        const val = validateStorageRequirement(formData.storageCondition);
        if (!val.valid) {
            setStorageError(val.error);
        } else {
            setStorageError('');
        }
    };

    const handleToggleStorageOption = (optionValue) => {
        setFormData(prev => {
            const current = Array.isArray(prev.storageCondition)
                ? prev.storageCondition
                : prev.storageCondition ? [prev.storageCondition] : [];
            let updated;
            if (current.includes(optionValue)) {
                updated = current.filter(v => v !== optionValue);
            } else {
                updated = [...current, optionValue];
            }
            if (storageError && updated.length > 0) {
                setStorageError('');
            }
            return { ...prev, storageCondition: updated };
        });
    };

    const handleSaveCustomStorage = () => {
        const valRes = validateCustomStorageOption(newStorageInput, allStorageOptions);
        if (!valRes.valid) {
            setNewStorageError(valRes.error);
            return;
        }
        const trimmed = newStorageInput.trim();
        const newOption = {
            value: 'custom_' + Date.now(),
            label: `💾 ${trimmed}`,
            isCustom: true
        };
        const updated = [...customStorageOptions, newOption];
        setCustomStorageOptions(updated);
        try {
            localStorage.setItem('custom_storage_options', JSON.stringify(updated));
        } catch (err) {
            console.error('Failed to save custom storage options to localStorage:', err);
        }
        setFormData(prev => {
            const current = Array.isArray(prev.storageCondition)
                ? prev.storageCondition
                : prev.storageCondition ? [prev.storageCondition] : [];
            return { ...prev, storageCondition: [...current, newOption.value] };
        });
        setStorageError('');
        setIsAddStorageModalOpen(false);
        setNewStorageInput('');
        setNewStorageError('');
        showToastMessage('Storage option added & selected.', 'success');
    };

    const handleDeleteCustomStorage = (optionValue, e) => {
        if (e) e.stopPropagation();
        const updated = customStorageOptions.filter(opt => opt.value !== optionValue);
        setCustomStorageOptions(updated);
        try {
            localStorage.setItem('custom_storage_options', JSON.stringify(updated));
        } catch (err) {
            console.error('Failed to update custom storage options in localStorage:', err);
        }
        setFormData(prev => {
            const current = Array.isArray(prev.storageCondition)
                ? prev.storageCondition
                : prev.storageCondition ? [prev.storageCondition] : [];
            return {
                ...prev,
                storageCondition: current.filter(v => v !== optionValue)
            };
        });
        showToastMessage('Storage option removed.', 'info');
    };

    const handleExpiryBlur = () => {
        if (!formData.expiryDate) {
            setExpiryError('Expiry date is required.');
            return;
        }
        const val = validateExpiryDate(formData.expiryDate);
        if (!val.valid) {
            setExpiryError(val.error);
        } else {
            setExpiryError('');
        }
    };

    const handleSelectCalendarDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const formattedISO = `${year}-${month}-${day}`;

        setIsCalendarOpen(false);

        const val = validateExpiryDate(formattedISO);
        if (!val.valid) {
            setExpiryError(val.error);
            setFormData(prev => ({ ...prev, expiryDate: formattedISO }));
            return;
        }

        setExpiryError('');
        const warningObj = getShortDatedWarning(formattedISO);
        if (warningObj && confirmedExpiryDate !== formattedISO) {
            setShortDatedWarningModal({
                isOpen: true,
                warning: warningObj,
                expiryDate: formattedISO
            });
        } else {
            setFormData(prev => ({ ...prev, expiryDate: formattedISO }));
            setConfirmedExpiryDate(formattedISO);
        }
    };

    const getCalendarDays = (year, month) => {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const days = [];

        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, daysInPrevMonth - i);
            days.push({ date: d, isCurrentMonth: false });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            days.push({ date: d, isCurrentMonth: true });
        }

        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            days.push({ date: d, isCurrentMonth: false });
        }

        return days;
    };

    const isDateDisabled = (dateObj) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxDate = new Date(today);
        maxDate.setFullYear(maxDate.getFullYear() + 10);

        const checkDate = new Date(dateObj);
        checkDate.setHours(0, 0, 0, 0);

        return checkDate < today || checkDate > maxDate;
    };

    const isToday = (dateObj) => {
        const today = new Date();
        return (
            dateObj.getDate() === today.getDate() &&
            dateObj.getMonth() === today.getMonth() &&
            dateObj.getFullYear() === today.getFullYear()
        );
    };

    const isSameDate = (dateObj, targetDateStr) => {
        if (!targetDateStr) return false;
        const parsed = parseDateString(targetDateStr);
        if (!parsed) return false;
        return (
            dateObj.getDate() === parsed.getDate() &&
            dateObj.getMonth() === parsed.getMonth() &&
            dateObj.getFullYear() === parsed.getFullYear()
        );
    };

    const handleImageFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file is an image
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (JPG, PNG, JPEG, WEBP, GIF)');
            return;
        }

        // Size warning for files > 5MB
        if (file.size > 5 * 1024 * 1024) {
            const proceed = window.confirm(
                'This image is larger than 5MB. It may slow down the app. Continue?'
            );
            if (!proceed) return;
        }

        setUploadingImage(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, imageUrl: reader.result }));
            setUploadingImage(false);
            showToastMessage('Main medicine image uploaded!', 'success');
        };
        reader.onerror = () => {
            setUploadingImage(false);
            showToastMessage('Failed to read image file.', 'error');
        };
        reader.readAsDataURL(file);
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

    const handleSubmit = async (e, forceAdd = false) => {
        if (e && e.preventDefault) e.preventDefault();

        // Rule 1: Trim leading/trailing spaces before validation and saving
        const trimmedName = (formData.name || '').trim();
        const trimmedBrand = (formData.brandName || '').trim();

        const preparedFormData = {
            ...formData,
            name: trimmedName,
            brandName: trimmedBrand
        };

        const validationErrors = [];

        // 1. Validate Medicine Name field
        const medVal = validateMedicineName(trimmedName);
        if (!medVal.valid) {
            setNameError(medVal.error);
            validationErrors.push({ field: 'Medicine Name', error: medVal.error });
        } else {
            setNameError('');
        }

        // 2. Validate Brand Name field
        const brandVal = validateBrandName(trimmedBrand);
        if (!brandVal.valid) {
            setBrandError(brandVal.error);
            validationErrors.push({ field: 'Brand Name', error: brandVal.error });
        } else {
            setBrandError('');
        }

        // 3. Category Validation
        if (!formData.categoryId) {
            setCategoryError('Please select a therapeutic category.');
            validationErrors.push({ field: 'Category', error: 'Please select a therapeutic category.' });
        } else {
            setCategoryError('');
        }

        // 4. Validate Selling Unit Fields
        const unitConfig = UnitFieldConfig[formData.sellingUnit] || UnitFieldConfig.PILLS;
        if (unitConfig.isCustomName) {
            const customVal = validateCustomUnitName(formData.unitName);
            if (!customVal.valid) {
                setCustomNameError(customVal.error);
                validationErrors.push({ field: 'Custom Unit Name', error: customVal.error });
            } else {
                setCustomNameError('');
            }
        } else {
            const qtyVal = validateSellingUnitQty(formData[unitConfig.qtyKey], unitConfig.qtyErrorMsg, unitConfig.qtyMax);
            if (!qtyVal.valid) {
                setQtyError(qtyVal.error);
                validationErrors.push({ field: unitConfig.qtyLabel.replace(' *', ''), error: qtyVal.error });
            } else {
                setQtyError('');
            }
        }

        // 5. Unit Price Validation
        const priceVal = validateSellingUnitPrice(formData[unitConfig.priceKey], unitConfig.priceLabel.replace(' *', ''));
        if (!priceVal.valid) {
            setUnitPriceError(priceVal.error);
            validationErrors.push({ field: unitConfig.priceLabel.replace(' *', ''), error: priceVal.error });
        } else {
            setUnitPriceError('');
        }

        // 6. Validate Storage Requirement field
        const storageVal = validateStorageRequirement(formData.storageCondition);
        if (!storageVal.valid) {
            setStorageError(storageVal.error);
            validationErrors.push({ field: 'Storage Requirement', error: storageVal.error });
        } else {
            setStorageError('');
        }

        // 7. Validate Expiry Date field
        const expiryVal = validateExpiryDate(formData.expiryDate);
        if (!expiryVal.valid) {
            setExpiryError(expiryVal.error);
            validationErrors.push({ field: 'Expiry Date', error: expiryVal.error });
        } else {
            setExpiryError('');
        }

        // 8. Cross-Field Validation (Rule 6 & Rule 8)
        if (medVal.valid && brandVal.valid) {
            const crossVal = validateMedicineVsBrand(trimmedName, trimmedBrand);
            if (!crossVal.valid) {
                setBrandError(crossVal.error);
                validationErrors.push({ field: 'Brand Name', error: crossVal.error });
            }
        }

        // 🚨 IF MISTAKES OR MISSING FIELDS EXIST -> POP UP RED ERROR MODAL & BLOCK SUBMIT!
        if (validationErrors.length > 0) {
            setValidationErrorModal({ show: true, errors: validationErrors });
            showToastMessage(`Form Submission Blocked: ${validationErrors.length} error(s) found.`, 'error');
            return;
        }

        setValidationErrorModal({ show: false, errors: [] });

        // Soft Warning for Short Expiry (Tiers 1, 2, 3)
        const shortDatedWarnObj = getShortDatedWarning(formData.expiryDate);
        if (shortDatedWarnObj && confirmedExpiryDate !== formData.expiryDate && !forceAdd) {
            setPendingSubmitData(preparedFormData);
            setShortDatedWarningModal({
                isOpen: true,
                warning: shortDatedWarnObj,
                expiryDate: formData.expiryDate
            });
            return;
        }

        // Soft Warning for Cross-Field Near Match (Rule 8)
        const crossVal = validateMedicineVsBrand(trimmedName, trimmedBrand);
        if (crossVal.warning && !forceAdd) {
            setPendingSubmitData(preparedFormData);
            setDuplicateModalConfig({
                show: true,
                title: 'Similar Names Warning',
                message: crossVal.warning,
                confirmText: 'Continue',
                cancelText: 'Cancel',
            });
            return;
        }

        // 5. Duplicate Check (Part 3)
        if (!forceAdd) {
            const dupResult = checkDuplicate(preparedFormData, medicines, editingId);

            if (dupResult.type === 'DUPLICATE') {
                // Level 1: Exact Duplicate -> HARD BLOCK
                showToastMessage(dupResult.error || 'This medicine already exists in inventory (same name + same brand).', 'error');
                return;
            }

            if (dupResult.type === 'NEAR_DUPLICATE') {
                // Level 2: Near Duplicate -> SOFT WARNING Modal
                setPendingSubmitData(preparedFormData);
                setDuplicateModalConfig({
                    show: true,
                    title: 'Possible Duplicate Found',
                    message: dupResult.warning || 'This looks similar to an existing entry. Add anyway?',
                    confirmText: 'Yes, Add Anyway',
                    cancelText: 'Cancel',
                    type: 'NEAR_DUPLICATE'
                });
                return;
            }
        }

        setSubmitting(true);
        setDuplicateModalConfig(prev => ({ ...prev, show: false }));
        setPendingSubmitData(null);

        try {
            const unitCfg = UnitFieldConfig[preparedFormData.sellingUnit] || UnitFieldConfig.PILLS;
            const formattedUnitPriceStr = formatSellingUnitPrice(preparedFormData[unitCfg.priceKey], unitCfg.priceLabel.replace(' *', ''));
            const unitPriceNum = parseFloat(formattedUnitPriceStr) || 0;
            const qtyNum = unitCfg.isCustomName ? 1 : (parseInt(preparedFormData[unitCfg.qtyKey], 10) || 1);
            const autoCalcNum = unitCfg.hasAutoCalc ? (parseFloat(preparedFormData[unitCfg.autoCalcKey]) || (unitPriceNum * qtyNum)) : unitPriceNum;

            // BUG FIX 1: storageCondition must be a STRING for the backend C# DTO.
            // The form stores it as an array — join it to a clean string.
            const storageConditionStr = Array.isArray(preparedFormData.storageCondition)
                ? preparedFormData.storageCondition.join(', ')
                : (preparedFormData.storageCondition || 'Normal Room Temperature');

            // BUG FIX 2: Use the exact field names the backend C# DTO expects.
            // pillsPerCard (NOT pillsInCard), cardPrice (NOT oneCardPrice).
            const pillsPerCardNum = preparedFormData.sellingUnit === 'PILLS' ? qtyNum : 10;
            const cardPriceNum = preparedFormData.sellingUnit === 'PILLS' ? autoCalcNum : unitPriceNum;

            const parsedStock = parseInt(preparedFormData.stockQuantity, 10);
            const stockQtyNum = isNaN(parsedStock) ? 0 : Math.max(0, parsedStock);

            let isoExpiry = new Date().toISOString();
            try {
                const parsedExp = parseDateString(preparedFormData.expiryDate) || new Date(preparedFormData.expiryDate);
                if (parsedExp && !isNaN(parsedExp.getTime())) {
                    isoExpiry = parsedExp.toISOString();
                }
            } catch (e) { }

            const data = {
                // Core required fields
                name: preparedFormData.name,
                brandName: preparedFormData.brandName,
                categoryId: parseInt(preparedFormData.categoryId) || 1,
                description: preparedFormData.description || '',
                price: unitPriceNum,
                pillsPerCard: pillsPerCardNum,
                cardPrice: cardPriceNum,
                stockQuantity: stockQtyNum,
                expiryDate: isoExpiry,
                storageCondition: storageConditionStr,
                requiresPrescription: !!preparedFormData.requiresPrescription,
                imageUrl: preparedFormData.imageUrl || null,
                additionalImagesJson: JSON.stringify(preparedFormData.additionalImages || []),

                // Flexible Selling Unit fields
                sellingUnit: preparedFormData.sellingUnit,
                bottleSize: preparedFormData.sellingUnit === 'BOTTLE' ? qtyNum : null,
                volumeMl: preparedFormData.sellingUnit === 'DROPS' ? qtyNum : null,
                tubeWeight: preparedFormData.sellingUnit === 'TUBE' ? qtyNum : null,
                sachetsPerBox: preparedFormData.sellingUnit === 'SACHET' ? qtyNum : null,
                vialsPerBox: preparedFormData.sellingUnit === 'VIAL' ? qtyNum : null,
                puffsPerInhaler: preparedFormData.sellingUnit === 'INHALER' ? qtyNum : null,
                pricePerBottle: (preparedFormData.sellingUnit === 'BOTTLE' || preparedFormData.sellingUnit === 'DROPS') ? unitPriceNum : null,
                pricePerTube: preparedFormData.sellingUnit === 'TUBE' ? unitPriceNum : null,
                pricePerSachet: preparedFormData.sellingUnit === 'SACHET' ? unitPriceNum : null,
                pricePerVial: preparedFormData.sellingUnit === 'VIAL' ? unitPriceNum : null,
                boxPrice: (preparedFormData.sellingUnit === 'SACHET' || preparedFormData.sellingUnit === 'VIAL') ? autoCalcNum : null,
                pricePerInhaler: preparedFormData.sellingUnit === 'INHALER' ? unitPriceNum : null,
                unitName: preparedFormData.sellingUnit === 'CUSTOM' ? preparedFormData.unitName : null,
                pricePerUnit: preparedFormData.sellingUnit === 'CUSTOM' ? unitPriceNum : null,
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
            // BUG FIX 3: Don't silently absorb API errors — show the real error to the admin.
            // The old code would fakesuccessfully-save to local state when the DB actually rejected
            // the request (e.g. 400 Bad Request), meaning patients never see the medicine.
            console.error('Medicine save API error:', error);
            const errMsg = getErrorMessage(error, 'Failed to save medicine. Please check your input and try again.');
            showToastMessage(errMsg, 'error');
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
            brandName: '',
            categoryId: '',
            sellingUnit: 'PILLS',
            unitPrice: '',
            pillsInCard: '10',
            oneCardPrice: '',
            bottleSize: '',
            volumeMl: '',
            tubeWeight: '',
            sachetsPerBox: '',
            vialsPerBox: '',
            puffsPerInhaler: '',
            pricePerBottle: '',
            pricePerTube: '',
            pricePerSachet: '',
            pricePerVial: '',
            boxPrice: '',
            pricePerInhaler: '',
            unitName: '',
            pricePerUnit: '',
            price: '',
            cardPrice: '',
            pillsPerCard: '10',
            description: '',
            stockQuantity: '',
            expiryDate: '',
            storageCondition: [],
            requiresPrescription: false,
            imageUrl: '',
            additionalImages: []
        });
        setNameError('');
        setBrandError('');
        setQtyError('');
        setUnitPriceError('');
        setCustomNameError('');
        setPriceError('');
        setPillsError('');
        setCardPriceError('');
        setStorageError('');
        setExpiryError('');
        setCategoryError('');
        setValidationErrorModal({ show: false, errors: [] });
        setIsCalendarOpen(false);
        setIsStorageDropdownOpen(false);
        setConfirmedExpiryDate(null);
        setShortDatedWarningModal({ isOpen: false, warning: null, expiryDate: '' });
        setDuplicateModalConfig({
            show: false,
            title: 'Possible Duplicate Found',
            message: '',
            confirmText: 'Yes, Add Anyway',
            cancelText: 'Cancel',
            type: 'DUPLICATE'
        });
        setPendingSubmitData(null);
        setEditingId(null);
        setShowForm(false);
    };

    const handleConfirmShortDatedModal = () => {
        const targetDate = shortDatedWarningModal.expiryDate || formData.expiryDate;
        setFormData(prev => ({ ...prev, expiryDate: targetDate }));
        setConfirmedExpiryDate(targetDate);
        setExpiryError('');
        setShortDatedWarningModal({ isOpen: false, warning: null, expiryDate: '' });
    };

    const handleCancelShortDatedModal = () => {
        setShortDatedWarningModal({ isOpen: false, warning: null, expiryDate: '' });
        setPendingSubmitData(null);
        setTimeout(() => {
            if (expiryInputRef.current) {
                expiryInputRef.current.focus();
            }
        }, 50);
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
                                <h1 style={styles.logoTitle}>MEDICINE INVENTORY</h1>
                                <p style={styles.logoSubtitle}>Product Catalog & Stock Management</p>
                            </div>
                        </Link>
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
                    <div style={{
                        ...styles.heroCard,
                        backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.48) 50%, rgba(0, 0, 0, 0.20) 100%), url(${pillBg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}>
                        <div style={styles.heroText}>
                            <span style={{
                                ...styles.heroTag,
                                backdropFilter: 'blur(6px)',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
                            }}>
                                <Sparkles size={13} color="#A7F3D0" /> Active Formulary
                            </span>
                            <h2 style={{
                                ...styles.heroTitle,
                                textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
                                color: '#FFFFFF',
                                fontSize: '24px',
                                letterSpacing: '-0.3px'
                            }}>
                                Pharmaceutical Catalog
                            </h2>
                            <p style={{
                                ...styles.heroSub,
                                textShadow: '0 1px 5px rgba(0, 0, 0, 0.85)',
                                color: '#F8FAFC',
                                fontWeight: 500
                            }}>
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
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
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
                                            onChange={handleNameChange}
                                            onBlur={handleNameBlur}
                                            aria-invalid={!!nameError}
                                            style={{
                                                ...styles.input,
                                                borderColor: nameError ? '#EF4444' : '#E2E8F0',
                                                backgroundColor: nameError ? '#FEF2F2' : '#FFFFFF'
                                            }}
                                        />
                                        {nameError && (
                                            <div style={{
                                                color: '#DC2626',
                                                fontSize: '12px',
                                                marginTop: '5px',
                                                fontWeight: 600
                                            }}>
                                                {nameError}
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>BRAND / MANUFACTURER NAME *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CIPLA LABORATORIES"
                                            value={formData.brandName}
                                            onChange={handleBrandChange}
                                            onBlur={handleBrandBlur}
                                            aria-invalid={!!brandError}
                                            style={{
                                                ...styles.input,
                                                borderColor: brandError ? '#EF4444' : '#E2E8F0',
                                                backgroundColor: brandError ? '#FEF2F2' : '#FFFFFF'
                                            }}
                                        />
                                        {brandError && (
                                            <div style={{
                                                color: '#DC2626',
                                                fontSize: '12px',
                                                marginTop: '5px',
                                                fontWeight: 600
                                            }}>
                                                {brandError}
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>CATEGORY *</label>
                                        <select
                                            value={formData.categoryId}
                                            onChange={(e) => {
                                                setFormData({ ...formData, categoryId: e.target.value });
                                                if (e.target.value) setCategoryError('');
                                            }}
                                            aria-invalid={!!categoryError}
                                            style={{
                                                ...styles.input,
                                                borderColor: categoryError ? '#EF4444' : '#E2E8F0',
                                                backgroundColor: categoryError ? '#FEF2F2' : '#FFFFFF'
                                            }}
                                        >
                                            <option value="">Select therapeutic category</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                        {categoryError && (
                                            <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px', fontWeight: 600 }}>
                                                ⚠️ {categoryError}
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.formGroupFull}>
                                        <label style={{ ...styles.formLabel, color: '#0F172A', fontWeight: 800 }}>SELLING UNIT *</label>
                                        <select
                                            value={formData.sellingUnit}
                                            onChange={(e) => handleSellingUnitChange(e.target.value)}
                                            style={{ ...styles.input, backgroundColor: '#FFFFFF', fontWeight: 700, color: '#0F172A' }}
                                        >
                                            {SELLING_UNITS.map(unit => (
                                                <option key={unit.value} value={unit.value}>
                                                    {unit.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Dynamic Selling Unit Fields */}
                                    {activeUnitConfig.isCustomName ? (
                                        <div style={styles.formGroup}>
                                            <label style={styles.formLabel}>UNIT NAME *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., Strip, Packet, Box"
                                                value={formData.unitName || ''}
                                                onChange={handleCustomUnitNameChange}
                                                onBlur={handleCustomUnitNameBlur}
                                                aria-invalid={!!customNameError}
                                                style={{
                                                    ...styles.input,
                                                    borderColor: customNameError ? '#EF4444' : '#E2E8F0',
                                                    backgroundColor: customNameError ? '#FEF2F2' : '#FFFFFF'
                                                }}
                                            />
                                            {customNameError && (
                                                <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px', fontWeight: 600 }}>
                                                    {customNameError}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={styles.formGroup}>
                                            <label style={styles.formLabel}>{activeUnitConfig.qtyLabel}</label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                max={activeUnitConfig.qtyMax}
                                                inputMode="numeric"
                                                placeholder={activeUnitConfig.qtyPlaceholder}
                                                value={formData[activeUnitConfig.qtyKey] || ''}
                                                onChange={handleSellingUnitQtyChange}
                                                onBlur={handleSellingUnitQtyBlur}
                                                aria-invalid={!!qtyError}
                                                style={{
                                                    ...styles.input,
                                                    borderColor: qtyError ? '#EF4444' : '#E2E8F0',
                                                    backgroundColor: qtyError ? '#FEF2F2' : '#FFFFFF'
                                                }}
                                            />
                                            {qtyError && (
                                                <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px', fontWeight: 600 }}>
                                                    {qtyError}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>{activeUnitConfig.priceLabel}</label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: '12px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                color: '#64748B',
                                                pointerEvents: 'none',
                                                userSelect: 'none'
                                            }}>
                                                Rs.
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder={activeUnitConfig.pricePlaceholder}
                                                value={formData[activeUnitConfig.priceKey] || ''}
                                                onChange={handleSellingUnitPriceChange}
                                                onBlur={handleSellingUnitPriceBlur}
                                                aria-invalid={!!unitPriceError}
                                                style={{
                                                    ...styles.input,
                                                    paddingLeft: '38px',
                                                    borderColor: unitPriceError ? '#EF4444' : '#E2E8F0',
                                                    backgroundColor: unitPriceError ? '#FEF2F2' : '#FFFFFF'
                                                }}
                                            />
                                        </div>
                                        {unitPriceError && (
                                            <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px', fontWeight: 600 }}>
                                                {unitPriceError}
                                            </div>
                                        )}
                                    </div>

                                    {activeUnitConfig.hasAutoCalc && (
                                        <div style={styles.formGroup}>
                                            <label style={styles.formLabel}>{activeUnitConfig.autoCalcLabel}</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    left: '12px',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    color: '#64748B',
                                                    pointerEvents: 'none',
                                                    userSelect: 'none'
                                                }}>
                                                    Rs.
                                                </span>
                                                <input
                                                    type="text"
                                                    placeholder="Auto-calculated price"
                                                    value={formData[activeUnitConfig.autoCalcKey] || ''}
                                                    readOnly
                                                    style={{
                                                        ...styles.input,
                                                        paddingLeft: '38px',
                                                        backgroundColor: '#F1F5F9',
                                                        cursor: 'not-allowed',
                                                        color: '#475569',
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>STORAGE REQUIREMENT *</label>
                                        <div style={{ position: 'relative' }}>
                                            {/* Trigger Box */}
                                            <div
                                                tabIndex={0}
                                                onBlur={(e) => {
                                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                                        handleStorageBlur();
                                                    }
                                                }}
                                                style={{
                                                    ...styles.input,
                                                    minHeight: '44px',
                                                    height: 'auto',
                                                    padding: '6px 12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    flexWrap: 'wrap',
                                                    gap: '6px',
                                                    cursor: 'pointer',
                                                    borderColor: storageError ? '#EF4444' : isStorageDropdownOpen ? '#059669' : '#E2E8F0',
                                                    backgroundColor: storageError ? '#FEF2F2' : '#FFFFFF',
                                                    boxShadow: isStorageDropdownOpen ? '0 0 0 3px rgba(5, 150, 105, 0.15)' : 'none'
                                                }}
                                                onClick={() => setIsStorageDropdownOpen(!isStorageDropdownOpen)}
                                            >
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1 }}>
                                                    {Array.isArray(formData.storageCondition) && formData.storageCondition.length > 0 ? (
                                                        formData.storageCondition.map(val => {
                                                            const opt = allStorageOptions.find(o => o.value === val);
                                                            const label = opt ? opt.label : val;
                                                            return (
                                                                <span
                                                                    key={val}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        backgroundColor: '#ECFDF5',
                                                                        color: '#065F46',
                                                                        border: '1px solid #A7F3D0',
                                                                        borderRadius: '6px',
                                                                        padding: '3px 8px',
                                                                        fontSize: '12px',
                                                                        fontWeight: 600
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleToggleStorageOption(val);
                                                                    }}
                                                                >
                                                                    {label}
                                                                    <span style={{ cursor: 'pointer', color: '#047857', fontWeight: 700 }}>✕</span>
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span style={{ color: '#94A3B8', fontSize: '13px' }}>Select storage requirement(s)...</span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '8px' }}>
                                                    {isStorageDropdownOpen ? '▲' : '▼'}
                                                </span>
                                            </div>

                                            {/* Options Panel Dropdown */}
                                            {isStorageDropdownOpen && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                                    maxHeight: '260px',
                                                    overflowY: 'auto',
                                                    zIndex: 9999,
                                                    padding: '6px 0'
                                                }}>
                                                    {allStorageOptions.map((opt) => {
                                                        const isChecked = Array.isArray(formData.storageCondition) && formData.storageCondition.includes(opt.value);
                                                        return (
                                                            <div
                                                                key={opt.value}
                                                                onClick={() => handleToggleStorageOption(opt.value)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '10px',
                                                                    padding: '8px 14px',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: isChecked ? '#F0FDF4' : 'transparent',
                                                                    transition: 'background-color 0.15s',
                                                                    fontSize: '13px',
                                                                    fontWeight: isChecked ? 600 : 400,
                                                                    color: isChecked ? '#065F46' : '#1E293B'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isChecked) e.currentTarget.style.backgroundColor = '#F8FAFC';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => { }}
                                                                        style={{ accentColor: '#059669', cursor: 'pointer' }}
                                                                    />
                                                                    <span style={{ flex: 1 }}>
                                                                        {opt.label} {opt.isCustom ? <span style={{ fontSize: '11px', color: '#64748B' }}>[Custom]</span> : ''}
                                                                    </span>
                                                                </div>

                                                                {opt.isCustom && (
                                                                    <button
                                                                        type="button"
                                                                        title="Remove custom storage option"
                                                                        onClick={(e) => handleDeleteCustomStorage(opt.value, e)}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            color: '#94A3B8',
                                                                            fontSize: '14px',
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            transition: 'color 0.15s, background-color 0.15s'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.color = '#EF4444';
                                                                            e.currentTarget.style.backgroundColor = '#FEF2F2';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.color = '#94A3B8';
                                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                                        }}
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '4px', paddingTop: '4px' }}>
                                                        <div
                                                            onClick={() => {
                                                                setIsStorageDropdownOpen(false);
                                                                setIsAddStorageModalOpen(true);
                                                                setNewStorageInput('');
                                                                setNewStorageError('');
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '8px 14px',
                                                                cursor: 'pointer',
                                                                color: '#059669',
                                                                fontWeight: 700,
                                                                fontSize: '13px',
                                                                backgroundColor: '#ECFDF5'
                                                            }}
                                                        >
                                                            ➕ Add New Storage Option...
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {storageError && (
                                            <div style={{
                                                color: '#DC2626',
                                                fontSize: '12px',
                                                marginTop: '5px',
                                                fontWeight: 600
                                            }}>
                                                {storageError}
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>EXPIRY DATE *</label>
                                        <div style={{ position: 'relative' }}>
                                            {/* Input Trigger Box */}
                                            <div
                                                ref={expiryInputRef}
                                                tabIndex={0}
                                                onBlur={(e) => {
                                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                                        handleExpiryBlur();
                                                    }
                                                }}
                                                style={{
                                                    ...styles.input,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer',
                                                    borderColor: expiryError ? '#EF4444' : isCalendarOpen ? '#059669' : '#E2E8F0',
                                                    backgroundColor: expiryError ? '#FEF2F2' : '#FFFFFF',
                                                    boxShadow: isCalendarOpen ? '0 0 0 3px rgba(5, 150, 105, 0.15)' : 'none'
                                                }}
                                                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                            >
                                                <span style={{ color: formData.expiryDate ? '#0F172A' : '#94A3B8', fontWeight: formData.expiryDate ? 600 : 400 }}>
                                                    {formData.expiryDate ? formatDate(formData.expiryDate) : 'mm/dd/yyyy'}
                                                </span>
                                                <span style={{ fontSize: '16px', userSelect: 'none' }}>📅</span>
                                            </div>

                                            {/* Custom Calendar Popover Component */}
                                            {isCalendarOpen && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    marginTop: '6px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                                    padding: '16px',
                                                    zIndex: 99999,
                                                    width: '300px',
                                                    userSelect: 'none'
                                                }}>
                                                    {/* Header Navigation Controls */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '12px'
                                                    }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const prevMonth = new Date(calendarViewDate);
                                                                prevMonth.setMonth(prevMonth.getMonth() - 1);
                                                                setCalendarViewDate(prevMonth);
                                                            }}
                                                            style={{
                                                                background: '#F1F5F9',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                width: '28px',
                                                                height: '28px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: '#475569',
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            ←
                                                        </button>

                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            {/* Month Selector */}
                                                            <select
                                                                value={calendarViewDate.getMonth()}
                                                                onChange={(e) => {
                                                                    const newDate = new Date(calendarViewDate);
                                                                    newDate.setMonth(parseInt(e.target.value));
                                                                    setCalendarViewDate(newDate);
                                                                }}
                                                                style={{
                                                                    border: '1px solid #CBD5E1',
                                                                    borderRadius: '6px',
                                                                    padding: '3px 6px',
                                                                    fontSize: '13px',
                                                                    fontWeight: 600,
                                                                    color: '#0F172A',
                                                                    backgroundColor: '#F8FAFC',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                                                                    <option key={m} value={idx}>{m}</option>
                                                                ))}
                                                            </select>

                                                            {/* Year Selector */}
                                                            <select
                                                                value={calendarViewDate.getFullYear()}
                                                                onChange={(e) => {
                                                                    const newDate = new Date(calendarViewDate);
                                                                    newDate.setFullYear(parseInt(e.target.value));
                                                                    setCalendarViewDate(newDate);
                                                                }}
                                                                style={{
                                                                    border: '1px solid #CBD5E1',
                                                                    borderRadius: '6px',
                                                                    padding: '3px 6px',
                                                                    fontSize: '13px',
                                                                    fontWeight: 600,
                                                                    color: '#0F172A',
                                                                    backgroundColor: '#F8FAFC',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                                                                    <option key={y} value={y}>{y}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const nextMonth = new Date(calendarViewDate);
                                                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                                                setCalendarViewDate(nextMonth);
                                                            }}
                                                            style={{
                                                                background: '#F1F5F9',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                width: '28px',
                                                                height: '28px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: '#475569',
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            →
                                                        </button>
                                                    </div>

                                                    {/* Days of Week Header */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '11px',
                                                        color: '#64748B',
                                                        marginBottom: '6px'
                                                    }}>
                                                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                                                    </div>

                                                    {/* Grid of Days */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                                        gap: '3px'
                                                    }}>
                                                        {getCalendarDays(calendarViewDate.getFullYear(), calendarViewDate.getMonth()).map((cell, idx) => {
                                                            const disabled = isDateDisabled(cell.date);
                                                            const today = isToday(cell.date);
                                                            const selected = isSameDate(cell.date, formData.expiryDate);

                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    disabled={disabled}
                                                                    onClick={() => !disabled && handleSelectCalendarDate(cell.date)}
                                                                    style={{
                                                                        height: '32px',
                                                                        border: selected ? 'none' : today ? '1.5px solid #059669' : 'none',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: selected
                                                                            ? '#059669'
                                                                            : disabled
                                                                                ? '#F1F5F9'
                                                                                : 'transparent',
                                                                        color: selected
                                                                            ? '#FFFFFF'
                                                                            : disabled
                                                                                ? '#94A3B8'
                                                                                : !cell.isCurrentMonth
                                                                                    ? '#94A3B8'
                                                                                    : today
                                                                                        ? '#059669'
                                                                                        : '#0F172A',
                                                                        fontWeight: selected || today ? 700 : 400,
                                                                        fontSize: '12px',
                                                                        cursor: disabled ? 'not-allowed' : 'pointer',
                                                                        opacity: disabled ? 0.5 : 1
                                                                    }}
                                                                >
                                                                    {cell.date.getDate()}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Calendar Footer Actions */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginTop: '10px',
                                                        paddingTop: '8px',
                                                        borderTop: '1px solid #F1F5F9'
                                                    }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectCalendarDate(new Date())}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#059669',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Today
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, expiryDate: '' }));
                                                                setExpiryError('');
                                                                setIsCalendarOpen(false);
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#94A3B8',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Inline Error Message */}
                                        {expiryError && (
                                            <div style={{
                                                color: '#DC2626',
                                                fontSize: '12px',
                                                marginTop: '5px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                <span>⚠️</span>
                                                <span>{expiryError}</span>
                                            </div>
                                        )}


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
                                                Browse & Upload Main Image from Device Storage
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                                    onChange={handleImageFileUpload}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            {uploadingImage && <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Uploading image...</span>}
                                        </div>

                                        {formData.imageUrl && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                                <img src={resolveImageUrl(formData.imageUrl)} alt="Main Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                                                <div style={{ flex: 1, minWidth: 0, fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {formData.imageUrl}
                                                </div>
                                                <button type="button" onClick={() => setFormData({ ...formData, imageUrl: '' })} style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Remove Main</button>
                                            </div>
                                        )}

                                        <input
                                            type="text"
                                            placeholder="Main image path (use upload button above)"
                                            value={formData.imageUrl}
                                            readOnly
                                            style={{
                                                ...styles.input,
                                                backgroundColor: '#F8FAFC',
                                                cursor: 'not-allowed',
                                                color: '#64748B'
                                            }}
                                        />

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
                                                Upload Gallery Photos from Device Storage
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
                                                        <img src={resolveImageUrl(imgUrl)} alt={`Angle ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                                placeholder="Gallery images uploaded via device storage button above"
                                                readOnly
                                                style={{ ...styles.input, flex: 1, backgroundColor: '#F8FAFC', cursor: 'not-allowed', color: '#64748B' }}
                                            />
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

                {/* Soft Warning / Duplicate Check Confirmation Modal */}
                {duplicateModalConfig.show && (
                    <div style={styles.modalOverlay} role="dialog" aria-modal="true">
                        <div style={{
                            ...styles.modalCard,
                            maxWidth: '460px',
                            padding: '28px 24px',
                            textAlign: 'center',
                            borderRadius: '16px'
                        }} className="animate-scale-up">
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                background: '#FEF3C7',
                                color: '#D97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                border: '1px solid #FCD34D'
                            }}>
                                <AlertTriangle size={26} />
                            </div>
                            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>
                                {duplicateModalConfig.title}
                            </h3>
                            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, margin: '0 0 24px' }}>
                                {duplicateModalConfig.message}
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDuplicateModalConfig(prev => ({ ...prev, show: false }));
                                        setPendingSubmitData(null);
                                    }}
                                    style={{
                                        padding: '10px 22px',
                                        borderRadius: '10px',
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#475569',
                                        fontWeight: 700,
                                        fontSize: '13.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {duplicateModalConfig.cancelText}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(null, true)}
                                    style={{
                                        padding: '10px 22px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: '#D97706',
                                        color: '#FFFFFF',
                                        fontWeight: 700,
                                        fontSize: '13.5px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
                                    }}
                                >
                                    {duplicateModalConfig.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Short-Dated Stock Warning Modal */}
                <ShortDatedWarningModal
                    isOpen={shortDatedWarningModal.isOpen}
                    warning={shortDatedWarningModal.warning}
                    expiryDate={shortDatedWarningModal.expiryDate}
                    onConfirm={handleConfirmShortDatedModal}
                    onCancel={handleCancelShortDatedModal}
                />

                {/* 🚨 Red Validation Error Pop-Up Modal (Triggers ONLY when clicking Submit with mistakes) */}
                {validationErrorModal.show && (
                    <div style={styles.modalOverlay} role="dialog" aria-modal="true">
                        <div style={{
                            ...styles.modalCard,
                            maxWidth: '480px',
                            padding: '28px 26px',
                            textAlign: 'left',
                            borderRadius: '16px',
                            borderTop: '6px solid #DC2626',
                            boxShadow: '0 20px 40px rgba(220, 38, 38, 0.25)'
                        }} className="animate-scale-up">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '12px',
                                    background: '#FEE2E2',
                                    color: '#DC2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: '1px solid #FCA5A5'
                                }}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '18.5px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                                        Form Validation Error
                                    </h3>
                                    <p style={{ fontSize: '13px', color: '#B91C1C', margin: '3px 0 0', fontWeight: 500 }}>
                                        Please correct the missing/invalid field{validationErrorModal.errors.length > 1 ? 's' : ''}:
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                marginBottom: '22px',
                                maxHeight: '220px',
                                overflowY: 'auto'
                            }}>
                                <ul style={{ margin: 0, paddingLeft: '18px', color: '#991B1B', fontSize: '13.5px', lineHeight: '1.65' }}>
                                    {validationErrorModal.errors.map((err, idx) => (
                                        <li key={idx} style={{ marginBottom: idx === validationErrorModal.errors.length - 1 ? 0 : '8px' }}>
                                            <strong style={{ color: '#7F1D1D' }}>{err.field}:</strong> {err.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setValidationErrorModal({ show: false, errors: [] })}
                                    style={{
                                        padding: '11px 24px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: '#DC2626',
                                        color: '#FFFFFF',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    OK, Fix Errors
                                </button>
                            </div>
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
                                                                src={resolveImageUrl(med.imageUrl)}
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
                                                            onClick={() => handleEditMedicine(med)}
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
                    {/* Add New Storage Option Modal */}
                    {isAddStorageModalOpen && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.65)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99999
                        }}>
                            <div style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '16px',
                                padding: '24px',
                                width: '90%',
                                maxWidth: '440px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                border: '1px solid #E2E8F0'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px',
                                    borderBottom: '1px solid #F1F5F9',
                                    paddingBottom: '12px'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                                        Add New Storage Option
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddStorageModalOpen(false);
                                            setNewStorageInput('');
                                            setNewStorageError('');
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '18px',
                                            cursor: 'pointer',
                                            color: '#64748B',
                                            padding: '4px'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#475569',
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Option Name / Condition *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Store in Amber Bottle"
                                        value={newStorageInput}
                                        onChange={(e) => {
                                            setNewStorageInput(e.target.value);
                                            if (newStorageError) setNewStorageError('');
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: newStorageError ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                                            backgroundColor: newStorageError ? '#FEF2F2' : '#FFFFFF',
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        autoFocus
                                    />
                                    {newStorageError && (
                                        <div style={{
                                            color: '#DC2626',
                                            fontSize: '12px',
                                            marginTop: '6px',
                                            fontWeight: 600
                                        }}>
                                            {newStorageError}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddStorageModalOpen(false);
                                            setNewStorageInput('');
                                            setNewStorageError('');
                                        }}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '8px',
                                            border: '1px solid #CBD5E1',
                                            backgroundColor: '#F8FAFC',
                                            color: '#475569',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveCustomStorage}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: '#059669',
                                            color: '#FFFFFF',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                                        }}
                                    >
                                        Save & Select
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main >
        </div >
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