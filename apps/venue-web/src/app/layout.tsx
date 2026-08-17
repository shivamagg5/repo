// =============================================================================
// venue-web — Root Layout
// Wrapped with AuthProvider and RoleGuard.
// =============================================================================
import type { Metadata } from 'next';
import { AuthProvider } from '@platform/auth';
import { RoleGuard } from '../components/RoleGuard';
import './globals.css';

export const metadata: Metadata = {
  title: 'Venue Manager Dashboard | EventPlatform',
  description: 'EventPlatform Venue Portal — Manage venue profiles, staff, and bookings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0F1117] text-white antialiased">
        <AuthProvider>
          <RoleGuard>
            {children}
          </RoleGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
