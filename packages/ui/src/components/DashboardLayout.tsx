'use client';

import React, { useState } from 'react';
import { Drawer } from './Drawer.js';
import { IconButton } from './IconButton.js';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'brand' | 'success' | 'warning' | 'danger';
}

export interface DashboardLayoutProps {
  appName: string;
  appBadge?: string;
  appBadgeColor?: 'brand' | 'accent' | 'warning' | 'info';
  navItems: NavItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  organizationName?: string | null;
  organizationType?: string | null;
  onLogout?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  appName,
  appBadge = 'CONSOLE',
  appBadgeColor = 'brand',
  navItems,
  currentPath,
  onNavigate,
  title,
  subtitle,
  actions,
  user,
  organizationName,
  organizationType,
  onLogout,
  children,
  className,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const getBadgeBg = () => {
    switch (appBadgeColor) {
      case 'brand': return 'var(--color-brand, #7C3AED)';
      case 'accent': return 'var(--color-accent-pink, #EC4899)';
      case 'warning': return 'var(--color-warning, #F59E0B)';
      case 'info': return 'var(--color-info, #3B82F6)';
      default: return 'var(--color-brand, #7C3AED)';
    }
  };

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div>
        {/* Brand & Organization */}
        <div style={{ padding: '24px 20px 16px 20px', borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontWeight: '800', fontFamily: 'var(--font-display, Outfit, sans-serif)', fontSize: '18px', color: '#FFFFFF' }}>
              {appName}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.05em',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: getBadgeBg(),
                color: '#FFFFFF',
              }}
            >
              {appBadge}
            </span>
          </div>

          {organizationName && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #94A3B8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🏢 {organizationName} {organizationType ? `(${organizationType})` : ''}
            </div>
          )}
        </div>

        {/* Navigation List */}
        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.href);
                  setMobileDrawerOpen(false);
                }}
                className="focus-ring"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--color-brand, #7C3AED)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--color-text-secondary, #94A3B8)',
                  cursor: 'pointer',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: 'var(--text-body-small, 14px)',
                  transition: 'background-color var(--transition-fast, 120ms ease-out)',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.icon && <span style={{ fontSize: '16px' }}>{item.icon}</span>}
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-pill, 9999px)',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-bg-surface-hover, #222C46)',
                      color: '#FFFFFF',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout Footer */}
      {user && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))', backgroundColor: 'var(--color-bg-surface-elevated, #182035)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || user.email?.split('@')[0] || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.role ?? user.email}
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: '100%',
                padding: '6px 0',
                border: 'none',
                background: 'none',
                color: '#F87171',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              🚪 Sign Out
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-base, #090C15)',
        color: 'var(--color-text-primary, #F8FAFC)',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {/* Desktop Sidebar (Persistent >= 768px) */}
      <aside
        className="hidden md:flex flex-col"
        style={{
          width: '260px',
          flexShrink: 0,
          backgroundColor: 'var(--color-bg-surface, #111625)',
          borderRight: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Navigation (< 768px) */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title={appName}
        position="left"
        width="280px"
      >
        {navContent}
      </Drawer>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            backgroundColor: 'var(--color-bg-surface, #111625)',
            borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            position: 'sticky',
            top: 0,
            zIndex: 'var(--z-sticky, 100)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="md:hidden">
              <IconButton
                variant="secondary"
                size="sm"
                label="Toggle navigation drawer"
                icon={<span>☰</span>}
                onClick={() => setMobileDrawerOpen(true)}
              />
            </div>

            <div>
              {title && (
                <h1 style={{ margin: 0, fontSize: 'var(--text-h3, 18px)', fontWeight: '800', fontFamily: 'var(--font-display, Outfit, sans-serif)', color: '#FFFFFF' }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ margin: 0, fontSize: 'var(--text-caption, 12px)', color: 'var(--color-text-secondary, #94A3B8)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{actions}</div>}
        </header>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
