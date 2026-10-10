'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@platform/auth';

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/';
  const redirectTo = rawRedirect.startsWith('/auth') ? '/' : rawRedirect;

  const { login, loginAsDemo, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('admin@staging.eventplatform.com');
  const [password, setPassword] = useState('Admin@12345');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!email.trim() || !password) {
      setLocalError('Both email and password are required.');
      return;
    }
    const isDev = process.env.NODE_ENV !== 'production';
    setSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        window.location.href = redirectTo;
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch {
      setLocalError('Unexpected authentication error.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDev = process.env.NODE_ENV !== 'production';

  const handleDemo = async () => {
    if (!isDev) {
      setLocalError('Demo personas are disabled in production.');
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('eventplatform_demo_role', 'admin');
        document.cookie = 'eventplatform_demo_role=admin; path=/; max-age=86400; SameSite=Lax';
        document.cookie = 'sb-access-token=mock-admin-token-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9; path=/; max-age=86400; SameSite=Lax';
      }
      await loginAsDemo('admin');
      window.location.href = redirectTo;
    } catch {
      setLocalError('Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, rgba(255,31,109,0.12) 0%, #08080c 70%)',
      padding: '24px 16px',
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'rgba(18,18,28,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '36px 32px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,31,109,0.15)',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#fff', letterSpacing: '0.08em' }}>
              EVENTPLATFORM
            </span>
          </div>
          <div>
            <span style={{
              display: 'inline-block',
              background: 'var(--pink-dim)', color: 'var(--pink)',
              border: '1px solid rgba(255,31,109,0.3)',
              borderRadius: '100px', fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 12px',
            }}>
              SUPERADMIN COMMAND HQ
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px' }}>
            Company Governance, Tenant Moderation & Escrow Controls
          </p>
        </div>

        {/* 1-Click Superadmin Access (Development Only) */}
        {isDev && (
          <>
            <button
              type="button"
              onClick={handleDemo}
              disabled={submitting}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--pink), #e11d48)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                padding: '14px 20px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 8px 24px rgba(255,31,109,0.35)',
                marginBottom: '20px',
                letterSpacing: '0.02em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
            >
              {submitting ? 'Entering Command Center…' : 'Enter Superadmin Control Center (Demo)'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                or password credentials
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>
          </>
        )}

        {displayError && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '12px', color: '#fc8181', marginBottom: '16px',
          }}>
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{
              display: 'block', fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-3)', marginBottom: '6px',
            }}>Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@staging.eventplatform.com"
              style={{
                width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '11px 14px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-3)', marginBottom: '6px',
            }}>Master Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '11px 14px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', background: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              borderRadius: '10px', color: '#fff', padding: '12px 20px',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            {submitting ? 'Verifying…' : 'Sign In with Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#08080c' }} />}>
      <AdminLoginForm />
    </Suspense>
  );
}
