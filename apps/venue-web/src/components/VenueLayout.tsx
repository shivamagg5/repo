// =============================================================================
// venue-web — Venue Management Layout Shell
// Displays authenticated venue organization, user profile, and responsive drawer navigation.
// =============================================================================
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { DashboardLayout as SharedDashboardLayout } from '@platform/ui';

export interface VenueLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function VenueLayout({ children, title, subtitle, actions }: VenueLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, organizations, logout } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview', href: '/', icon: <span>🏛️</span> },
    { id: 'profile', label: 'Venue Profile', href: '/profile', icon: <span>📍</span> },
    { id: 'calendar', label: 'Booking Calendar', href: '/calendar', icon: <span>📅</span> },
    { id: 'events', label: 'Hosted Events', href: '/events', icon: <span>🎪</span> },
    { id: 'staff', label: 'Venue Staff', href: '/staff', icon: <span>👥</span> },
  ];

  const activeOrg = organizations.find((o) => o.type === 'venue' && o.status === 'active') ?? organizations[0];

  const defaultActions = actions || (
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
      Live Venue
    </span>
  );

  return (
    <SharedDashboardLayout
      appName="VenuePortal"
      appBadge="VENUE"
      appBadgeColor="info"
      navItems={navItems}
      currentPath={pathname || '/'}
      onNavigate={(href) => router.push(href)}
      title={title ?? 'Venue Portal'}
      subtitle={subtitle}
      actions={defaultActions}
      user={{
        name: profile?.name ?? user?.email?.split('@')[0] ?? 'Venue Manager',
        email: user?.email,
        role: 'Operations Lead',
      }}
      organizationName={activeOrg?.name ?? 'Arena Complex'}
      organizationType={activeOrg?.type ?? 'VENUE'}
      onLogout={() => logout()}
    >
      {children}
    </SharedDashboardLayout>
  );
}
