import Link from 'next/link';

export const metadata = { title: 'Privacy · ReBond' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto grid max-w-prose gap-4 px-4 py-16 text-sm leading-relaxed">
      <Link href="/" className="text-muted hover:text-ink">← ReBond</Link>
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <p>
        This is a demo. It stores your email, a hashed password, your chosen role and any application details you enter. No real funds move.
      </p>
      <p>
        On-chain records are simulated. They contain only bond identifiers, amounts and hashes. No personal information is ever written to a chain record.
      </p>
      <p>Documents you upload are stored only so curators can review them, and are never published.</p>
    </article>
  );
}
