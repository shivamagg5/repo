import type { Metadata } from 'next';
import { AuthProvider } from '@platform/auth';
import { AdminGuard } from '../components/AdminGuard';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin HQ | EventPlatform',
  description: 'EventPlatform Central Governance & Operational Control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AdminGuard>
            {children}
          </AdminGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
