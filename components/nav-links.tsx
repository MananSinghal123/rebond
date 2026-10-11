'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string };

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The most specific nav item matching the current path. */
export const activeHrefFor = (items: NavItem[], pathname: string) =>
  items.filter((item) => isActive(pathname, item.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

export function NavLinks({ items }: { items: NavItem[] }) {
  const activeHref = activeHrefFor(items, usePathname());

  return (
    <nav aria-label="Main" className="flex items-center overflow-x-auto empty:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === activeHref ? 'page' : undefined}
          className="relative flex h-11 items-center px-3 text-[14px] whitespace-nowrap text-ink-2 transition-colors duration-150 after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-line-strong after:transition-transform after:duration-300 after:ease-[var(--ease-out-expo)] hover:text-ink hover:after:scale-x-100 aria-[current=page]:font-medium aria-[current=page]:text-ink aria-[current=page]:after:scale-x-100 aria-[current=page]:after:bg-ink sm:h-14"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
