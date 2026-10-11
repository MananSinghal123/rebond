'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { activeHrefFor, type NavItem } from '@/components/nav-links';
import { Button, shortHash } from '@/components/ui';

type Props = {
  items: NavItem[];
  wallet: { address: string; demo: boolean } | null;
  signOutAction: () => Promise<void>;
};

const ICON = 'size-5';
const ICON_BUTTON =
  '-mr-2.5 grid size-11 place-items-center rounded-[6px] text-ink transition-colors duration-150 hover:bg-fill active:bg-fill';

/**
 * Phone navigation: a menu button that opens a full-screen sheet (native popover, so Esc and
 * outside taps close it). The sheet closes itself on navigation.
 */
export function MobileMenu({ items, wallet, signOutAction }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const activeHref = activeHrefFor(items, pathname);

  useEffect(() => {
    if (sheet.current?.matches(':popover-open')) sheet.current.hidePopover();
  }, [pathname]);

  return (
    <>
      <button type="button" popoverTarget="mobile-menu" aria-label="Open menu" className={`${ICON_BUTTON} sm:hidden`}>
        <svg aria-hidden viewBox="0 0 20 20" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 6.5h14M3 13.5h14" />
        </svg>
      </button>

      <div
        id="mobile-menu"
        ref={sheet}
        popover="auto"
        aria-label="Menu"
        className="menu-sheet fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-surface p-0 text-ink sm:hidden"
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <span className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.015em]">
            <BrandMark />
            ReBond
          </span>
          <button type="button" popoverTarget="mobile-menu" popoverTargetAction="hide" aria-label="Close menu" className={ICON_BUTTON}>
            <svg aria-hidden viewBox="0 0 20 20" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <nav aria-label="Main" className="px-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === activeHref ? 'page' : undefined}
              onClick={() => sheet.current?.hidePopover()}
              className="group flex h-14 items-center justify-between border-b border-line text-[17px] font-medium text-ink-2 aria-[current=page]:text-ink"
            >
              {item.label}
              <span aria-hidden className="size-1.5 rounded-full bg-accent opacity-0 group-aria-[current=page]:opacity-100" />
            </Link>
          ))}
        </nav>

        <div className="grid gap-3 px-4 pt-8">
          <p className="label">Account</p>
          {wallet ? (
            <div className="rounded-[6px] border border-line bg-fill px-3.5 py-3">
              <p className="text-[13px] text-muted">{wallet.demo ? 'Demo embedded wallet' : 'Connected wallet'}</p>
              <p className="mt-0.5 font-mono text-[13px] text-ink-2" title={wallet.address}>{shortHash(wallet.address)}</p>
            </div>
          ) : (
            <Button variant="secondary" popoverTarget="wallet-popover" className="w-full">
              Connect wallet
            </Button>
          )}
          <form action={signOutAction}>
            <Button variant="secondary" className="w-full">Sign out</Button>
          </form>
        </div>

        <p className="px-4 pt-8 pb-10 text-[12px] text-muted">Demo: no real funds, simulated on-chain records.</p>
      </div>
    </>
  );
}
