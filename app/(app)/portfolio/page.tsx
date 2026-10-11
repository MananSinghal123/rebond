import Link from 'next/link';
import {
  ButtonLink,
  EmptyState,
  formatDate,
  numClass,
  PageHeader,
  sheetClass,
  shortHash,
  Stat,
  StatGrid,
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
    <div className="grid gap-6">
      <PageHeader title="Portfolio" description="Your positions, what they have paid, and what comes next." />
      <StatGrid>
        <Stat label="Total invested" value={formatUsd(summary.investedCents)} />
        <Stat label="Expected total return" value={formatUsd(summary.expectedReturnCents)} />
        <Stat label="Received to date" value={formatUsd(summary.receivedCents)} />
        <Stat label="Next payout" value={summary.nextPayoutDate ? formatDate(summary.nextPayoutDate) : '—'} />
      </StatGrid>

      {positions.length === 0 ? (
        <EmptyState title="No positions yet">
          <p className="text-muted">Fund a listed bond and it appears here with its payout schedule.</p>
          <ButtonLink href="/bonds">Browse bonds</ButtonLink>
        </EmptyState>
      ) : (
        <>
          <div data-reveal="up" className={`${tableWrapClass} ${sheetClass} p-4 sm:px-5 sm:pt-4 sm:pb-1 md:px-6`}>
            <table className={tableClass}>
              <caption className="sr-only">Positions</caption>
              <thead>
                <tr>
                  <th className={thClass}>Bond</th>
                  <th className={`${thClass} ${numClass}`}>Amount</th>
                  <th className={`${thClass} ${numClass}`}>Rate</th>
                  <th className={thClass}>Maturity</th>
                  <th className={`${thClass} ${numClass}`}>Received</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody data-reveal="stagger">
                {positions.map((p) => (
                  <tr key={p.positionId}>
                    <td data-primary className={tdClass}><Link href={`/bonds/${p.bondId}`} className="font-medium hover:text-accent hover:underline">{p.companyName}</Link></td>
                    <td data-figure className={`${tdClass} ${numClass}`}>{formatUsd(p.amountCents)}</td>
                    <td data-label="Rate" className={`${tdClass} ${numClass}`}>{formatRate(p.rateBps)}</td>
                    <td data-label="Maturity" className={`${tdClass} text-ink-2`}>{p.maturityDate ? formatDate(p.maturityDate) : 'Set at activation'}</td>
                    <td data-label="Received" className={`${tdClass} ${numClass}`}>{formatUsd(p.receivedCents)}</td>
                    <td data-label="Status" className={tdClass}><StatusBadge status={p.bondStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section data-reveal="up" className={sheetClass}>
            <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold sm:px-5 md:px-6">Distribution history</h2>
            {positions.map((p) => (
              <details key={p.positionId} className="group border-b border-line last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-[14px] hover:bg-fill/60 sm:px-5 md:px-6 [&::-webkit-details-marker]:hidden">
                  <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0 text-muted transition-transform duration-150 group-open:rotate-90">
                    <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="grid min-w-0 flex-1 gap-0.5 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                    <span className="font-medium">{p.companyName}</span>
                    <span className="text-[13px] text-muted sm:text-[14px]">{formatUsd(p.amountCents)} · {p.payouts.length} payouts received</span>
                  </span>
                </summary>
                <div className="px-4 pb-4 pl-[2.625rem] sm:px-5 sm:pl-[2.875rem] md:px-6 md:pl-[3.125rem]">
                  <p className="font-mono text-[12px] text-muted">Position tx {shortHash(p.txHash)}</p>
                  <ul className="mt-3 grid border-t border-line text-[14px]">
                    {p.payouts.map((payout) => (
                      <li key={payout.id} className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-line py-2.5 last:border-b-0">
                        <span>
                          <span className="font-mono text-[12px] text-muted">{String(payout.seq).padStart(2, '0')}</span>{' '}
                          {formatDate(payout.paidAt)}
                          {payout.late && <span className="text-warn"> · late</span>}
                        </span>
                        <span className="text-right font-medium">{formatUsd(payout.amountCents)}</span>
                        <span className="col-span-2 font-mono text-[12px] text-muted">tx {shortHash(payout.txHash)}</span>
                      </li>
                    ))}
                    {p.payouts.length === 0 && <li className="py-2.5 text-muted">No payouts yet.</li>}
                  </ul>
                </div>
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
