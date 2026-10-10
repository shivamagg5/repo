'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@platform/auth';

export interface VenueLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/',         label: 'Overview',        icon: '🏛️' },
  { href: '/tables',   label: 'Floor & Tables',  icon: '🍾' },
  { href: '/door',     label: 'Door & Capacity', icon: '🚪' },
  { href: '/profile',  label: 'Venue Profile',   icon: '📍' },
  { href: '/calendar', label: 'Calendar',        icon: '📅' },
  { href: '/events',   label: 'Hosted Events',   icon: '🎪' },
  { href: '/staff',    label: 'Staff',           icon: '👥' },
];

export function VenueLayout({ children, title = 'Dashboard', subtitle, actions }: VenueLayoutProps) {
  const pathname = usePathname();
  const { user, profile, organizations, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeOrg = organizations?.find(o => o.type === 'venue' && o.status === 'active') ?? organizations?.[0];
  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'Venue Manager';
  const initial = displayName.charAt(0).toUpperCase();

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="dash-sidebar" style={{ height: onClose ? '100vh' : undefined }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="spin-slow" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--pink)' }}>✳</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#fff', letterSpacing: '0.06em' }}>
              {activeOrg?.name?.toUpperCase() ?? 'VENUE'}
            </span>
          </div>
          <span style={{ display: 'inline-flex', marginTop: '6px', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(26,255,122,0.2)', borderRadius: '100px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', textTransform: 'uppercase' }}>Venue Portal</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>✕</button>
        )}
      </div>

      <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 8px', marginBottom: '8px' }}>Navigation</p>
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onClose} className={`dash-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: '#080808', flexShrink: 0 }}>{initial}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
        </div>
        <button type="button" onClick={() => logout()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '14px', padding: '4px', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pink)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>↩</button>
      </div>
    </div>
  );

  return (
    <div className="dash-shell">
      <div style={{ display: 'none' }} className="dash-sidebar-desktop"><SidebarContent /></div>
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
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-2)', letterSpacing: '0.06em' }}>VENUE</span>
            <span style={{ color: 'var(--text-3)', fontSize: '16px' }}>/</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-1)', letterSpacing: '0.06em' }}>{title.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              LIVE
            </div>
            {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#080808' }}>{initial}</div>
          </div>
        </div>
        <div className="dash-content">
          <div className="dash-page-header">
            <div>
              <h1 className="dash-page-title">{title.toUpperCase()}</h1>
              {subtitle && <p className="dash-page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}
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
