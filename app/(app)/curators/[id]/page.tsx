import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { PageHeader, Panel, Stat, StatGrid, StatusBadge } from '@/components/ui';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { getCuratorProfile } from '@/lib/services/curators';

export default async function CuratorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireRole()]);
  const profile = await getCuratorProfile(id);
  if (!profile) notFound();
  const { rank } = profile;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={profile.displayName}
        description={profile.bio || 'Curator. Vets applications and puts their name on the bonds below.'}
      />
      <StatGrid>
        <Stat label="Rank score" value={rank.score === null ? 'Unrated' : rank.score} />
        <Stat label="On-time distributions" value={rank.onTimePct === null ? '—' : `${rank.onTimePct}%`} />
        <Stat label="Bonds curated" value={profile.bondsCurated} />
        <Stat label="Total volume" value={formatUsd(profile.totalVolumeCents)} />
      </StatGrid>
      <p className="-mt-2 text-[13px] text-muted">
        Late distributions: {rank.lateCount}. The score is the share of distributions paid on time, weighted by bond size.
      </p>
      <Panel title="Curated bonds">
        {profile.bonds.length === 0 ? (
          <p className="text-muted">No bonds listed yet.</p>
        ) : (
          <ul data-reveal="stagger" className="-my-3">
            {profile.bonds.map((bond) => (
              <li key={bond.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <Link href={`/bonds/${bond.id}`} className="-my-2.5 inline-block py-2.5 text-[14px] hover:text-accent hover:underline">
                  {bond.companyName} · {formatUsd(bond.amountCents)} · {formatRate(bond.rateBps)} · {bond.termMonths} mo
                </Link>
                <StatusBadge status={bond.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
