import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import logoImg from '../assets/mediz.png';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
const STATUS = { VERIFYING: 'verifying', SUCCESS: 'success', ALREADY: 'already', ERROR: 'error', RESENDING: 'resending', RESENT: 'resent' };

const s = {
    page: { minHeight:'100vh', background:'linear-gradient(135deg,#f0fdfa 0%,#e0f2fe 50%,#f0fdf4 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'Inter','Segoe UI',Arial,sans-serif", position:'relative', overflow:'hidden' },
    orb1: { position:'fixed', top:'-80px', right:'-80px', width:'400px', height:'400px', background:'radial-gradient(circle,rgba(13,148,136,0.15) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' },
    orb2: { position:'fixed', bottom:'-80px', left:'-80px', width:'350px', height:'350px', background:'radial-gradient(circle,rgba(3,105,161,0.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' },
    card: { background:'rgba(255,255,255,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1.5px solid rgba(13,148,136,0.2)', borderRadius:'24px', padding:'44px 40px', width:'100%', maxWidth:'480px', textAlign:'center', boxShadow:'0 24px 60px -10px rgba(0,0,0,0.15)', position:'relative', zIndex:10, animation:'slideUp 0.4s ease-out' },
    logo: { height:'52px', objectFit:'contain', marginBottom:'8px' },
    brand: { margin:'0 0 28px', fontSize:'20px', fontWeight:800, color:'#004D40', letterSpacing:'-0.5px' },
    iconRing: (c) => ({ width:'80px', height:'80px', borderRadius:'50%', background:`${c}18`, border:`3px solid ${c}40`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }),
    title: { margin:'0 0 10px', fontSize:'22px', fontWeight:800, color:'#1e293b', letterSpacing:'-0.3px' },
    message: { margin:'0 0 28px', fontSize:'14px', color:'#64748b', lineHeight:1.7 },
    btn: (c='#0d9488') => ({ display:'inline-flex', alignItems:'center', gap:'8px', padding:'12px 28px', borderRadius:'12px', background:c, color:'#fff', border:'none', fontSize:'14px', fontWeight:700, cursor:'pointer', textDecoration:'none', transition:'all 0.2s ease', boxShadow:`0 4px 14px ${c}50`, fontFamily:'inherit' }),
    linkBtn: { display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'12px', background:'none', border:'none', color:'#0d9488', fontSize:'13px', fontWeight:600, cursor:'pointer', textDecoration:'none', padding:'4px 8px' },
    emailInput: { width:'100%', padding:'10px 14px', borderRadius:'10px', border:'1.5px solid #B2DFDB', fontSize:'14px', marginBottom:'12px', boxSizing:'border-box', fontFamily:'inherit', outline:'none' },
};

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const [status, setStatus] = useState(STATUS.VERIFYING);
    const [errorMsg, setErrorMsg] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resendError, setResendError] = useState('');

    const verifyToken = useCallback(async () => {
        if (!token) { setStatus(STATUS.ERROR); setErrorMsg('No verification token found in the link. Please use the link from your email.'); return; }
        setStatus(STATUS.VERIFYING);
        try {
            const res = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setStatus(data.message?.toLowerCase().includes('already') ? STATUS.ALREADY : STATUS.SUCCESS);
            } else {
                setStatus(STATUS.ERROR);
                setErrorMsg(data.message ?? 'The link may be invalid or expired.');
            }
        } catch { setStatus(STATUS.ERROR); setErrorMsg('Unable to reach the server. Check your connection.'); }
    }, [token]);

    useEffect(() => { verifyToken(); }, [verifyToken]);

    const handleResend = async () => {
        if (!resendEmail.trim()) { setResendError('Please enter your email address.'); return; }
        setResendError(''); setStatus(STATUS.RESENDING);
        try {
            const res = await fetch(`${API_BASE}/api/auth/resend-verification`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email: resendEmail.trim().toLowerCase() }) });
            const data = await res.json().catch(() => ({}));
            if (res.ok) { setStatus(STATUS.RESENT); }
            else { setStatus(STATUS.ERROR); setResendError(data.message ?? 'Could not resend. Try again.'); }
        } catch { setStatus(STATUS.ERROR); setResendError('Server error. Please try again.'); }
    };

    const renderContent = () => {
        switch (status) {
            case STATUS.VERIFYING: return (
                <><div style={s.iconRing('#0d9488')}><Loader2 size={36} color="#0d9488" className="hb-spin" /></div><h1 style={s.title}>Verifying Your Email...</h1><p style={s.message}>Please wait while we confirm your email address.</p></>
            );
            case STATUS.SUCCESS: return (
                <><div style={s.iconRing('#059669')}><CheckCircle2 size={40} color="#059669" /></div><h1 style={s.title}>Email Verified! ??</h1><p style={s.message}>Your email has been successfully verified.<br/>You can now sign in to your <strong>Health Bridge</strong> account.</p><Link to="/login" style={s.btn('#059669')}>Sign In Now <ArrowRight size={16}/></Link></>
            );
            case STATUS.ALREADY: return (
                <><div style={s.iconRing('#0369a1')}><CheckCircle2 size={40} color="#0369a1" /></div><h1 style={s.title}>Already Verified</h1><p style={s.message}>This email address has already been verified. You can sign in.</p><Link to="/login" style={s.btn('#0369a1')}>Go to Sign In <ArrowRight size={16}/></Link></>
            );
            case STATUS.ERROR: return (
                <><div style={s.iconRing('#ef4444')}><XCircle size={40} color="#ef4444" /></div><h1 style={s.title}>Verification Failed</h1><p style={s.message}>{errorMsg || 'The verification link is invalid or has expired.'}</p>
                  <div style={{textAlign:'left',marginBottom:'12px'}}>
                    <p style={{fontSize:'13px',color:'#475569',margin:'0 0 8px',fontWeight:600}}>Request a new verification link:</p>
                    <input id="resend-email" type="email" placeholder="Your registered email address" value={resendEmail} onChange={e=>setResendEmail(e.target.value)} style={s.emailInput}/>
                    {resendError && <p style={{margin:'0 0 8px',fontSize:'12px',color:'#ef4444'}}>{resendError}</p>}
                  </div>
                  <button onClick={handleResend} style={s.btn('#0d9488')}><Mail size={15}/> Resend Verification Email</button>
                  <br/><Link to="/login" style={s.linkBtn}>? Back to Sign In</Link>
                </>
            );
            case STATUS.RESENDING: return (
                <><div style={s.iconRing('#0d9488')}><Loader2 size={36} color="#0d9488" className="hb-spin"/></div><h1 style={s.title}>Sending...</h1><p style={s.message}>Dispatching a new verification email to your inbox.</p></>
            );
            case STATUS.RESENT: return (
                <><div style={s.iconRing('#0d9488')}><Mail size={36} color="#0d9488"/></div><h1 style={s.title}>Email Sent! ??</h1><p style={s.message}>A new verification link was sent to <strong>{resendEmail}</strong>.<br/>Please check your inbox and spam folder.</p><Link to="/login" style={s.btn('#0d9488')}>Back to Sign In <ArrowRight size={16}/></Link></>
            );
            default: return null;
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                @keyframes popIn { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
                @keyframes spinAnim { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                .hb-spin { animation: spinAnim 1s linear infinite; }
            `}</style>
            <div style={s.page}>
                <div style={s.orb1}/>
                <div style={s.orb2}/>
                <div style={s.card}>
                    <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} className="hover:opacity-90 transition-opacity" title="Return to Health Bridge">
                        <img src={logoImg} alt="Health Bridge" style={s.logo}/>
                        <p style={s.brand}>Health Bridge</p>
                    </Link>
                    {renderContent()}
                </div>
            </div>
        </>
    );
}
