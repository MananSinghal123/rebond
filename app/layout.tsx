import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReBond: Real yield from real contracts',
  description:
    'Fixed-return bonds backed by contracted revenue. Companies raise, curators vet, investors fund. Every deal recorded on Cardano.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
