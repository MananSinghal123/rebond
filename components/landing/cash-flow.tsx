import { EXAMPLE_BONDS, TICKET_CENTS } from '@/components/landing/examples';
import { FREQUENCY_LABEL } from '@/components/ui';
import { expectedReturnCents, formatRate, formatUsd } from '@/lib/domain/money';
import { buildSchedule } from '@/lib/domain/schedule';

const BOND = EXAMPLE_BONDS[0];
/**
 * Bars are not to scale: principal is drawn with an axis break so the coupons stay legible.
 * Heights come from --coupon and --principal (shorter on phones); the room above the axis fits
 * the tallest bar plus its amount label, so every column shares one axis.
 */
const COUPON_H = 'var(--coupon)';
const PRINCIPAL_H = 'var(--principal)';
const ABOVE_H = 'calc(var(--coupon) + var(--principal) + 30px)';

function Break() {
  return <span aria-hidden className="absolute inset-x-[-3px] top-1/2 h-[5px] -translate-y-1/2 -skew-y-[14deg] bg-surface" />;
}

/**
 * A bond's cash flows on a $1,000 ticket, the way a credit analyst would sketch them: one outflow
 * at funding, fixed coupons above the axis, principal returned with the last coupon.
 */
export function CashFlow() {
  const schedule = buildSchedule({
    amountCents: TICKET_CENTS,
    rateBps: BOND.rateBps,
    termMonths: BOND.termMonths,
    frequency: BOND.frequency,
    start: new Date(Date.UTC(2026, 0, 1)),
  });
  const period = BOND.termMonths / schedule.length;
  const coupon = schedule[0].amountCents - (schedule[0].isPrincipal ? TICKET_CENTS : 0);
  const total = TICKET_CENTS + expectedReturnCents(TICKET_CENTS, BOND.rateBps, BOND.termMonths);

  return (
    <figure className="min-w-0 rounded-[8px] border border-line bg-surface">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line px-4 py-3 sm:px-6">
        <span className="text-[14px] font-semibold">Cash flows on {formatUsd(TICKET_CENTS)}</span>
        <span className="text-[13px] text-muted">
          Example · {BOND.company}, {formatRate(BOND.rateBps)}, {BOND.termMonths} months, {FREQUENCY_LABEL[BOND.frequency].toLowerCase()}
        </span>
      </figcaption>

      <div className="px-4 pt-5 pb-4 [--coupon:34px] [--principal:80px] sm:px-6 sm:pt-8 sm:pb-5 sm:[--coupon:44px] sm:[--principal:112px]">
        <ol data-reveal="stagger" className="grid grid-cols-5 gap-2 sm:gap-4">
          {/* Funding: the one outflow, below the axis. */}
          <li className="grid grid-rows-[auto_1px_auto] content-start">
            <div style={{ height: ABOVE_H }} />
            <div className="bg-ink/30" />
            <div className="grid justify-items-center">
              <div className="relative w-full max-w-11 origin-top bg-ink grow-y" style={{ height: `calc(${PRINCIPAL_H} * 0.62)` }}>
                <Break />
              </div>
              <p className="mt-2 text-center text-[11px] leading-tight font-medium whitespace-nowrap min-[360px]:text-[12px] sm:text-[13px]">−{formatUsd(TICKET_CENTS)}</p>
              <p className="text-center text-[11px] text-muted sm:text-[12px]">Invest</p>
            </div>
          </li>
          {schedule.map((row) => (
            <li key={row.seq} className="grid grid-rows-[auto_1px_auto] content-start">
              <div className="grid content-end justify-items-center" style={{ height: ABOVE_H }}>
                <p className={`mb-2 text-center text-[12px] leading-tight font-medium sm:text-[13px] ${row.isPrincipal ? 'text-ink' : 'text-accent'}`}>
                  {formatUsd(row.amountCents)}
                </p>
                <div className="grid w-full max-w-11 origin-bottom grow-y">
                  <div className="bg-accent" style={{ height: COUPON_H }} />
                  {row.isPrincipal && (
                    <div className="relative bg-ink" style={{ height: PRINCIPAL_H }}>
                      <Break />
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-ink/30" />
              <p className="mt-2 text-center text-[11px] text-muted sm:text-[12px]">Month {Math.min(row.seq * period, BOND.termMonths)}</p>
            </li>
          ))}
        </ol>

        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-[6px] border border-line bg-line">
          <div className="bg-surface px-3 py-2.5 sm:px-4">
            <dt className="label">Coupon</dt>
            <dd className="mt-0.5 text-[15px] font-medium text-accent">{formatUsd(coupon)}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5 sm:px-4">
            <dt className="label">Interest</dt>
            <dd className="mt-0.5 text-[15px] font-medium">{formatUsd(total - TICKET_CENTS)}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5 sm:px-4">
            <dt className="label">Returned</dt>
            <dd className="mt-0.5 text-[15px] font-medium">{formatUsd(total)}</dd>
          </div>
        </dl>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-[2px] bg-accent" />Coupon</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-[2px] bg-ink" />Principal</span>
          <span>Simple, fixed interest. Not to scale: the breaks shorten principal.</span>
        </p>
      </div>
    </figure>
  );
}
