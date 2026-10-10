'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@platform/auth';

export interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// ─── Professional SVG Icons ───────────────────────────────────────────────────
const Icons = {
  overview: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  customers: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  organizers: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  events: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  promoters: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  marketing: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M12 8v8"/><path d="M8 12h8"/>
    </svg>
  ),
  support: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  orders: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  settlements: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  audit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  cms: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { href: '/',            label: 'Command Center',      iconKey: 'overview'    as const },
  { href: '/customers',   label: 'Customers & Buyers',  iconKey: 'customers'   as const },
  { href: '/organizers',  label: 'Organizers & KYB',    iconKey: 'organizers'  as const },
  { href: '/events',      label: 'Events & Moderation', iconKey: 'events'      as const },
  { href: '/promoters',   label: 'Promoter Network',    iconKey: 'promoters'   as const },
  { href: '/marketing',   label: 'Marketing & Wallets', iconKey: 'marketing'   as const },
  { href: '/cms',         label: 'CMS & Landing Hero',  iconKey: 'cms'         as const },
  { href: '/support',     label: 'Customer Support',    iconKey: 'support'     as const },
  { href: '/orders',      label: 'Orders & Receipts',   iconKey: 'orders'      as const },
  { href: '/settlements', label: 'Finance & Payouts',   iconKey: 'settlements' as const },
  { href: '/users',       label: 'Platform Staff',      iconKey: 'users'       as const },
  { href: '/audit-logs',  label: 'Audit & Compliance',  iconKey: 'audit'       as const },
];

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'Admin HQ';
  const initial = displayName.charAt(0).toUpperCase();

  const Sidebar = ({ onClose }: { onClose?: () => void }) => (
    <div
      className="dash-sidebar"
      style={{
        width: '236px',
        minHeight: '100vh',
        background: '#12121C',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        color: '#F8FAFC',
      }}
    >
      {/* Brand */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF2D78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: '15px', color: '#fff', letterSpacing: '0.06em' }}>
              PLATFORM HQ
            </span>
          </div>
          <div style={{
            display: 'inline-flex', marginTop: '6px',
            background: 'rgba(255,45,120,0.14)', color: '#FF2D78',
            border: '1px solid rgba(255,45,120,0.25)',
            borderRadius: '100px', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.1em', padding: '2px 8px', textTransform: 'uppercase',
          }}>
            Superadmin Sentinel
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', color: '#55556E',
            fontSize: '18px', cursor: 'pointer', padding: '4px',
          }}>✕</button>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <p style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#55556E',
          padding: '0 8px', marginBottom: '8px',
        }}>Company Operations</p>
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`dash-nav-item${isActive ? ' active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FF2D78' : '#94A3B8',
                background: isActive ? 'rgba(255,45,120,0.14)' : 'transparent',
                border: isActive ? '1px solid rgba(255,45,120,0.28)' : '1px solid transparent',
                textDecoration: 'none',
                margin: '2px 0',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                background: isActive ? 'rgba(255,45,120,0.2)' : '#202032',
                color: isActive ? '#FF2D78' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {Icons[item.iconKey]}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User Footer */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#FF2D78', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: '#fff',
          flexShrink: 0,
        }}>
          {initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
            {displayName}
          </p>
          <p style={{ fontSize: '10px', color: '#55556E', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0 0' }}>
            {user?.email ?? 'superadmin@platform.com'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          title="Sign out"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#55556E', padding: '4px', flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="dash-shell"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#0D0D14',
        color: '#F8FAFC',
        width: '100%',
      }}
    >
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.8)', display: 'flex',
        }}>
          <Sidebar onClose={() => setMobileOpen(false)} />
          <div style={{ flex: 1 }} onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div
        className="dash-main"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          background: '#0D0D14',
          overflowX: 'hidden',
        }}
      >
        {/* Top Header */}
        <header
          className="dash-header"
          style={{
            height: '64px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(18, 18, 28, 0.9)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              style={{
                display: 'none', background: 'none', border: 'none',
                color: '#94A3B8', cursor: 'pointer', padding: '4px',
              }}
              className="mobile-menu-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{
                  fontFamily: 'Anton, sans-serif', fontSize: '20px',
                  color: '#fff', letterSpacing: '0.04em', margin: 0,
                }}>
                  {title.toUpperCase()}
                </h1>
                <span style={{
                  padding: '2px 8px', borderRadius: '100px', fontSize: '9px',
                  fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: 'rgba(26,255,122,0.15)', color: '#1AFF7A',
                  border: '1px solid rgba(26,255,122,0.3)',
                }}>LIVE</span>
              </div>
              {subtitle && (
                <p style={{ fontSize: '11px', color: '#55556E', margin: '2px 0 0' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {actions}
          </div>
        </header>

        {/* Page Content */}
        <main
          className="dash-content"
          style={{
            flex: 1,
            padding: '24px 28px',
            overflowY: 'auto',
            background: '#0D0D14',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
