'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@platform/auth';

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { status, profile, user, logout } = useAuth();

  const displayName = profile?.name || user?.user_metadata?.['name'] || user?.email?.split('@')[0] || 'User';
  const isAuthed = status === 'authenticated';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: 'Home', emoji: '🏠' },
    { href: '/events', label: 'Events', emoji: '🎪' },
    { href: '/events?datePreset=this_weekend', label: 'This Weekend', emoji: '📅' },
    ...(isAuthed ? [{ href: '/tickets', label: 'My Tickets', emoji: '🎟️' }] : []),
    ...(isAuthed ? [{ href: '/profile', label: 'My Profile', emoji: '👤' }] : []),
  ];

  return (
    <>
      {/* ── NAVBAR BAR ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(8,8,8,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
          transition: 'all 250ms ease',
        }}
      >
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 20px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              color: 'var(--pink)',
              letterSpacing: '0.05em',
            }}>✳</span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              color: '#fff',
              letterSpacing: '0.1em',
            }}>EVENTPLATFORM</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="hidden-mobile">
            {['Events', 'Venues'].map(item => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: pathname === `/${item.toLowerCase()}` ? 'var(--pink)' : 'var(--text-2)',
                  transition: 'color 150ms',
                  textDecoration: 'none',
                }}
              >
                {item}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Icon */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-2)',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 150ms',
              }}
              aria-label="Search"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Auth Status (desktop) */}
            {status !== 'loading' && (
              isAuthed ? (
                <Link
                  href="/tickets"
                  className="hidden-mobile"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '100px',
                    padding: '7px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', background: 'var(--pink)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  {displayName.split(' ')[0]}
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden-mobile btn-neon"
                  style={{ textDecoration: 'none', padding: '8px 20px' }}
                >
                  Sign In
                </Link>
              )
            )}

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-1)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <span style={{ display: 'block', width: '22px', height: '2px', background: 'currentColor', borderRadius: '1px' }} />
              <span style={{ display: 'block', width: '16px', height: '2px', background: 'currentColor', borderRadius: '1px' }} />
              <span style={{ display: 'block', width: '22px', height: '2px', background: 'currentColor', borderRadius: '1px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── SEARCH OVERLAY ── */}
      {searchOpen && (
        <div
          onClick={() => setSearchOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '80px 20px 20px',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            <form onSubmit={handleSearch} style={{ position: 'relative' }}>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events, artists, venues..."
                style={{
                  width: '100%',
                  background: 'var(--surface-1)',
                  border: '2px solid var(--pink)',
                  borderRadius: '100px',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  padding: '16px 56px 16px 24px',
                  outline: 'none',
                  boxShadow: 'var(--shadow-pink)',
                }}
              />
              <button
                type="submit"
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--pink)', border: 'none', borderRadius: '100px',
                  padding: '8px 16px', cursor: 'pointer', color: '#fff',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
                }}
              >
                Go
              </button>
            </form>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              style={{
                marginTop: '16px', background: 'none', border: 'none',
                color: 'var(--text-2)', cursor: 'pointer', fontSize: '13px',
                fontFamily: 'var(--font-body)', display: 'block', width: '100%', textAlign: 'center',
              }}
            >
              Press Esc to close
            </button>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN MENU OVERLAY (like reference image) ── */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: '#0A0A0A',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Menu Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px', letterSpacing: '0.1em', color: 'var(--pink)',
            }}>✳ EVENTPLATFORM</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-1)', fontSize: '24px', lineHeight: 1, padding: '4px',
              }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Menu Items */}
          <nav style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navLinks.map((link, i) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: isActive ? 'var(--pink)' : 'transparent',
                    textDecoration: 'none',
                    borderBottom: i < navLinks.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 150ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      width: '40px', height: '40px',
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface-2)',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px',
                    }}>
                      {link.emoji}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '28px',
                      letterSpacing: '0.05em',
                      color: isActive ? '#fff' : 'var(--text-1)',
                    }}>
                      {link.label.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ color: isActive ? '#fff' : 'var(--text-3)', fontSize: '20px' }}>↗</span>
                </Link>
              );
            })}
          </nav>

          {/* Menu Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
            {isAuthed ? (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', borderRadius: '12px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    width: '40px', height: '40px', background: 'var(--surface-2)',
                    borderRadius: '10px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '18px',
                  }}>🚪</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '0.05em', color: 'var(--text-2)' }}>
                    LOG OUT
                  </span>
                </div>
                <span style={{ fontSize: '20px' }}>←</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="btn-neon"
                  style={{ flex: 1, textDecoration: 'none', textAlign: 'center', justifyContent: 'center' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMenuOpen(false)}
                  className="btn-ghost"
                  style={{ flex: 1, textDecoration: 'none', textAlign: 'center', justifyContent: 'center' }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .hidden-mobile { display: flex !important; }
        }
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
