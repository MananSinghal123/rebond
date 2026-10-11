import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/brand-mark';
import { MobileMenu } from '@/components/mobile-menu';
import { NavLinks, type NavItem } from '@/components/nav-links';
import { Button, ButtonLink, shortHash } from '@/components/ui';
import { WalletConnect } from '@/components/wallet-connect';
import { endSession, getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Role } from '@/lib/domain/types';

const NAV: Record<Role | 'VISITOR', NavItem[]> = {
  VISITOR: [
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/#trust', label: 'Trust' },
    { href: '/#markets', label: 'Markets' },
  ],
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

/** Header actions stay compact on desktop; on phones they live in the menu sheet. */
const COMPACT = 'sm:h-8 sm:px-3 sm:text-[13px]';

async function signOut() {
  'use server';
  await endSession();
  redirect('/');
}

export async function SiteHeader() {
  const session = await getSession();
  const user = session
    ? await db.user.findUnique({ where: { id: session.userId }, select: { walletAddress: true, walletKind: true } })
    : null;
  const items = NAV[session?.role ?? 'VISITOR'];

  return (
    <>
      <p className="bg-ink px-4 py-1.5 text-center text-[12px] tracking-[0.01em] text-paper/85">
        Demo: no real funds, simulated on-chain records.
      </p>
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] items-center gap-x-6 px-4 sm:px-5">
          <Link href="/" className="flex h-14 items-center gap-2.5 text-[16px] font-semibold tracking-[-0.015em]">
            <BrandMark />
            ReBond
          </Link>
          <div className="hidden sm:block">
            <NavLinks items={items} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user?.walletAddress && (
              <span
                className="hidden rounded-[6px] border border-line bg-fill px-2.5 py-1 font-mono text-[12px] text-ink-2 md:inline"
                title={user.walletKind === 'EMBEDDED_DEMO' ? `Demo embedded wallet: ${user.walletAddress}` : user.walletAddress}
              >
                {user.walletKind === 'EMBEDDED_DEMO' && <span className="mr-1.5 font-sans text-muted">Demo wallet</span>}
                {shortHash(user.walletAddress)}
              </span>
            )}
            {user && !user.walletAddress && (
              <Button variant="secondary" className={`max-sm:hidden ${COMPACT}`} popoverTarget="wallet-popover">
                Connect wallet
              </Button>
            )}
            {user ? (
              <>
                <form action={signOut} className="hidden sm:block">
                  <Button variant="secondary" className={COMPACT}>Sign out</Button>
                </form>
                <MobileMenu
                  items={items}
                  account={{
                    wallet: user.walletAddress ? { address: user.walletAddress, demo: user.walletKind === 'EMBEDDED_DEMO' } : null,
                    signOutAction: signOut,
                  }}
                />
              </>
            ) : (
              <>
                <ButtonLink href="/login" className="max-sm:h-9 max-sm:px-3.5 max-sm:text-[14px] sm:h-8 sm:px-3 sm:text-[13px]">Sign in</ButtonLink>
                <MobileMenu items={items} />
              </>
            )}
          </div>
        </div>
        {user && !user.walletAddress && (
          <div
            id="wallet-popover"
            popover="auto"
            className="sheet-in fixed inset-auto top-16 right-4 m-0 w-[min(22rem,calc(100%-2rem))] rounded-[8px] bg-surface p-5 text-ink shadow-float"
          >
            <p className="mb-3 text-[14px] font-semibold">Connect a Cardano wallet</p>
            <WalletConnect mode="link" />
          </div>
        )}
      </header>
    </>
  );
}
