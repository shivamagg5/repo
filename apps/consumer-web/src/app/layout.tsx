import type { Metadata } from 'next';
import { AuthProvider } from '@platform/auth';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'EventPlatform — Discover & Book Events Near You',
    template: '%s | EventPlatform',
  },
  description:
    'Discover, book, and attend the best events near you. Music, comedy, sports, art, and more.',
  keywords: ['events', 'tickets', 'concerts', 'shows', 'entertainment', 'book tickets'],
  authors: [{ name: 'EventPlatform' }],
  creator: 'EventPlatform',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://eventplatform.app',
    siteName: 'EventPlatform',
    title: 'EventPlatform — Discover & Book Events Near You',
    description:
      'Discover, book, and attend the best events near you. Music, comedy, sports, art, and more.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EventPlatform — Discover & Book Events Near You',
    description: 'Discover, book, and attend the best events near you.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
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
