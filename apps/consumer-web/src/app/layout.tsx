import type { Metadata } from 'next';
import { AuthProvider } from '@platform/auth';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'PULSR — Book Live Events, Festivals & Gigs in India',
    template: '%s | PULSR',
  },
  description:
    'PULSR is the ticketing app for live music. Discover festivals, garba nights, raves and gigs across 100+ cities and grab tickets in seconds.',
  keywords: ['events', 'tickets', 'concerts', 'live music', 'comedy', 'festivals', 'India', 'PULSR'],
  authors: [{ name: 'PULSR' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'PULSR',
    title: 'PULSR — Book Live Events, Festivals & Gigs in India',
    description: 'Discover festivals, garba nights, raves and gigs across 100+ cities.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PULSR — Book Live Events, Festivals & Gigs in India',
    description: 'Real tickets. Real nights.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
