import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  BrainCircuit, 
  Stethoscope, 
  Microscope, 
  Pill, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Send, 
  HelpCircle, 
  RefreshCw, 
  ShieldAlert, 
  ArrowRight, 
  Activity,
  Heart,
  Calendar,
  FileText,
  UserCheck
} from 'lucide-react';
import { emrApi } from '../../../api/emrApi';
import toast from 'react-hot-toast';

export default function AIClinicalAdvisor() {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, doctor, labs, medications, ask

  // Interactive Q&A state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // Retrieve current user / patient identity
  const rawUser = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user') || '{}';
  const storedUser = JSON.parse(rawUser);
  const patientCode = storedUser.patientCode || '';

  const fetchInsight = async () => {
    setLoading(true);
    try {
      const data = await emrApi.getAIClinicalInsight(patientCode);
      setInsight(data);
    } catch (err) {
      console.error('Failed to load AI clinical insight:', err);
      toast.error('Unable to fetch AI clinical analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [patientCode]);

  const handleAskQuestion = async (qText) => {
    const q = (qText || question).trim();
    if (!q) return;

    setAsking(true);
    setQuestion('');

    const newMsg = { question: q, answer: null, timestamp: new Date() };
    setChatHistory(prev => [...prev, newMsg]);

    try {
      const res = await emrApi.askAIAgent(q, patientCode);
      setChatHistory(prev => prev.map(m => m.question === q && m.answer === null ? { ...m, answer: res.answer, refs: res.clinicalReferences } : m));
    } catch (err) {
      console.error(err);
      setChatHistory(prev => prev.map(m => m.question === q && m.answer === null ? { ...m, answer: 'Sorry, I was unable to retrieve a response from the clinical agent at this time. Please try again.' } : m));
      toast.error('AI response error.');
    } finally {
      setAsking(false);
    }
  };

  const quickQuestions = [
    "Can I take my medication with food?",
    "What did the doctor advise during my last visit?",
    "What do my latest lab test findings mean?",
    "What questions should I ask during my next appointment?"
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#e6f5f2',
          color: '#0d7c6b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          animation: 'spin 2s linear infinite'
        }}>
          <BrainCircuit size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Agentic AI is Analyzing Your Medical Records...
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '500px', margin: '0 auto' }}>
          Correlating your doctor diagnoses, clinical consultation notes, laboratory reports, and prescription dosages into plain English.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. HERO BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #095e51 0%, #0d7c6b 50%, #14b8a6 100%)',
        borderRadius: '20px',
        padding: '30px 36px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 10px 25px -5px rgba(13, 124, 107, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute',
          right: '-40px',
          top: '-40px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.5px' }}>
              <Sparkles size={15} /> AGENTIC AI HEALTH ADVISOR
            </div>

            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 10px 0', lineHeight: 1.2 }}>
              Your Medical Records, Explained Clearly.
            </h1>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.98rem', opacity: 0.92, lineHeight: 1.5 }}>
              Our clinical AI agent reviews your <strong>Lab Reports</strong>, <strong>Prescriptions</strong>, and <strong>Doctor Consultation Notes</strong> to explain your health condition and what your doctor advised in simple, everyday language.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', opacity: 0.9 }}>
              <span>Patient: <strong>{insight?.patientName} ({insight?.patientCode})</strong></span>
              <span>•</span>
              <span>Blood Group: <strong>{insight?.bloodGroup || 'Unknown'}</strong></span>
              <span>•</span>
              <span>Engine: <strong>{insight?.engineUsed}</strong></span>
            </div>
          </div>

          <button
            onClick={fetchInsight}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              color: '#095e51',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
              transition: 'transform 0.15s'
            }}
          >
            <RefreshCw size={16} /> Re-analyze Records
          </button>
        </div>
      </div>

      {/* 2. STATS AT A GLANCE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* Status Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #cbd5e1', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#e6f5f2', color: '#0d7c6b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Health Status</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{insight?.healthStatusLevel || 'Stable'}</div>
          </div>
        </div>

        {/* Doctor Visits */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #cbd5e1', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Doctor Visits Decoded</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{insight?.doctorInsights?.length || 0} Consultation(s)</div>
          </div>
        </div>

        {/* Lab Reports */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #cbd5e1', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Microscope size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Lab Tests Interpreted</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{insight?.labReportInsights?.length || 0} Diagnostic(s)</div>
          </div>
        </div>

        {/* Medications */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #cbd5e1', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Active Treatment Plan</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{insight?.medicationInsights?.length || 0} Medication(s)</div>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'overview', label: 'Overall Condition', icon: Heart },
          { id: 'doctor', label: 'What Doctor Said', icon: Stethoscope, count: insight?.doctorInsights?.length },
          { id: 'labs', label: 'Lab Reports Explained', icon: Microscope, count: insight?.labReportInsights?.length },
          { id: 'medications', label: 'Prescriptions Decoded', icon: Pill, count: insight?.medicationInsights?.length },
          { id: 'ask', label: 'Ask AI Clinical Agent', icon: Bot, isChat: true }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === tab.id ? '#0d7c6b' : '#f1f5f9',
              color: activeTab === tab.id ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <tab.icon size={17} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                fontSize: '0.75rem',
                padding: '1px 7px',
                borderRadius: '10px',
                fontWeight: 800
              }}>
                {tab.count}
              </span>
            )}
            {tab.isChat && (
              <span style={{
                backgroundColor: activeTab === tab.id ? '#ffffff' : '#14b8a6',
                color: activeTab === tab.id ? '#0d7c6b' : '#ffffff',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 800
              }}>
                Interactive
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT 1: OVERALL CONDITION                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Executive Clinical Summary */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            padding: '28px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e6f5f2', color: '#0d7c6b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={20} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Executive Health Condition Summary
              </h3>
            </div>

            <p style={{ fontSize: '1rem', color: '#334155', lineHeight: 1.6, marginBottom: '20px' }}>
              {insight?.overallConditionSummary}
            </p>

            {/* Profile Snapshot Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              backgroundColor: '#f8fafc',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Chronic Conditions</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                  {insight?.chronicConditions || 'None reported'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Recorded Allergies</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                  {insight?.allergies || 'No known allergies'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Blood Group</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                  {insight?.bloodGroup || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Safety Alerts */}
          {insight?.safetyAlerts?.length > 0 && (
            <div style={{
              backgroundColor: '#fff7ed',
              border: '1.5px solid #fed7aa',
              borderRadius: '14px',
              padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea580c', fontWeight: 800, marginBottom: '10px' }}>
                <ShieldAlert size={18} /> Safety & Allergy Alerts
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#9a3412', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {insight.safetyAlerts.map((alert, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable Next Steps */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            padding: '24px 28px'
          }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#0d7c6b" /> Recommended Next Steps
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {insight?.actionableNextSteps?.map((step, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  color: '#334155'
                }}>
                  <ArrowRight size={16} color="#0d7c6b" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT 2: WHAT YOUR DOCTOR SAID                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'doctor' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Doctor Consultation Notes Decoded
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Here is what your attending physician diagnosed, explained in plain everyday English without confusing jargon.
            </p>
          </div>

          {insight?.doctorInsights?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {insight.doctorInsights.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Stethoscope size={20} color="#dc2626" />
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        {doc.doctorName}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        ({doc.designation})
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      padding: '3px 10px',
                      borderRadius: '10px'
                    }}>
                      Diagnosis: {doc.diagnosis}
                    </span>
                  </div>

                  {/* What Doctor Said in Plain English */}
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991b1b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      💬 What Your Doctor Said (Translated in Everyday English)
                    </div>
                    <p style={{ margin: 0, fontSize: '0.94rem', color: '#7f1d1d', lineHeight: 1.55 }}>
                      {doc.whatDoctorSaidPlainEnglish}
                    </p>
                  </div>

                  {/* Key Takeaway & Tests */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '3px' }}>
                        Key Patient Action Item:
                      </strong>
                      <span style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600 }}>
                        {doc.keyTakeaway}
                      </span>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '3px' }}>
                        Recommended Next Steps:
                      </strong>
                      <span style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                        {doc.recommendedTestsAdvice}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#ffffff',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '48px 20px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              No doctor consultation notes currently recorded for this patient.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT 3: LAB REPORTS EXPLAINED                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'labs' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Laboratory Diagnostics Interpreted
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Understand what your lab investigations test, what the findings mean for your body, and their clinical relevance.
            </p>
          </div>

          {insight?.labReportInsights?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {insight.labReportInsights.map((lab, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Microscope size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          {lab.testTitle}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}>
                          Category: <strong>{lab.category}</strong>
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: lab.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                      color: lab.status === 'Completed' ? '#15803d' : '#b45309',
                      padding: '3px 12px',
                      borderRadius: '12px'
                    }}>
                      Status: {lab.status}
                    </span>
                  </div>

                  {/* Findings */}
                  <div style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '12px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong>Recorded Finding:</strong> {lab.findingsSummary}
                  </div>

                  {/* What it means in plain English */}
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', marginBottom: '4px', textTransform: 'uppercase' }}>
                      🔬 What This Test Means in Plain English
                    </div>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#14532d', lineHeight: 1.55 }}>
                      {lab.whatThisTestMeansPlainEnglish}
                    </p>
                  </div>

                  {/* Clinical Significance */}
                  <div style={{ fontSize: '0.84rem', color: '#334155' }}>
                    <strong style={{ color: '#0f172a' }}>Why This Matters For Your Health:</strong> {lab.clinicalSignificance}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#ffffff',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '48px 20px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              No laboratory reports recorded yet.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT 4: MEDICATIONS & TREATMENT PLAN                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'medications' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Prescriptions & Medications Decoded
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Learn what each medicine does in your body, why your doctor prescribed it, and vital dosage guidance.
            </p>
          </div>

          {insight?.medicationInsights?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {insight.medicationInsights.map((med, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pill size={18} />
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        {med.medicationName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 700, padding: '3px 10px', borderRadius: '8px' }}>
                        ⏱ {med.duration}
                      </span>
                      <span style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '3px 10px', borderRadius: '8px' }}>
                        By {med.prescribedDoctor}
                      </span>
                    </div>
                  </div>

                  {/* Dosage schedule */}
                  <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '14px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong>Dosage Instructions:</strong> {med.dosage}
                  </div>

                  {/* Purpose & How it works */}
                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af', marginBottom: '4px', textTransform: 'uppercase' }}>
                      💊 Purpose & How It Works in Your Body
                    </div>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#1e3a8a', lineHeight: 1.55 }}>
                      {med.purposeAndHowItWorks}
                    </p>
                  </div>

                  {/* Tips */}
                  <div style={{ fontSize: '0.84rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HelpCircle size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                    <span><strong>Pharmacist Care Tip:</strong> {med.usageInstructionsAndTips}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#ffffff',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '48px 20px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              No medications currently prescribed.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT 5: INTERACTIVE ASK AI CLINICAL AGENT                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ask' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid #cbd5e1',
          padding: '28px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#e6f5f2', color: '#0d7c6b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Ask Your Clinical AI Health Advisor
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Have questions about your report findings, dosages, or doctor recommendations? Ask below.
              </p>
            </div>
          </div>

          {/* Quick Questions Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskQuestion(q)}
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'background 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px',
            maxHeight: '420px',
            overflowY: 'auto',
            paddingRight: '6px'
          }}>
            {chatHistory.length === 0 ? (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '36px 20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.9rem'
              }}>
                Ask any question about your lab tests, medicines, or health plan.
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* User Question */}
                  <div style={{
                    alignSelf: 'flex-end',
                    backgroundColor: '#0d7c6b',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: '14px 14px 2px 14px',
                    maxWidth: '80%',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    {msg.question}
                  </div>

                  {/* AI Response */}
                  <div style={{
                    alignSelf: 'flex-start',
                    backgroundColor: '#f1f5f9',
                    color: '#0f172a',
                    padding: '14px 18px',
                    borderRadius: '14px 14px 14px 2px',
                    maxWidth: '85%',
                    fontSize: '0.92rem',
                    lineHeight: 1.55,
                    border: '1px solid #e2e8f0'
                  }}>
                    {msg.answer === null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                        <RefreshCw size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                        <span>Clinical AI Agent is reviewing your health records...</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ whiteSpace: 'pre-line' }}>{msg.answer}</div>
                        {msg.refs?.length > 0 && (
                          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#64748b' }}>
                            <strong>Referenced Records:</strong> {msg.refs.join(' • ')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Question Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your reports, doctor consultation, or medications..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={asking || !question.trim()}
              style={{
                backgroundColor: '#0d7c6b',
                color: '#ffffff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: asking || !question.trim() ? 'not-allowed' : 'pointer',
                opacity: asking || !question.trim() ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(13, 124, 107, 0.25)'
              }}
            >
              <Send size={16} />
              {asking ? 'Thinking...' : 'Ask Agent'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
