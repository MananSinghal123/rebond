import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button, ButtonLink, shortHash } from '@/components/ui';
import { endSession, getSession, requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Role } from '@/lib/domain/types';
import { connectWallet } from '@/lib/services/accounts';

const NAV: Record<Role | 'VISITOR', { href: string; label: string }[]> = {
  VISITOR: [{ href: '/bonds', label: 'Bonds' }],
  INVESTOR: [
    { href: '/bonds', label: 'Bonds' },
    { href: '/portfolio', label: 'Portfolio' },
  ],
  COMPANY: [
    { href: '/company', label: 'My bonds' },
    { href: '/company/apply', label: 'Apply' },
  ],
  CURATOR: [
    { href: '/curator', label: 'Review queue' },
    { href: '/bonds', label: 'Bonds' },
  ],
};

async function signOut() {
  'use server';
  await endSession();
  redirect('/');
}

async function connect() {
  'use server';
  const session = await requireSession();
  await connectWallet(session.userId);
  revalidatePath('/', 'layout');
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const user = session
    ? await db.user.findUnique({ where: { id: session.userId }, select: { walletAddress: true } })
    : null;
  const links = NAV[session?.role ?? 'VISITOR'];

  return (
    <>
      <p className="bg-ink px-4 py-2 text-center text-xs text-paper">Demo: no real funds, simulated on-chain records.</p>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">ReBond</Link>
          <nav aria-label="Main" className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted transition-colors duration-150 hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {user?.walletAddress && (
              <span className="font-mono text-xs text-muted" title={user.walletAddress}>
                {shortHash(user.walletAddress)}
              </span>
            )}
            {user && !user.walletAddress && (
              <form action={connect}>
                <Button variant="secondary">Connect wallet</Button>
              </form>
            )}
            {user ? (
              <form action={signOut}>
                <Button variant="secondary">Sign out</Button>
              </form>
            ) : (
              <ButtonLink href="/login">Sign in</ButtonLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
