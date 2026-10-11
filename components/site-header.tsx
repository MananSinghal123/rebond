import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { NavLinks, type NavItem } from '@/components/nav-links';
import { Button, ButtonLink, shortHash } from '@/components/ui';
import { endSession, getSession, requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Role } from '@/lib/domain/types';
import { connectWallet } from '@/lib/services/accounts';

const NAV: Record<Role | 'VISITOR', NavItem[]> = {
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

export async function SiteHeader() {
  const session = await getSession();
  const user = session
    ? await db.user.findUnique({ where: { id: session.userId }, select: { walletAddress: true } })
    : null;
  const items = NAV[session?.role ?? 'VISITOR'];

  return (
    <>
      <p className="bg-ink px-4 py-1.5 text-center text-[12px] tracking-normal text-paper/90">
        Demo: no real funds, simulated on-chain records.
      </p>
      <header className="sticky top-0 z-50 border-b border-line bg-surface/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
          <Link href="/" className="mr-2 text-[17px] font-semibold tracking-[-0.02em]">
            ReBond
          </Link>
          <div className="order-last w-full sm:order-none sm:w-auto">
            <NavLinks items={items} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user?.walletAddress && (
              <span
                className="hidden rounded-full bg-fill px-3 py-1.5 font-mono text-[12px] text-muted md:inline"
                title={user.walletAddress}
              >
                {shortHash(user.walletAddress)}
              </span>
            )}
            {user && !user.walletAddress && (
              <form action={connect}>
                <Button variant="secondary" className="h-8 px-3.5 text-[13px]">Connect wallet</Button>
              </form>
            )}
            {user ? (
              <form action={signOut}>
                <Button variant="secondary" className="h-8 px-3.5 text-[13px]">Sign out</Button>
              </form>
            ) : (
              <ButtonLink href="/login" className="h-8 px-3.5 text-[13px]">Sign in</ButtonLink>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
