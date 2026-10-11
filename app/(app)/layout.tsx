import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-[1120px] px-4 pt-6 pb-24 sm:px-5 sm:pt-10 sm:pb-24">{children}</main>;
}
