import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Organizer Dashboard | EventPlatform', description: 'EventPlatform Organizer Dashboard' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
