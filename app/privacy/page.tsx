export const metadata = { title: 'Privacy · ReBond' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[1080px] px-5 pt-16 pb-24">
      <article className="grid max-w-[65ch] gap-5 text-[17px] leading-relaxed">
        <h1 className="text-[40px] leading-tight font-semibold tracking-[-0.025em]">Privacy</h1>
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
