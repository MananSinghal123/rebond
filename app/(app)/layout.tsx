import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-[1080px] px-5 pt-12 pb-24">{children}</main>;
}
