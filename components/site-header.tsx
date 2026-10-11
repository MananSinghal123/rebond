import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NavLinks, type NavItem } from '@/components/nav-links';
import { Button, ButtonLink, shortHash } from '@/components/ui';
import { WalletConnect } from '@/components/wallet-connect';
import { endSession, getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Role } from '@/lib/domain/types';

const NAV: Record<Role | 'VISITOR', NavItem[]> = {
  VISITOR: [],
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

export async function SiteHeader() {
  const session = await getSession();
  const user = session
    ? await db.user.findUnique({ where: { id: session.userId }, select: { walletAddress: true, walletKind: true } })
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
                title={user.walletKind === 'EMBEDDED_DEMO' ? `Demo embedded wallet: ${user.walletAddress}` : user.walletAddress}
              >
                {user.walletKind === 'EMBEDDED_DEMO' && <span className="mr-1.5 font-sans text-ink/70">Demo wallet</span>}
                {shortHash(user.walletAddress)}
              </span>
            )}
            {user && !user.walletAddress && (
              <>
                <Button variant="secondary" className="h-8 px-3.5 text-[13px]" popoverTarget="wallet-popover">
                  Connect wallet
                </Button>
                <div
                  id="wallet-popover"
                  popover="auto"
                  className="sheet-in fixed inset-auto top-16 right-4 m-0 w-[min(22rem,calc(100%-2rem))] rounded-[18px] bg-surface p-5 text-ink shadow-float"
                >
                  <p className="mb-3 text-[15px] font-semibold">Connect a Cardano wallet</p>
                  <WalletConnect mode="link" />
                </div>
              </>
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
