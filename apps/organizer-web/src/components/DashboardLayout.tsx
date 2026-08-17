'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { DashboardLayout as SharedDashboardLayout, Button } from '@platform/ui';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, organizations, logout } = useAuth();

  const activeOrg = organizations.find((o) => o.type === 'organizer' && o.status === 'active') ?? organizations[0];

  const navItems = [
    { id: 'overview', label: 'Overview', href: '/', icon: <span>📊</span> },
    { id: 'events', label: 'Events', href: '/events', icon: <span>🎪</span> },
    { id: 'orders', label: 'Orders', href: '/orders', icon: <span>🎟️</span> },
    { id: 'promoters', label: 'Promoters', href: '/promoters', icon: <span>🚀</span> },
    { id: 'team', label: 'Team', href: '/team', icon: <span>👥</span> },
  ];

  const defaultActions = actions || (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          fontSize: '11px',
          padding: '4px 10px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
        Live Backend
      </span>
      <Link href="/events/new">
        <Button variant="brand-glow" size="sm">
          + Create Event
        </Button>
      </Link>
    </div>
  );

  return (
    <SharedDashboardLayout
      appName="EventFlow"
      appBadge="ORGANIZER"
      appBadgeColor="brand"
      navItems={navItems}
      currentPath={pathname || '/'}
      onNavigate={(href) => router.push(href)}
      title={title ?? 'Organizer Console'}
      subtitle={subtitle}
      actions={defaultActions}
      user={{
        name: profile?.name ?? user?.email?.split('@')[0] ?? 'Organizer',
        email: user?.email,
        role: 'Event Director',
      }}
      organizationName={activeOrg?.name ?? 'Organizer HQ'}
      organizationType={activeOrg?.type ?? 'ORGANIZER'}
      onLogout={() => logout()}
    >
      {children}
    </SharedDashboardLayout>
  );
}
