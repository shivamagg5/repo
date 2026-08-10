import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Promoter Dashboard | EventPlatform', description: 'EventPlatform Promoter Dashboard' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
