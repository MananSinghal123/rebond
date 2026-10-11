'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button, Field, inputClass } from '@/components/ui';
import {
  centsToUsd,
  checkFundAmount,
  expectedReturnCents,
  formatRate,
  formatUsd,
  MIN_TICKET_CENTS,
  usdToCents,
} from '@/lib/domain/money';

type Props = {
  action: (formData: FormData) => Promise<void>;
  bondId: string;
  rateBps: number;
  termMonths: number;
  remainingCents: number;
};

export function FundForm({ action, bondId, rateBps, termMonths, remainingCents }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [amountUsd, setAmountUsd] = useState('');
  const principal = usdToCents(Number(amountUsd));
  const problem = checkFundAmount(principal, remainingCents);
  const interest = problem ? 0 : expectedReturnCents(principal, rateBps, termMonths);

  function confirmFirst(event: FormEvent<HTMLFormElement>) {
    if (dialog.current?.open) return;
    event.preventDefault();
    if (problem === null) dialog.current?.showModal();
  }

  return (
    <form action={action} onSubmit={confirmFirst} className="grid gap-3">
      <input type="hidden" name="bondId" value={bondId} />
      <Field label="Amount (USD)" hint={`Minimum ${formatUsd(MIN_TICKET_CENTS)} · ${formatUsd(remainingCents)} left to raise`}>
        <input
          name="amountUsd"
          type="number"
          inputMode="decimal"
          min={centsToUsd(MIN_TICKET_CENTS)}
          max={centsToUsd(remainingCents)}
          step="0.01"
          required
          value={amountUsd}
          onChange={(event) => setAmountUsd(event.target.value)}
          className={inputClass}
        />
      </Field>
      {amountUsd !== '' && problem && <p className="text-[13px] text-bad">{problem}</p>}
      <Button type="button" disabled={problem !== null} onClick={() => dialog.current?.showModal()}>
        Review investment
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby="confirm-title"
        className="sheet-in m-auto w-[min(26rem,calc(100%-2rem))] rounded-[22px] bg-surface p-7 text-ink shadow-float"
      >
        <h2 id="confirm-title" className="text-[21px] font-semibold tracking-[-0.02em]">Confirm investment</h2>
        <p className="mt-5 text-[13px] text-muted">Total at maturity</p>
        <p className="font-[family-name:var(--font-display)] text-[40px] leading-tight font-semibold tracking-[-0.03em]">
          {formatUsd((principal || 0) + interest)}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-y-2.5 border-t border-line pt-5">
          <dt className="text-muted">Principal</dt>
          <dd className="text-right">{formatUsd(principal || 0)}</dd>
          <dt className="text-muted">Fixed rate · term</dt>
          <dd className="text-right">{formatRate(rateBps)} · {termMonths} months</dd>
          <dt className="text-muted">Expected return</dt>
          <dd className="text-right font-medium text-accent">{formatUsd(interest)}</dd>
        </dl>
        <p className="mt-4 text-[13px] text-muted">Expected return = principal × rate × term ÷ 12. Demo only: no real funds move.</p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit">Confirm and fund</Button>
        </div>
      </dialog>
    </form>
  );
}
