import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Calendar, X } from 'lucide-react';
import { formatDate } from '../../utils/medicineValidation';

/**
 * ShortDatedWarningModal Component
 * 
 * Displays a soft warning overlay when adding short-dated pharmacy stock:
 * - Tier 1: TODAY (0 days remaining) -> Header red (#DC2626)
 * - Tier 2: CRITICAL (< 7 days remaining) -> Header orange (#EA580C)
 * - Tier 3: WARNING (7-30 days remaining) -> Header yellow (#CA8A04)
 * - Tier 4: No Warning (> 30 days)
 * 
 * Modal Behavior:
 * - Centered overlay with dimmed background.
 * - Displays warning message and actual expiry date (mm/dd/yyyy).
 * - [Cancel]: Closes modal, focuses back on expiry field.
 * - [{confirmText}]: Confirms short-dated warning and proceeds with form submission.
 * - ESC key or backdrop click triggers Cancel.
 * - Keyboard navigable and ARIA accessible.
 */
const ShortDatedWarningModal = ({
    isOpen,
    warning,
    expiryDate,
    onConfirm,
    onCancel
}) => {
    const cancelButtonRef = useRef(null);

    // ESC key listener & focus management
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Focus Cancel button initially for accessibility & safety
        const timer = setTimeout(() => {
            if (cancelButtonRef.current) {
                cancelButtonRef.current.focus();
            }
        }, 50);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [isOpen, onCancel]);

    if (!isOpen || !warning) return null;

    const { tier, severity, daysRemaining, message } = warning;
    const formattedDate = formatDate(expiryDate);

    // Severity & Tier Styling Configuration
    let headerBg = '#FEF2F2';
    let headerBorder = '#FCA5A5';
    let headerTextColor = '#991B1B';
    let iconColor = '#DC2626';
    let titleText = '⚠️ Expires Today';
    let confirmBtnBg = '#DC2626';
    let confirmBtnHover = '#B91C1C';
    let badgeText = 'EXPIRES TODAY';
    let badgeBg = '#FEE2E2';

    // Tier 1: Expires Today (daysRemaining === 0)
    if (tier === 'TODAY' || daysRemaining === 0) {
        headerBg = '#FEF2F2';
        headerBorder = '#FCA5A5';
        headerTextColor = '#991B1B';
        iconColor = '#DC2626';
        titleText = '⚠️ Expires Today';
        confirmBtnBg = '#DC2626';
        confirmBtnHover = '#B91C1C';
        badgeText = 'EXPIRES TODAY';
        badgeBg = '#FEE2E2';
    }
    // Tier 2: Critical (< 7 days)
    else if (tier === 'CRITICAL' || (daysRemaining > 0 && daysRemaining < 7)) {
        headerBg = '#FFEDD5';
        headerBorder = '#FDBA74';
        headerTextColor = '#C2410C';
        iconColor = '#EA580C';
        titleText = '⚠️ Very Short-Dated Stock';
        confirmBtnBg = '#EA580C';
        confirmBtnHover = '#C2410C';
        badgeText = 'VERY SHORT-DATED';
        badgeBg = '#FFEDD5';
    }
    // Tier 3: Warning (7 to 30 days)
    else if (tier === 'WARNING' || (daysRemaining >= 7 && daysRemaining <= 30)) {
        headerBg = '#FEF3C7';
        headerBorder = '#FDE68A';
        headerTextColor = '#854D0E';
        iconColor = '#CA8A04';
        titleText = '⚠️ Expiring Soon';
        confirmBtnBg = '#D97706';
        confirmBtnHover = '#B45309';
        badgeText = 'SHORT-DATED WARNING';
        badgeBg = '#FEF3C7';
    }

    return (
        <div
            style={styles.backdrop}
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="short-dated-modal-title"
            aria-describedby="short-dated-modal-desc"
        >
            <div
                style={{
                    ...styles.modalContainer,
                    borderColor: headerBorder
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div style={{ ...styles.modalHeader, backgroundColor: headerBg, borderBottomColor: headerBorder }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ ...styles.iconWrapper, backgroundColor: '#FFFFFF', color: iconColor }}>
                            {severity === 'high' ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                            <span style={{ ...styles.badge, backgroundColor: badgeBg, color: headerTextColor }}>
                                {badgeText}
                            </span>
                            <h2 id="short-dated-modal-title" style={{ ...styles.modalTitle, color: headerTextColor }}>
                                {titleText}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={styles.closeBtn}
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={styles.modalBody}>
                    <p id="short-dated-modal-desc" style={styles.warningMessage}>
                        {message}
                    </p>

                    <div style={styles.dateCard}>
                        <Calendar size={18} color="#64748B" />
                        <div>
                            <div style={styles.dateLabel}>Expiry Date</div>
                            <div style={styles.dateValue}>
                                {formattedDate ? `Expires on ${formattedDate}` : 'Date specified in form'}
                            </div>
                        </div>
                    </div>

                    <div style={styles.infoNotice}>
                        <strong>Note:</strong> This is a soft warning and does not block submission. Click &quot;Yes, Add Anyway&quot; to proceed.
                    </div>
                </div>

                {/* Footer Buttons */}
                <div style={styles.modalFooter}>
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onCancel}
                        style={styles.cancelBtn}
                        aria-label="Cancel adding short dated item"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        style={{
                            ...styles.confirmBtn,
                            backgroundColor: confirmBtnBg
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = confirmBtnHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = confirmBtnBg}
                        aria-label="Confirm adding short dated item"
                    >
                        Yes, Add Anyway
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '2px solid transparent',
        overflow: 'hidden'
    },
    modalHeader: {
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid'
    },
    iconWrapper: {
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    badge: {
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.5px',
        padding: '2px 8px',
        borderRadius: '6px',
        marginBottom: '4px'
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 800,
        lineHeight: '1.2'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#64748B',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalBody: {
        padding: '24px'
    },
    warningMessage: {
        fontSize: '15px',
        fontWeight: 700,
        color: '#1E293B',
        margin: '0 0 16px 0',
        lineHeight: '1.5'
    },
    dateCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px'
    },
    dateLabel: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    dateValue: {
        fontSize: '14px',
        fontWeight: 800,
        color: '#0F172A'
    },
    infoNotice: {
        fontSize: '12.5px',
        color: '#64748B',
        backgroundColor: '#F1F5F9',
        borderRadius: '10px',
        padding: '10px 14px',
        lineHeight: '1.4'
    },
    modalFooter: {
        padding: '16px 24px 24px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #F1F5F9'
    },
    cancelBtn: {
        padding: '11px 20px',
        borderRadius: '10px',
        border: '1px solid #CBD5E1',
        backgroundColor: '#FFFFFF',
        color: '#334155',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s'
    },
    confirmBtn: {
        padding: '11px 22px',
        borderRadius: '10px',
        border: 'none',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.15s'
    }
};

export default ShortDatedWarningModal;
