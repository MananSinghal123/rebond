import Link from 'next/link';
import {
  ButtonLink,
  EmptyState,
  formatDate,
  PageHeader,
  shortHash,
  Stat,
  StatusBadge,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { getPortfolio } from '@/lib/services/portfolio';

export default async function PortfolioPage() {
  const actor = await requireActor('INVESTOR');
  const { summary, positions } = await getPortfolio(actor.userId);

  return (
    <div className="grid gap-8">
      <PageHeader title="Portfolio" description="Your positions, what they have paid, and what comes next." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total invested" value={formatUsd(summary.investedCents)} />
        <Stat label="Expected total return" value={formatUsd(summary.expectedReturnCents)} />
        <Stat label="Received to date" value={formatUsd(summary.receivedCents)} />
        <Stat label="Next payout" value={summary.nextPayoutDate ? formatDate(summary.nextPayoutDate) : '—'} />
      </div>

      {positions.length === 0 ? (
        <EmptyState title="No positions yet">
          <p className="text-sm text-muted">Fund a listed bond and it appears here with its payout schedule.</p>
          <ButtonLink href="/bonds">Browse bonds</ButtonLink>
        </EmptyState>
      ) : (
        <>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <caption className="sr-only">Positions</caption>
              <thead>
                <tr>
                  <th className={thClass}>Bond</th>
                  <th className={thClass}>Amount</th>
                  <th className={thClass}>Rate</th>
                  <th className={thClass}>Maturity</th>
                  <th className={thClass}>Received</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.positionId}>
                    <td className={tdClass}><Link href={`/bonds/${p.bondId}`} className="underline underline-offset-2">{p.companyName}</Link></td>
                    <td className={tdClass}>{formatUsd(p.amountCents)}</td>
                    <td className={tdClass}>{formatRate(p.rateBps)}</td>
                    <td className={tdClass}>{p.maturityDate ? formatDate(p.maturityDate) : 'Set at activation'}</td>
                    <td className={tdClass}>{formatUsd(p.receivedCents)}</td>
                    <td className={tdClass}><StatusBadge status={p.bondStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="grid gap-3">
            <h2 className="text-sm font-semibold">Distribution history</h2>
            {positions.map((p) => (
              <details key={p.positionId} className="rounded-lg border border-line bg-surface p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {p.companyName} · {formatUsd(p.amountCents)} · {p.payouts.length} payouts received
                </summary>
                <p className="mt-3 font-mono text-xs text-muted">Position tx {shortHash(p.txHash)}</p>
                <ul className="mt-3 grid gap-2 text-sm">
                  {p.payouts.map((payout) => (
                    <li key={payout.id} className="flex flex-wrap justify-between gap-x-4">
                      <span>#{payout.seq} · {formatDate(payout.paidAt)}{payout.late && <span className="text-warn"> · late</span>}</span>
                      <span>{formatUsd(payout.amountCents)}</span>
                      <span className="w-full font-mono text-xs text-muted">tx {shortHash(payout.txHash)}</span>
                    </li>
                  ))}
                  {p.payouts.length === 0 && <li className="text-muted">No payouts yet.</li>}
                </ul>
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
