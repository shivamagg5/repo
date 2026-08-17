// =============================================================================
// admin-web — Enterprise Admin Layout Shell
// High-density Command Center with mobile drawer navigation, security indicators, and audit trails.
// =============================================================================
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { Drawer, IconButton, Badge } from '@platform/ui';

export interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: '📊' },
  { href: '/users', label: 'User Governance', icon: '👥' },
  { href: '/events', label: 'Event Review Queue', icon: '🛡️' },
  { href: '/orders', label: 'Orders & Refunds', icon: '📦' },
  { href: '/finance', label: 'Finance & Ledger', icon: '💰' },
  { href: '/settlements', label: 'Settlements', icon: '⚖️' },
  { href: '/cms', label: 'CMS & Content', icon: '🎨' },
  { href: '/audit-logs', label: 'Audit Logs', icon: '📜' },
];

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userInitial = profile?.name ? profile.name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() ?? 'A');

  const navContent = (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 font-mono">
          Governance Controls
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-red-600/15 border border-red-500/30 text-red-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Security Policy Reminder */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1 mt-6">
        <p className="font-bold text-slate-300 flex items-center gap-1.5">
          <span className="text-red-400">🔒</span> Immutable Audit Trail
        </p>
        <p className="leading-relaxed">All moderation actions, refunds, and status overrides are logged permanently.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-['Inter']">
      {/* Top Security Banner */}
      <header className="h-14 border-b border-slate-800/80 bg-[#0B0E17]/95 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <IconButton
              variant="ghost"
              size="sm"
              label="Toggle navigation drawer"
              icon={<span>☰</span>}
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>

          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-red-950/40">
            ⚡
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-2 font-['Outfit']">
              EVENTPLATFORM <Badge variant="danger" size="sm">HQ Governance</Badge>
            </span>
          </div>
        </div>

        {/* Admin Session & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">PROD-PRIMARY</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              {userInitial}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight">
              <p className="font-semibold text-slate-200">{profile?.name ?? 'Platform Administrator'}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              title="Sign Out of Admin Console"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors text-xs"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body with Left Sidebar */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-[#090C14] hidden md:flex flex-col justify-between">
          {navContent}
        </aside>

        {/* Mobile Slide-Out Drawer (< 768px) */}
        <Drawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title="Admin Governance"
          position="left"
          width="280px"
        >
          {navContent}
        </Drawer>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* Header Row */}
          <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white font-['Outfit']">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
