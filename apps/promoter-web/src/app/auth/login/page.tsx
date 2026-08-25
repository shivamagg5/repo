'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function PromoterLoginForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/';
  const redirectTo = rawRedirect.startsWith('/auth') ? '/' : rawRedirect;
  const { login, loginAsDemo, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('promoter1@staging.eventplatform.com');
  const [password, setPassword] = useState('Promoter@12345');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Yellow accent for promoter brand identity
  const yellow = '#FFE500';
  const yellowDim = 'rgba(255,229,0,0.12)';
  const yellowBorder = 'rgba(255,229,0,0.3)';

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
      const res = await loginAsDemo('promoter');
      if (res.success) { window.location.href = redirectTo; }
    } catch { setLocalError('Demo login failed.'); }
    finally { setSubmitting(false); }
  };

  const displayError = localError || authError;

  return (
    <div className="dash-login-page">
      {/* Brand Panel */}
      <div className="dash-login-brand-panel">
        {/* Yellow gradient glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,229,0,0.10) 0%, rgba(8,8,8,0.94) 60%)',
        }} />
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Decorative badge */}
        <div style={{
          position: 'absolute', top: '48px', right: '48px',
          background: yellowDim, border: `1px solid ${yellowBorder}`,
          borderRadius: '100px', fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.14em', color: yellow, padding: '5px 14px',
          textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
        }}>
          Attribution Live
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
            lineHeight: 0.9, letterSpacing: '0.03em',
            color: '#fff', marginBottom: '16px',
          }}>
            PROMOTE.<br/>EARN.<br/><span style={{ color: yellow }}>SCALE.</span>
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65, maxWidth: '220px', marginLeft: 'auto' }}>
            Track campaigns, monitor your referral earnings, and grow your affiliate reach in real time.
          </p>
          {/* Stats strip */}
          <div style={{
            marginTop: '28px', display: 'flex', gap: '20px',
            justifyContent: 'flex-end', flexWrap: 'wrap',
          }}>
            {[
              { label: 'Commission', value: 'Up to 15%' },
              { label: 'Payout', value: 'Weekly' },
              { label: 'Tracking', value: 'Real-time' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: yellow, letterSpacing: '0.04em', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>{s.label}</p>
              </div>
            ))}
          </div>
          {/* Tags */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {['🚀 Campaigns', '💰 Earnings', '📈 Analytics', '👤 Profile'].map(tag => (
              <span key={tag} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: '100px', fontSize: '11px', color: 'var(--text-2)',
                padding: '4px 12px',
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="dash-login-form-panel">
        {/* Logo */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: yellow }}>✳</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#fff', letterSpacing: '0.1em' }}>EVENTPLATFORM</span>
          </div>
          <span style={{
            display: 'inline-flex',
            background: yellowDim,
            color: yellow,
            border: `1px solid ${yellowBorder}`,
            borderRadius: '100px',
            fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '3px 10px',
          }}>AFFILIATE HUB</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          lineHeight: 1, letterSpacing: '0.04em',
          color: '#fff', marginBottom: '6px',
        }}>
          SIGN IN
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '32px' }}>
          Track your campaigns and affiliate earnings.
        </p>

        {/* 1-Click Demo */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={submitting}
          style={{
            width: '100%',
            background: yellow,
            border: 'none',
            borderRadius: '12px',
            color: '#080808',
            padding: '14px 20px',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            marginBottom: '20px',
            letterSpacing: '0.03em',
            transition: 'box-shadow 150ms, transform 150ms',
          }}
          onMouseEnter={e => {
            if (!submitting) {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(255,229,0,0.35)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            (e.currentTarget as HTMLElement).style.transform = 'none';
          }}
        >
          {submitting ? 'Loading…' : '⚡ Promoter Demo — 1 Click'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>or email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {displayError && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', padding: '12px 14px',
            fontSize: '13px', color: '#fc8181', marginBottom: '16px',
          }}>
            ⚠️ {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{
              display: 'block', fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-3)', marginBottom: '8px',
            }}>Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@affiliate.com"
              className="dash-login-input"
              onFocus={e => { e.currentTarget.style.borderColor = yellow; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-3)', marginBottom: '8px',
            }}>Password</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="dash-login-input"
              onFocus={e => { e.currentTarget.style.borderColor = yellow; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              border: '1.5px solid var(--border-strong)',
              borderRadius: '12px',
              color: '#fff',
              padding: '13px 20px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'background 150ms',
            }}
            onMouseEnter={e => {
              if (!submitting) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
            }}
          >
            {submitting ? 'Signing in…' : 'Sign In with Credentials →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: '28px', paddingTop: '16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '11px', color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)',
        }}>
          <span>🔐 Secure Session</span>
          <span style={{ color: yellow }}>ATTRIBUTION LIVE</span>
        </div>
      </div>
    </div>
  );
}

export default function PromoterLoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: 'var(--black)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-3)',
      }}>
        Loading…
      </div>
    }>
      <PromoterLoginForm />
    </Suspense>
  );
}
