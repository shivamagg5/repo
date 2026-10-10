'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function OrganizerLoginForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/';
  const redirectTo = rawRedirect.startsWith('/auth') ? '/' : rawRedirect;
  const { login, loginAsDemo, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('organizer@staging.eventplatform.com');
  const [password, setPassword] = useState('Organizer@12345');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null); clearError();
    if (!email.trim() || !password) { setLocalError('Both fields required.'); return; }
    setSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) { window.location.href = redirectTo; }
      else if (res.error) { setLocalError(res.error); }
    } catch { setLocalError('Unexpected error. Try again.'); }
    finally { setSubmitting(false); }
  };

  const handleDemo = async () => {
    setSubmitting(true); setLocalError(null);
    try {
      const res = await loginAsDemo('organizer');
      if (res.success) { window.location.href = redirectTo; }
    } catch { setLocalError('Demo login failed.'); }
    finally { setSubmitting(false); }
  };

  const displayError = localError || authError;

  return (
    <div className="dash-login-page">
      {/* Brand Panel */}
      <div className="dash-login-brand-panel">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,31,109,0.12) 0%, rgba(8,8,8,0.92) 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 6vw, 6rem)', lineHeight: 0.9, letterSpacing: '0.03em', color: '#fff', marginBottom: '16px' }}>
            CREATE.<br/>MANAGE.<br/><span style={{ color: 'var(--pink)' }}>PROFIT.</span>
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '220px', marginLeft: 'auto' }}>
            Your event empire starts here. Create, promote, sell, and settle — all in one dashboard.
          </p>
          <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {['🎪 Events', '🎟️ Tickets', '💰 Revenue', '📊 Analytics'].map(tag => (
              <span key={tag} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '100px', fontSize: '11px', color: 'var(--text-2)', padding: '4px 12px' }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="dash-login-form-panel">
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--pink)' }}>✳</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#fff', letterSpacing: '0.1em' }}>EVENTPLATFORM</span>
          </div>
          <span style={{ display: 'inline-flex', background: 'var(--pink-dim)', color: 'var(--pink)', border: '1px solid rgba(255,31,109,0.3)', borderRadius: '100px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px' }}>ORGANIZER CONSOLE</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1, letterSpacing: '0.04em', color: '#fff', marginBottom: '6px' }}>
          SIGN IN
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '32px' }}>
          Manage your events, revenue, and team.
        </p>

        <button type="button" onClick={handleDemo} disabled={submitting} className="btn-pulse"
          style={{ width: '100%', background: 'var(--pink)', border: 'none', borderRadius: '12px', color: '#fff', padding: '14px 20px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginBottom: '20px', letterSpacing: '0.03em' }}>
          {submitting ? 'Loading…' : '🚀 Organizer Demo — 1 Click'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>or email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {displayError && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#fc8181', marginBottom: '16px' }}>
            ⚠️ {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="organizer@company.com" className="dash-login-input" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="dash-login-input" />
          </div>
          <button type="submit" disabled={submitting} style={{ width: '100%', background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)', borderRadius: '12px', color: '#fff', padding: '13px 20px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, transition: 'background 150ms' }}>
            {submitting ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-3)', marginTop: '24px' }}>
          Not an organizer?{' '}
          <a href="http://localhost:3000" style={{ color: 'var(--pink)', fontWeight: 700 }}>EventPlatform →</a>
        </p>
      </div>
    </div>
  );
}

export default function OrganizerLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>Loading…</div>}>
      <OrganizerLoginForm />
    </Suspense>
  );
}
