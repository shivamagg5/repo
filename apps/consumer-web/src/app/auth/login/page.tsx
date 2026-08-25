'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function LoginForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/';
  const redirectTo = rawRedirect.startsWith('/auth') ? '/' : rawRedirect;

  const { login, loginAsDemo, loginWithGoogle, loginWithApple, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('consumer1@staging.eventplatform.com');
  const [password, setPassword] = useState('Consumer@12345');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null); clearError();
    if (!email.trim() || !password) { setLocalError('Please fill in both fields.'); return; }
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
      const res = await loginAsDemo('consumer');
      if (res.success) { window.location.href = redirectTo; }
    } catch { setLocalError('Demo login failed.'); }
    finally { setSubmitting(false); }
  };

  const displayError = localError || authError;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--black)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'none', position: 'relative',
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden', alignItems: 'flex-end', padding: '48px',
      }} className="login-left-panel">
        {/* BG gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,31,109,0.2) 0%, rgba(8,8,8,0.8) 60%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 5rem)',
            lineHeight: 0.92, letterSpacing: '0.03em',
            color: '#fff', marginBottom: '20px',
          }}>
            LIVE.<br/>LOUD.<br/><span style={{ color: 'var(--pink)' }}>LEGENDARY.</span>
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', fontFamily: 'var(--font-body)', lineHeight: 1.6, maxWidth: '280px' }}>
            Book tickets to the best live events in India. No bots. No fakes. Just real nights.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: '480px', minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        background: 'var(--black)',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', marginBottom: '40px', alignSelf: 'flex-start' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--pink)', marginRight: '8px' }}>✳</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: '#fff', letterSpacing: '0.1em' }}>EVENTPLATFORM</span>
        </Link>

        <div style={{ width: '100%' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            lineHeight: 1, letterSpacing: '0.04em',
            color: '#fff', marginBottom: '6px',
          }}>
            WELCOME BACK
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '32px', fontFamily: 'var(--font-body)' }}>
            Sign in to manage your tickets and more.
          </p>

          {/* Demo button */}
          <button
            type="button"
            onClick={handleDemo}
            disabled={submitting}
            className="btn-demo-pulse"
            style={{
              width: '100%',
              background: 'var(--pink)',
              border: 'none', borderRadius: '12px',
              color: '#fff', padding: '14px 20px',
              fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginBottom: '20px',
              letterSpacing: '0.03em',
            }}
          >
            {submitting ? 'Loading…' : '🚀 Try Demo — 1 Click Access'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>or sign in</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Error */}
          {displayError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '12px 14px',
              fontSize: '13px', color: '#fc8181', marginBottom: '16px',
              fontFamily: 'var(--font-body)',
            }}>
              ⚠️ {displayError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="login-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1.5px solid var(--border-strong)',
                borderRadius: '12px', color: '#fff',
                padding: '13px 20px',
                fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                transition: 'background 150ms, border-color 150ms',
                letterSpacing: '0.03em',
              }}
            >
              {submitting ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          {/* Social */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
            {[
              { icon: 'G', label: 'Google', provider: 'google' as const },
              { icon: '🍎', label: 'Apple', provider: 'apple' as const },
            ].map(s => (
              <button
                key={s.provider}
                type="button"
                onClick={async () => { try { s.provider === 'google' ? await loginWithGoogle() : await loginWithApple(); } catch { setLocalError(`${s.label} login failed.`); } }}
                style={{
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '11px',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  color: 'var(--text-2)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'border-color 150ms, color 150ms',
                }}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-2)', marginTop: '24px', fontFamily: 'var(--font-body)' }}>
            No account?{' '}
            <Link href="/auth/register" style={{ color: 'var(--pink)', fontWeight: 700, textDecoration: 'none' }}>
              Sign up free →
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

export default function ConsumerLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
        Loading…
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
