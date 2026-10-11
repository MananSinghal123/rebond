export const metadata = { title: 'Privacy · ReBond' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-4 pt-10 pb-16 sm:px-5 sm:pt-14 sm:pb-24">
      <article className="grid max-w-[65ch] gap-5 text-[16px] leading-relaxed text-ink-2">
        <h1 className="mb-2 border-b border-line pb-6 text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink">Privacy</h1>
        <p>
          This is a demo. It stores your email, a hashed password, your chosen role and any application details you enter. No real funds move.
        </p>
        <p>
          On-chain records are simulated. They contain only bond identifiers, amounts and hashes. No personal information is ever written to a chain record.
        </p>
        <p>Documents you upload are stored only so curators can review them, and are never published.</p>
      </article>
    </main>
  );
}
