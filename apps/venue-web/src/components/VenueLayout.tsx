'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface VenueLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function VenueLayout({ children, title, subtitle }: VenueLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/', icon: '🏛️' },
    { label: 'Venue Profile', href: '/profile', icon: '📍' },
    { label: 'Booking Calendar', href: '/calendar', icon: '📅' },
    { label: 'Hosted Events', href: '/events', icon: '🎪' },
    { label: 'Venue Staff', href: '/staff', icon: '👥' },
  ];

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between p-4 sticky top-0 h-screen hidden md:flex">
        <div>
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800/60">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
              V
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight gradient-text">VenuePortal</h1>
              <p className="text-xs text-slate-400 font-medium">Venue Management</p>
            </div>
          </div>

          {/* Venue Org Badge */}
          <div className="mx-2 mb-6 p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-200 truncate">Grand Arena Venue</span>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">VENUE</span>
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
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
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
          <div className="w-8 h-8 rounded-full bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-semibold text-blue-200 text-xs">
            VM
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">Venue Manager</p>
            <p className="text-[10px] text-slate-400 truncate">venue@platform.internal</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{title ?? 'Venue Portal'}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Asia/Kolkata Active
          </span>
        </header>

        {/* Page Body */}
        <div className="p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
