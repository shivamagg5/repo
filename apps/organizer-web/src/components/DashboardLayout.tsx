'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// ─── Clean SVG Icons ──────────────────────────────────────────────────────────
const Icons = {
  overview: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  events: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  orders: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  data: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  marketing: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  team: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  payout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  promoters: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settlements: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { href: '/',           label: 'Overview',     iconKey: 'overview'    as const },
  { href: '/events',     label: 'Events',       iconKey: 'events'      as const },
  { href: '/orders',     label: 'Orders',       iconKey: 'orders'      as const },
  { href: '/data',       label: 'Data',         iconKey: 'data'        as const },
  { href: '/promoters',  label: 'Promoters',    iconKey: 'promoters'   as const },
  { href: '/marketing',  label: 'Marketing',    iconKey: 'marketing'   as const },
  { href: '/team',       label: 'Team',         iconKey: 'team'        as const },
  { href: '/settlements',label: 'Settlements',  iconKey: 'settlements' as const },
  { href: '/payout',     label: 'Bank Accounts',iconKey: 'payout'      as const },
];

export function DashboardLayout({ children, title = 'Dashboard', subtitle, actions }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, organizations, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeOrg = organizations?.find(o => o.type === 'organizer' && o.status === 'active') ?? organizations?.[0];
  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'Organizer';
  const initial = displayName.charAt(0).toUpperCase();

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="dash-sidebar" style={{ height: onClose ? '100vh' : undefined }}>
      {/* Brand */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#fff', letterSpacing: '0.06em' }}>
              {activeOrg?.name?.toUpperCase() ?? 'ORGANIZER'}
            </span>
          </div>
          <span style={{
            display: 'inline-flex', marginTop: '6px',
            background: 'var(--pink-dim)', color: 'var(--pink)',
            border: '1px solid rgba(255,31,109,0.25)',
            borderRadius: '100px', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.1em', padding: '2px 8px', textTransform: 'uppercase',
          }}>Organizer Console</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>✕</button>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 8px', marginBottom: '8px' }}>Navigation</p>
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`dash-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{Icons[item.iconKey]}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Quick Create */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <Link
          href="/events/new"
          className="btn-primary"
          style={{ width: '100%', textDecoration: 'none', justifyContent: 'center', padding: '9px 16px', borderRadius: '8px' }}
        >
          + Create Event
        </Link>
      </div>

      {/* User Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: '#fff', flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
        </div>
        <button type="button" onClick={() => logout()} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pink)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="dash-shell">
      <div style={{ display: 'none' }} className="dash-sidebar-desktop">
        <SidebarContent />
      </div>

      {mobileOpen && (
        <div className="dash-sidebar-overlay open" onClick={() => setMobileOpen(false)}>
          <div className="dash-sidebar-mobile open" onClick={e => e.stopPropagation()}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="dash-main">
        <div className="dash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="button" onClick={() => setMobileOpen(true)} className="dash-hamburger" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'currentColor', borderRadius: '1px' }} />
              <span style={{ display: 'block', width: '12px', height: '1.5px', background: 'currentColor', borderRadius: '1px' }} />
              <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'currentColor', borderRadius: '1px' }} />
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-2)', letterSpacing: '0.06em' }}>ORGANIZER</span>
            <span style={{ color: 'var(--text-3)', fontSize: '16px' }}>/</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-1)', letterSpacing: '0.06em' }}>{(title || 'DASHBOARD').toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              LIVE
            </div>
            {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}
            <Link href="/events/new" className="btn-primary" style={{ textDecoration: 'none', padding: '7px 16px', fontSize: '12px' }}>+ New Event</Link>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#fff' }}>{initial}</div>
          </div>
        </div>
        <div className="dash-content">
          <div className="dash-page-header">
            <div>
              <h1 className="dash-page-title">{(title || 'Dashboard').toUpperCase()}</h1>
              {subtitle && <p className="dash-page-subtitle">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) { .dash-sidebar-desktop { display: flex !important; } .dash-hamburger { display: none !important; } }
        @media (max-width: 767px) { .dash-sidebar-desktop { display: none !important; } }
      `}</style>
    </div>
  );
}
