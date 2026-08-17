// =============================================================================
// promoter-web — Promoter Management Layout Shell
// Displays authenticated promoter affiliate organization, user profile, and responsive drawer navigation.
// =============================================================================
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { DashboardLayout as SharedDashboardLayout } from '@platform/ui';

export interface PromoterLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PromoterLayout({ children, title, subtitle, actions }: PromoterLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, organizations, logout } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview', href: '/', icon: <span>📊</span> },
    { id: 'campaigns', label: 'Campaigns', href: '/campaigns', icon: <span>🚀</span> },
    { id: 'earnings', label: 'Earnings Ledger', href: '/earnings', icon: <span>💰</span> },
    { id: 'analytics', label: 'Analytics', href: '/analytics', icon: <span>📈</span> },
    { id: 'profile', label: 'Profile', href: '/profile', icon: <span>👤</span> },
  ];

  const activeOrg = organizations.find((o) => o.type === 'promoter' && o.status === 'active') ?? organizations[0];

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
      Attribution Live
    </span>
  );

  return (
    <SharedDashboardLayout
      appName="PromoterHub"
      appBadge="AFFILIATE"
      appBadgeColor="accent"
      navItems={navItems}
      currentPath={pathname || '/'}
      onNavigate={(href) => router.push(href)}
      title={title ?? 'Promoter Console'}
      subtitle={subtitle}
      actions={defaultActions}
      user={{
        name: profile?.name ?? user?.email?.split('@')[0] ?? 'Promoter',
        email: user?.email,
        role: 'Affiliate Partner',
      }}
      organizationName={activeOrg?.name ?? 'Affiliate Org'}
      organizationType={activeOrg?.type ?? 'PROMOTER'}
      onLogout={() => logout()}
    >
      {children}
    </SharedDashboardLayout>
  );
}
