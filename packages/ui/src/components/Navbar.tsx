'use client';

import React, { useState } from 'react';
import { SearchInput } from './SearchInput.js';
import { Button } from './Button.js';
import { Drawer } from './Drawer.js';
import { IconButton } from './IconButton.js';

export interface NavbarProps {
  appName?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: (val: string) => void;
  links?: { href: string; label: string }[];
  currentPath?: string;
  onNavigate?: (href: string) => void;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  appName = 'EventPlatform',
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  links = [
    { href: '/events', label: 'Explore Events' },
    { href: '/venues', label: 'Venues' },
  ],
  currentPath = '/',
  onNavigate,
  user,
  onLogin,
  onRegister,
  onLogout,
  className,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit?.(searchQuery);
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Attendee';

  return (
    <header
      className={`sticky top-0 z-50 ${className ?? ''}`}
      style={{
        backgroundColor: 'rgba(9, 12, 21, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 16px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate?.('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md, 12px)',
              background: 'linear-gradient(135deg, var(--color-brand, #7C3AED) 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: '900',
              fontSize: '18px',
              boxShadow: 'var(--shadow-brand, 0 4px 20px rgba(124, 58, 237, 0.35))',
            }}
          >
            E
          </div>
          <span
            style={{
              fontWeight: '800',
              fontFamily: 'var(--font-display, Outfit, sans-serif)',
              fontSize: '20px',
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            {appName}
          </span>
        </div>

        {/* Global Search Bar (Desktop) */}
        {onSearchSubmit && (
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
            <SearchInput
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search concerts, comedy, festivals..."
              shortcut="⌘K"
            />
          </form>
        )}

        {/* Nav Links & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <nav className="hidden md:flex items-center gap-6" style={{ fontSize: '14px', fontWeight: '600' }}>
            {links.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => onNavigate?.(link.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentPath === link.href ? '#FFFFFF' : 'var(--color-text-secondary, #94A3B8)',
                  cursor: 'pointer',
                  padding: '4px 0',
                  fontWeight: currentPath === link.href ? '700' : '500',
                }}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="focus-ring"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px 4px 4px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
                  border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </span>
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    marginTop: '8px',
                    width: '200px',
                    backgroundColor: 'var(--color-bg-surface-elevated, #182035)',
                    border: '1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16))',
                    borderRadius: 'var(--radius-md, 12px)',
                    boxShadow: 'var(--shadow-lg, 0 12px 36px rgba(0, 0, 0, 0.65))',
                    padding: '6px',
                    zIndex: 'var(--z-overlay, 300)',
                  }}
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate?.('/tickets')}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: 'none', color: '#F8FAFC', cursor: 'pointer', fontSize: '13px' }}
                  >
                    🎟️ My Tickets
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('/orders')}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: 'none', color: '#F8FAFC', cursor: 'pointer', fontSize: '13px' }}
                  >
                    🧾 Order History
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('/profile')}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: 'none', color: '#F8FAFC', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ⚙️ Account Settings
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'var(--color-border, rgba(255, 255, 255, 0.08))', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: 'none', color: '#F87171', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onLogin && (
                <Button variant="ghost" size="sm" onClick={onLogin}>
                  Sign In
                </Button>
              )}
              {onRegister && (
                <Button variant="brand-glow" size="sm" onClick={onRegister}>
                  Get Started
                </Button>
              )}
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <div className="md:hidden">
            <IconButton
              variant="secondary"
              size="sm"
              label="Open navigation menu"
              icon={<span>☰</span>}
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <Drawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} title="Menu" position="right" width="280px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {links.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => {
                onNavigate?.(link.href);
                setMobileMenuOpen(false);
              }}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: currentPath === link.href ? 'var(--color-brand, #7C3AED)' : 'transparent',
                color: '#FFFFFF',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </Drawer>
    </header>
  );
};
