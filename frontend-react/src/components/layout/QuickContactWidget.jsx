import React, { useState } from 'react';
import { MessageCircle, Phone, ChevronDown, ChevronUp } from 'lucide-react';

const QuickContactWidget = () => {
    const [collapsed, setCollapsed] = useState(false);
    const phoneNumber = "0764887396";
    const whatsappUrl = `https://wa.me/94764887396?text=${encodeURIComponent('Hello Medix Healthcare Team, I need assistance with my portal.')}`;

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px', // Positioned high enough above bottom checkout drawers & action bars
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-end'
        }}>
            {/* Toggle Header button if user wants to collapse/expand floating contact pill */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    background: '#0F172A',
                    color: '#94A3B8',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
            >
                {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Quick Help
            </button>

            {!collapsed && (
                <>
                    {/* WhatsApp Quick Button */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backgroundColor: '#25D366',
                            color: '#FFFFFF',
                            padding: '11px 18px',
                            borderRadius: '50px',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '13px',
                            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.45)',
                            transition: 'transform 0.2s ease, boxShadow 0.2s ease',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title="Quick WhatsApp Support"
                    >
                        <MessageCircle size={19} fill="#FFFFFF" color="#25D366" />
                        <span>WhatsApp Support</span>
                    </a>

                    {/* Telephone Call Button */}
                    <a
                        href={`tel:${phoneNumber}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backgroundColor: '#0284C7',
                            color: '#FFFFFF',
                            padding: '11px 18px',
                            borderRadius: '50px',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '13px',
                            boxShadow: '0 8px 24px rgba(2, 132, 199, 0.45)',
                            transition: 'transform 0.2s ease, boxShadow 0.2s ease',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title={`Call Medix Helpline (${phoneNumber})`}
                    >
                        <Phone size={17} color="#FFFFFF" />
                        <span>Call: {phoneNumber}</span>
                    </a>
                </>
            )}
        </div>
    );
};

export default QuickContactWidget;
