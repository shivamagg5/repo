'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/', icon: '📊' },
    { label: 'Events', href: '/events', icon: '🎪' },
    { label: 'Orders', href: '/orders', icon: '🎟️' },
    { label: 'Promoters', href: '/promoters', icon: '🚀' },
    { label: 'Team', href: '/team', icon: '👥' },
  ];

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between p-4 sticky top-0 h-screen hidden md:flex">
        <div>
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800/60">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/20">
              E
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight gradient-text">EventFlow</h1>
              <p className="text-xs text-slate-400 font-medium">Organizer Console</p>
            </div>
          </div>

          {/* Org Selector Badge */}
          <div className="mx-2 mb-6 p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-200 truncate">Main Organizer Org</span>
            </div>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">ORG</span>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Profile */}
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600/40 border border-purple-400/30 flex items-center justify-center font-semibold text-purple-200 text-xs">
            OP
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">Organizer Admin</p>
            <p className="text-[10px] text-slate-400 truncate">organizer@platform.internal</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header Bar */}
        <header className="sticky top-0 z-30 glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{title ?? 'Organizer Console'}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              API Connected
            </span>
            <Link
              href="/events/new"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span>+</span> Create Event
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <div className="p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
