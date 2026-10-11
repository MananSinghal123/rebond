import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { PageHeader, Panel, Stat, StatusBadge } from '@/components/ui';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { getCuratorProfile } from '@/lib/services/curators';

export default async function CuratorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireRole()]);
  const profile = await getCuratorProfile(id);
  if (!profile) notFound();
  const { rank } = profile;

  return (
    <div className="grid gap-8">
      <PageHeader
        title={profile.displayName}
        description={profile.bio || 'Curator. Vets applications and puts their name on the bonds below.'}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Rank score" value={rank.score === null ? 'Unrated' : rank.score} />
        <Stat label="On-time distributions" value={rank.onTimePct === null ? '—' : `${rank.onTimePct}%`} />
        <Stat label="Bonds curated" value={profile.bondsCurated} />
        <Stat label="Total volume" value={formatUsd(profile.totalVolumeCents)} />
      </div>
      <p className="text-muted">
        Late distributions: {rank.lateCount}. The score is the share of distributions paid on time, weighted by bond size.
      </p>
      <Panel title="Curated bonds">
        {profile.bonds.length === 0 ? (
          <p className="text-muted">No bonds listed yet.</p>
        ) : (
          <ul className="grid gap-2">
            {profile.bonds.map((bond) => (
              <li key={bond.id} className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/bonds/${bond.id}`} className="hover:underline">
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
