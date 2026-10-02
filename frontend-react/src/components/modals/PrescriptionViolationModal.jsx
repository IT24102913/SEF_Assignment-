import React from 'react';
import { AlertTriangle, X, Mail, ClipboardList } from 'lucide-react';

export default function PrescriptionViolationModal({ notification, onClose, onNavigate }) {
    if (!notification) return null;

    const orderNum = notification.targetOrderNumber || 'ORD-20260923-7862';
    const message = notification.message || `We detected that you uploaded an invalid non-medical image for prescription verification (Order #${orderNum}). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to healthbridgeyourpharmacy@gmail.com.`;

    const handleSendAppeal = () => {
        const subject = encodeURIComponent(`Prescription Violation Appeal - Order #${orderNum}`);
        const body = encodeURIComponent(`Dear Pharmacy Admin,\n\nI am writing to appeal the prescription violation warning for Order #${orderNum}.\n\nReason/Explanation:\n`);
        window.location.href = `mailto:healthbridgeyourpharmacy@gmail.com?subject=${subject}&body=${body}`;
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(5px)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    maxWidth: '520px',
                    width: '100%',
                    padding: '28px',
                    boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)',
                    border: '1.5px solid #FCA5A5',
                    position: 'relative',
                    animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <AlertTriangle size={26} color="#DC2626" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#DC2626', letterSpacing: '-0.3px' }}>
                                PRESCRIPTION VIOLATION
                            </h3>
                            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                                Order: #{orderNum}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#F1F5F9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748B',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Official Notice Container */}
                <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1.5px solid #FECACA',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    marginBottom: '18px'
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#DC2626', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⚠️ OFFICIAL NOTICE FROM PHARMACY ADMIN:
                    </div>
                    <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.55, fontWeight: 500 }}>
                        {message}
                    </div>
                </div>

                {/* Identified Offending Order Box */}
                <div style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    marginBottom: '22px'
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                        Identified Offending Order:
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#DC2626', marginBottom: '8px' }}>
                        Order #: {orderNum}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>
                        To appeal this decision or attach a doctor letter, tap the button below to email healthbridgeyourpharmacy@gmail.com.
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleSendAppeal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            border: '1.5px solid #FCA5A5',
                            backgroundColor: '#FFF',
                            color: '#DC2626',
                            fontWeight: 800,
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Mail size={16} /> Send Appeal
                    </button>
                    <button
                        onClick={() => {
                            onClose();
                            if (onNavigate) onNavigate('orders');
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 22px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: '#0F172A',
                            color: '#FFF',
                            fontWeight: 800,
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(15,23,42,0.25)'
                        }}
                    >
                        <ClipboardList size={16} /> View Orders
                    </button>
                </div>
            </div>
        </div>
    );
}
