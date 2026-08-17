// =============================================================================
// admin-web — Root Layout
// Wrapped with AuthProvider and AdminGuard.
// =============================================================================
import type { Metadata } from 'next';
import { AuthProvider } from '@platform/auth';
import { AdminGuard } from '../components/AdminGuard';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platform Administration HQ | EventPlatform',
  description: 'EventPlatform Central Governance, Moderation, and Operational Control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0A0C10] text-white antialiased">
        <AuthProvider>
          <AdminGuard>
            {children}
          </AdminGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
