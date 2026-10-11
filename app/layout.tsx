import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { ChatWidget } from '@/components/assistant/chat-widget';
import { MotionObserver } from '@/components/motion-observer';
import { SiteHeader } from '@/components/site-header';
import { assistantEnabled } from '@/lib/assistant/client';
import './globals.css';

const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-sans' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono' });

const MOTION_SCRIPT =
  "if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')";

export const metadata: Metadata = {
  title: 'ReBond: Real yield from real contracts',
  description:
    'Fixed-return bonds backed by contracted revenue. Companies raise, curators vet, investors fund. Every deal recorded on Cardano.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Before first paint: opt into motion unless the viewer asked for reduced motion. */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <SiteHeader />
        {children}
        <MotionObserver />
        {assistantEnabled() && <ChatWidget />}
      </body>
    </html>
  );
}
