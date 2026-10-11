'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string };

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeHref = items
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Main" className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === activeHref ? 'page' : undefined}
          className="rounded-full px-3 py-1.5 text-[14px] whitespace-nowrap text-ink/70 transition-colors duration-200 hover:text-ink aria-[current=page]:bg-ink/[0.06] aria-[current=page]:font-medium aria-[current=page]:text-ink"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
