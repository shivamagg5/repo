import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Admin Dashboard | EventPlatform', description: 'EventPlatform Admin Dashboard' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
