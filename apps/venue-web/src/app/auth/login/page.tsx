'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function VenueLoginForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/';
  const redirectTo = rawRedirect.startsWith('/auth') ? '/' : rawRedirect;
  const { login, loginAsDemo, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('venue1@staging.eventplatform.com');
  const [password, setPassword] = useState('Venue@12345');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const green = '#1AFF7A';

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
      const res = await loginAsDemo('venue');
      if (res.success) { window.location.href = redirectTo; }
    } catch { setLocalError('Demo login failed.'); }
    finally { setSubmitting(false); }
  };

  const displayError = localError || authError;

  return (
    <div className="dash-login-page">
      <div className="dash-login-brand-panel">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(26,255,122,0.08) 0%, rgba(8,8,8,0.92) 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 6vw, 6rem)', lineHeight: 0.9, letterSpacing: '0.03em', color: '#fff', marginBottom: '16px' }}>
            BOOK.<br/>HOST.<br/><span style={{ color: green }}>THRIVE.</span>
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '220px', marginLeft: 'auto' }}>
            Manage your venue calendar, hosted events, and staff from one powerful portal.
          </p>
        </div>
      </div>

      <div className="dash-login-form-panel">
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: green }}>✳</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#fff', letterSpacing: '0.1em' }}>EVENTPLATFORM</span>
          </div>
          <span style={{ display: 'inline-flex', background: 'rgba(26,255,122,0.1)', color: green, border: '1px solid rgba(26,255,122,0.25)', borderRadius: '100px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px' }}>VENUE PORTAL</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1, letterSpacing: '0.04em', color: '#fff', marginBottom: '6px' }}>SIGN IN</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '32px' }}>Manage your venue, calendar, and hosted events.</p>

        <button type="button" onClick={handleDemo} disabled={submitting}
          style={{ width: '100%', background: green, border: 'none', borderRadius: '12px', color: '#080808', padding: '14px 20px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginBottom: '20px', letterSpacing: '0.03em' }}>
          {submitting ? 'Loading…' : '🏛️ Venue Demo — 1 Click'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>or email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {displayError && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#fc8181', marginBottom: '16px' }}>⚠️ {displayError}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="venue@arena.com" className="dash-login-input" style={{ borderColor: undefined } as any}
              onFocus={e => { e.currentTarget.style.borderColor = green; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="dash-login-input"
              onFocus={e => { e.currentTarget.style.borderColor = green; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
          </div>
          <button type="submit" disabled={submitting} style={{ width: '100%', background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)', borderRadius: '12px', color: '#fff', padding: '13px 20px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VenueLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>Loading…</div>}>
      <VenueLoginForm />
    </Suspense>
  );
}
