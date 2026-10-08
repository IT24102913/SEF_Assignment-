import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    X,
    Send,
    History,
    MessageSquare,
    Clock,
    Pill,
    AlertTriangle,
    Stethoscope,
    ShoppingBag,
    Trash2,
    ChevronRight,
    RefreshCw,
    ShieldAlert
} from 'lucide-react';
import { symptomApi } from '../../api/symptomApi';

const QUICK_CHIPS = [
    { label: '🤕 Headache', symptom: 'I have a headache and tension around my temples' },
    { label: '🤧 Cough & Cold', symptom: 'Persistent dry cough and runny nose' },
    { label: '🤢 Stomach Ache', symptom: 'Mild indigestion and stomach ache after meals' },
    { label: '🧴 Skin Rash', symptom: 'Itchy skin rash and dry patches' },
    { label: '🌡️ Mild Fever', symptom: 'Mild fever and body aches' }
];

const WellnessChatModal = ({ isOpen, onClose, user, onAddToCart }) => {
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'history'
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            sender: 'ai',
            content: {
                summary: "Ayubowan! I am your AI Wellness Assistant. How are you feeling today? Tell me your symptoms, and I'll share home remedies, warning signs, and safe over-the-counter products from our pharmacy.",
                isWelcome: true
            },
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (activeTab === 'chat') {
            scrollToBottom();
        }
    }, [messages, loading, activeTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            fetchHistory();
        }
    }, [isOpen, activeTab]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const data = await symptomApi.getHistory(user?.email);
            setHistoryList(data || []);
        } catch (err) {
            console.warn('Failed to load history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSend = async (textToSend, clarifyingAnswers = null) => {
        const query = (textToSend || inputValue).trim();
        if (!query || loading) return;

        let userDisplayText = query;
        if (clarifyingAnswers && Object.keys(clarifyingAnswers).length > 0) {
            const parts = Object.entries(clarifyingAnswers)
                .map(([k, v]) => `${k}: ${v}`);
            userDisplayText = `Answers → ${parts.join(' | ')}`;
        }

        const userMsg = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: userDisplayText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textToSend) setInputValue('');
        setLoading(true);

        try {
            const data = await symptomApi.getAdvice(
                query,
                user?.email,
                clarifyingAnswers
            );
            const aiMsg = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                content: data,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            const errorMsg = {
                id: `err-${Date.now()}`,
                sender: 'ai',
                isError: true,
                content: {
                    summary: err.message || "I'm having trouble connecting right now. Please try again shortly.",
                },
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHistory = async (e, id) => {
        e.stopPropagation();
        const success = await symptomApi.deleteHistory(id);
        if (success) {
            setHistoryList(prev => prev.filter(item => item.id !== id));
            if (selectedHistoryItem?.id === id) {
                setSelectedHistoryItem(null);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <style>{`
                @keyframes pulseDots {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
                .dot-1 { animation: pulseDots 1.4s infinite ease-in-out; animation-delay: 0s; }
                .dot-2 { animation: pulseDots 1.4s infinite ease-in-out; animation-delay: 0.2s; }
                .dot-3 { animation: pulseDots 1.4s infinite ease-in-out; animation-delay: 0.4s; }
                
                @media (max-width: 640px) {
                    .wellness-modal-card {
                        width: 100% !important;
                        height: 100% !important;
                        max-height: 100vh !important;
                        border-radius: 0 !important;
                    }
                }
            `}</style>

            <div style={styles.modalCard} className="wellness-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTitleRow}>
                        <div style={styles.headerIconBox}>
                            <Sparkles size={22} color="white" />
                        </div>
                        <div>
                            <div style={styles.headerTitle}>
                                Wellness Assistant
                                <span style={styles.aiBadge}>AI POWERED</span>
                            </div>
                            <div style={styles.headerSub}>Instant home remedies & safe OTC guidance</div>
                        </div>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}>
                        <X size={20} color="#64748B" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div style={styles.tabRow}>
                    <button
                        style={{
                            ...styles.tabBtn,
                            ...(activeTab === 'chat' ? styles.tabBtnActive : {})
                        }}
                        onClick={() => {
                            setActiveTab('chat');
                            setSelectedHistoryItem(null);
                        }}
                    >
                        <MessageSquare size={16} />
                        <span>AI Chat</span>
                    </button>
                    <button
                        style={{
                            ...styles.tabBtn,
                            ...(activeTab === 'history' ? styles.tabBtnActive : {})
                        }}
                        onClick={() => setActiveTab('history')}
                    >
                        <History size={16} />
                        <span>History</span>
                    </button>
                </div>

                {/* Tab Content Body */}
                <div style={styles.body}>
                    {activeTab === 'chat' ? (
                        <div style={styles.chatContainer}>
                            {/* Messages Scroll Area */}
                            <div style={styles.messagesList}>
                                {messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            ...styles.messageRow,
                                            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                                        }}
                                    >
                                        {msg.sender === 'user' ? (
                                            <div style={styles.userBubble}>
                                                {msg.text}
                                            </div>
                                        ) : (
                                            <div style={styles.aiBubble}>
                                                {/* Welcome Message Simple View */}
                                                {msg.content?.isWelcome ? (
                                                    <div style={{ color: '#1E293B', fontSize: '14px', lineHeight: 1.6 }}>
                                                        {msg.content.summary}
                                                    </div>
                                                ) : msg.content?.needsClarification &&
                                                    msg.content?.clarifyingQuestions?.length > 0 ? (
                                                    <ClarifyingQuestionsCard
                                                        advice={msg.content}
                                                        onSubmit={(answers) =>
                                                            handleSend(msg.content.symptom, answers)
                                                        }
                                                    />
                                                ) : (
                                                    /* Structured AI Response View */
                                                    <StructuredAdviceView advice={msg.content} onAddToCart={onAddToCart} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Thinking Dots Animation */}
                                {loading && (
                                    <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                                        <div style={styles.aiBubble}>
                                            <div style={styles.thinkingContainer}>
                                                <Sparkles size={16} color="#2563EB" />
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                                                    Wellness AI is thinking...
                                                </span>
                                                <div style={styles.dotsRow}>
                                                    <span className="dot-1" style={styles.dot} />
                                                    <span className="dot-2" style={styles.dot} />
                                                    <span className="dot-3" style={styles.dot} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Symptom Chips */}
                            <div style={styles.chipsRow}>
                                {QUICK_CHIPS.map((chip, idx) => (
                                    <button
                                        key={idx}
                                        style={styles.chipBtn}
                                        onClick={() => handleSend(chip.symptom)}
                                        disabled={loading}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>

                            {/* Input Form Bar */}
                            <form
                                style={styles.inputForm}
                                onSubmit={e => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="Describe your symptoms (e.g. severe headache and fever)..."
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    style={styles.inputField}
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.sendBtn,
                                        ...(loading || !inputValue.trim() ? styles.sendBtnDisabled : {})
                                    }}
                                    disabled={loading || !inputValue.trim()}
                                >
                                    <Send size={18} color="white" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        /* History Tab Content */
                        <div style={styles.historyContainer}>
                            {selectedHistoryItem ? (
                                <div style={{ padding: '4px' }}>
                                    <button
                                        style={styles.backBtn}
                                        onClick={() => setSelectedHistoryItem(null)}
                                    >
                                        ← Back to History List
                                    </button>
                                    <div style={styles.aiBubble}>
                                        <StructuredAdviceView
                                            advice={parseHistoryResponse(selectedHistoryItem)}
                                            onAddToCart={onAddToCart}
                                        />
                                    </div>
                                </div>
                            ) : historyLoading ? (
                                <div style={styles.loadingState}>
                                    <RefreshCw size={24} className="spin" color="#2563EB" />
                                    <span>Loading query history...</span>
                                </div>
                            ) : historyList.length === 0 ? (
                                <div style={styles.emptyHistoryState}>
                                    <History size={40} color="#94A3B8" />
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginTop: '12px' }}>
                                        No Previous Advice Saved
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                                        Ask Wellness AI about any symptoms to save advice snapshots here.
                                    </div>
                                </div>
                            ) : (
                                <div style={styles.historyList}>
                                    {historyList.map(item => (
                                        <div
                                            key={item.id}
                                            style={styles.historyCard}
                                            onClick={() => setSelectedHistoryItem(item)}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={styles.historyHeaderRow}>
                                                    <span style={styles.historyCategoryChip}>
                                                        {item.symptomCategory || 'General Discomfort'}
                                                    </span>
                                                    <span style={styles.historyTime}>
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div style={styles.historySymptomText}>
                                                    "{item.symptom}"
                                                </div>
                                                <div style={styles.historySummarySnippet}>
                                                    {item.summary}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    style={styles.deleteBtn}
                                                    onClick={(e) => handleDeleteHistory(e, item.id)}
                                                    title="Delete history entry"
                                                >
                                                    <Trash2 size={16} color="#EF4444" />
                                                </button>
                                                <ChevronRight size={18} color="#94A3B8" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Component: Structured AI Response View (STRICT ORDER)
const StructuredAdviceView = ({ advice, onAddToCart }) => {
    if (!advice) return null;

    const {
        symptomCategory,
        summary,
        homeRemedies = [],
        restDuration,
        recommendedProducts = [],
        warningSigns = [],
        consultDoctorIf = [],
        disclaimer
    } = advice;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. 📌 Category & Summary */}
            <div>
                {symptomCategory && (
                    <div style={styles.sectionCategoryBadge}>
                        📌 {symptomCategory}
                    </div>
                )}
                <div style={styles.summaryText}>
                    {summary}
                </div>
            </div>

            {/* 2. 🏠 Home Remedies */}
            {homeRemedies.length > 0 && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionTitle}>
                        🏠 Recommended Home Remedies
                    </div>
                    <ul style={styles.bulletList}>
                        {homeRemedies.map((remedy, idx) => (
                            <li key={idx} style={styles.bulletItem}>{remedy}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 3. ⏰ Rest Duration */}
            {restDuration && (
                <div style={styles.restCard}>
                    <Clock size={18} color="#2563EB" />
                    <div>
                        <span style={{ fontWeight: 700, color: '#1E40AF' }}>Recommended Rest: </span>
                        <span style={{ color: '#1E3A8A' }}>{restDuration}</span>
                    </div>
                </div>
            )}

            {/* 4. 💊 OTC Medicines ONLY */}
            {recommendedProducts && recommendedProducts.length > 0 && (
                <div style={styles.sectionCard}>
                    <div style={styles.sectionTitle}>
                        💊 Safe Over-The-Counter Products (In Stock)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                        {recommendedProducts.map((prod, idx) => (
                            <div key={idx} style={styles.productRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={styles.prodName}>
                                        {prod.name}
                                        <span style={styles.otcTag}>OTC</span>
                                    </div>
                                    <div style={styles.prodReason}>{prod.reason}</div>
                                    <div style={styles.prodPrice}>
                                        Rs. {prod.price ? prod.price.toFixed(2) : '0.00'} • {prod.sellingUnit || 'Pill'}
                                    </div>
                                </div>
                                {onAddToCart && (
                                    <button
                                        style={styles.addCartBtn}
                                        onClick={() => onAddToCart(prod, prod.sellingUnit || 'Pill', prod.price)}
                                    >
                                        <ShoppingBag size={14} />
                                        <span>Add</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. ⚠️ Warning Signs */}
            {warningSigns.length > 0 && (
                <div style={styles.warningBox}>
                    <div style={styles.warningTitle}>
                        <AlertTriangle size={18} color="#DC2626" />
                        <span>⚠️ Urgent Red Flag Warning Signs</span>
                    </div>
                    <ul style={{ ...styles.bulletList, color: '#991B1B' }}>
                        {warningSigns.map((sign, idx) => (
                            <li key={idx} style={styles.bulletItem}>{sign}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 6. 🩺 Consult Doctor If */}
            {consultDoctorIf.length > 0 && (
                <div style={styles.doctorBox}>
                    <div style={styles.doctorTitle}>
                        <Stethoscope size={18} color="#2563EB" />
                        <span>🩺 When to Consult a Medical Doctor</span>
                    </div>
                    <ul style={{ ...styles.bulletList, color: '#1E40AF' }}>
                        {consultDoctorIf.map((cond, idx) => (
                            <li key={idx} style={styles.bulletItem}>{cond}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 7. ⚠️ Disclaimer */}
            <div style={styles.disclaimerBox}>
                {disclaimer || '⚠️ Disclaimer: This advice is for wellness informational purposes only. Consult a physician for severe conditions.'}
            </div>
        </div>
    );
};

const ClarifyingQuestionsCard = ({ advice, onSubmit }) => {
    const [answers, setAnswers] = React.useState({});

    const questions = advice?.clarifyingQuestions || [];
    const answeredCount = questions.filter(q => answers[q.id]).length;
    const allAnswered = questions.length > 0 && answeredCount === questions.length;

    const handleSelect = (questionId, option) => {
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    const handleSubmit = () => {
        if (allAnswered) onSubmit(answers);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 1. 📌 Category badge + summary */}
            <div>
                {advice.symptomCategory && (
                    <div style={styles.sectionCategoryBadge}>
                        📌 {advice.symptomCategory}
                    </div>
                )}
                <div style={styles.summaryText}>
                    {advice.summary}
                </div>
            </div>

            {/* 2. Progress indicator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748B'
            }}>
                <div style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: '#E2E8F0',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${(answeredCount / questions.length) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <span>{answeredCount} / {questions.length}</span>
            </div>

            {/* 3. Questions */}
            {questions.map((q, idx) => (
                <div key={q.id} style={styles.questionCard}>
                    <div style={styles.questionNumber}>
                        Question {idx + 1}
                    </div>
                    <div style={styles.questionText}>
                        {q.question}
                    </div>
                    <div style={styles.optionsRow}>
                        {q.options.map((opt) => {
                            const selected = answers[q.id] === opt;
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    style={{
                                        ...styles.optionBtn,
                                        ...(selected ? styles.optionBtnSelected : {})
                                    }}
                                    onClick={() => handleSelect(q.id, opt)}
                                >
                                    <span style={{
                                        ...styles.optionRadio,
                                        ...(selected ? styles.optionRadioSelected : {})
                                    }}>
                                        {selected ? '✓' : ''}
                                    </span>
                                    <span>{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* 4. Submit */}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered}
                style={{
                    ...styles.submitAnswersBtn,
                    ...(!allAnswered ? styles.submitAnswersBtnDisabled : {})
                }}
            >
                {allAnswered
                    ? 'Get My Advice →'
                    : `Answer all ${questions.length} questions to continue`}
            </button>

            {/* 5. Reassurance note */}
            {allAnswered && (
                <div style={{
                    fontSize: '12px',
                    color: '#64748B',
                    textAlign: 'center',
                    fontStyle: 'italic'
                }}>
                    Your answers help us give you the safest guidance.
                </div>
            )}
        </div>
    );
};

const parseHistoryResponse = (item) => {
    if (!item) return null;
    let parsed = {};
    if (item.responseJson) {
        try {
            parsed = JSON.parse(item.responseJson);
        } catch (_) { }
    }
    return {
        symptomCategory: item.symptomCategory || parsed.symptomCategory,
        summary: item.summary || parsed.summary,
        homeRemedies: parsed.homeRemedies || [],
        restDuration: parsed.restDuration,
        recommendedProducts: parsed.recommendedProducts || [],
        warningSigns: parsed.warningSigns || [],
        consultDoctorIf: parsed.consultDoctorIf || [],
        disclaimer: parsed.disclaimer
    };
};

// Styles
const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
    },
    modalCard: {
        width: '600px',
        maxWidth: '100%',
        height: '82vh',
        maxHeight: '750px',
        backgroundColor: '#F8FAFC',
        borderRadius: '24px',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #E2E8F0'
    },
    header: {
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    headerTitleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
    },
    headerIconBox: {
        width: '46px',
        height: '46px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    aiBadge: {
        fontSize: '10px',
        padding: '2px 8px',
        background: '#60A5FA',
        color: '#1E3A8A',
        borderRadius: '10px',
        fontWeight: 800
    },
    headerSub: {
        fontSize: '12px',
        color: '#93C5FD',
        marginTop: '2px'
    },
    closeBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
    },
    tabRow: {
        display: 'flex',
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 16px'
    },
    tabBtn: {
        flex: 1,
        padding: '14px 16px',
        border: 'none',
        background: 'none',
        fontSize: '14px',
        fontWeight: 700,
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        borderBottom: '3px solid transparent',
        transition: 'all 0.2s'
    },
    tabBtnActive: {
        color: '#2563EB',
        borderBottomColor: '#2563EB'
    },
    body: {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    },
    chatContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    messagesList: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    messageRow: {
        display: 'flex',
        width: '100%'
    },
    userBubble: {
        maxWidth: '80%',
        padding: '14px 18px',
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        color: 'white',
        borderRadius: '20px 20px 4px 20px',
        fontSize: '14px',
        lineHeight: 1.5,
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
    },
    aiBubble: {
        maxWidth: '92%',
        padding: '18px 20px',
        backgroundColor: '#FFFFFF',
        color: '#1E293B',
        borderRadius: '20px 20px 20px 4px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
    },
    thinkingContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    dotsRow: {
        display: 'flex',
        gap: '4px'
    },
    dot: {
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: '#2563EB'
    },
    chipsRow: {
        padding: '8px 16px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        background: '#FFFFFF',
        borderTop: '1px solid #F1F5F9'
    },
    chipBtn: {
        padding: '6px 14px',
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: 700,
        color: '#1E40AF',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s'
    },
    inputForm: {
        padding: '16px 20px',
        background: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    },
    inputField: {
        flex: 1,
        padding: '12px 18px',
        borderRadius: '14px',
        border: '1.5px solid #CBD5E1',
        fontSize: '14px',
        outline: 'none',
        transition: 'border 0.2s'
    },
    sendBtn: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
    },
    sendBtnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
    },
    historyContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px'
    },
    historyList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    historyCard: {
        padding: '16px 18px',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    historyHeaderRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '6px'
    },
    historyCategoryChip: {
        fontSize: '11px',
        fontWeight: 800,
        color: '#1D4ED8',
        background: '#EFF6FF',
        padding: '2px 8px',
        borderRadius: '8px'
    },
    historyTime: {
        fontSize: '11px',
        color: '#94A3B8'
    },
    historySymptomText: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#0F172A'
    },
    historySummarySnippet: {
        fontSize: '12px',
        color: '#64748B',
        marginTop: '4px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
    },
    deleteBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px'
    },
    backBtn: {
        background: 'none',
        border: 'none',
        fontSize: '13px',
        color: '#2563EB',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    sectionCategoryBadge: {
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: 800,
        color: '#1D4ED8',
        background: '#EFF6FF',
        padding: '4px 10px',
        borderRadius: '10px',
        marginBottom: '8px',
        letterSpacing: '0.3px'
    },
    summaryText: {
        fontSize: '14px',
        lineHeight: 1.6,
        color: '#334155',
        fontWeight: 500
    },
    sectionCard: {
        background: '#F8FAFC',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid #E2E8F0'
    },
    sectionTitle: {
        fontSize: '13px',
        fontWeight: 800,
        color: '#1E293B',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    bulletList: {
        margin: 0,
        paddingLeft: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    bulletItem: {
        fontSize: '13px',
        lineHeight: 1.5,
        color: '#334155'
    },
    restCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '13px'
    },
    productRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0'
    },
    prodName: {
        fontSize: '13px',
        fontWeight: 700,
        color: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    otcTag: {
        fontSize: '9px',
        fontWeight: 800,
        color: '#059669',
        background: '#D1FAE5',
        padding: '1px 6px',
        borderRadius: '6px'
    },
    prodReason: {
        fontSize: '12px',
        color: '#64748B',
        marginTop: '2px'
    },
    prodPrice: {
        fontSize: '11px',
        fontWeight: 700,
        color: '#2563EB',
        marginTop: '2px'
    },
    addCartBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer'
    },
    warningBox: {
        background: '#FEF2F2',
        border: '1px solid #FCA5A5',
        borderRadius: '16px',
        padding: '16px'
    },
    warningTitle: {
        fontSize: '13px',
        fontWeight: 800,
        color: '#991B1B',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    doctorBox: {
        background: '#EFF6FF',
        border: '1px solid #93C5FD',
        borderRadius: '16px',
        padding: '16px'
    },
    doctorTitle: {
        fontSize: '13px',
        fontWeight: 800,
        color: '#1E40AF',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    disclaimerBox: {
        fontSize: '11px',
        color: '#64748B',
        background: '#F1F5F9',
        padding: '10px 14px',
        borderRadius: '10px',
        lineHeight: 1.4,
        fontStyle: 'italic',
        textAlign: 'center'
    },
    loadingState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        color: '#64748B',
        fontSize: '14px',
        fontWeight: 600
    },
    emptyHistoryState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center'
    },
    questionCard: {
        background: '#F8FAFC',
        borderRadius: '14px',
        padding: '14px 16px',
        border: '1px solid #E2E8F0'
    },
    questionNumber: {
        fontSize: '10.5px',
        fontWeight: 800,
        color: '#2563EB',
        background: '#EFF6FF',
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '8px',
        marginBottom: '8px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
    },
    questionText: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: '12px',
        lineHeight: 1.5
    },
    optionsRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    optionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '11px 14px',
        background: '#FFFFFF',
        border: '1.5px solid #CBD5E1',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#334155',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease'
    },
    optionBtnSelected: {
        background: '#EFF6FF',
        borderColor: '#2563EB',
        color: '#1D4ED8',
        fontWeight: 700,
        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.12)'
    },
    optionRadio: {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: '2px solid #CBD5E1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 800,
        color: 'white',
        flexShrink: 0,
        transition: 'all 0.15s ease'
    },
    optionRadioSelected: {
        borderColor: '#2563EB',
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
    },
    submitAnswersBtn: {
        padding: '13px 20px',
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
        transition: 'all 0.2s ease'
    },
    submitAnswersBtnDisabled: {
        background: '#CBD5E1',
        boxShadow: 'none',
        cursor: 'not-allowed',
        color: '#FFFFFF'
    }
};

export default WellnessChatModal;
