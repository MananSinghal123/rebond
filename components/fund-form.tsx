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
        className="sheet-in m-auto w-[min(28rem,calc(100%-2rem))] rounded-[8px] bg-surface p-0 text-ink shadow-float"
      >
        <h2 id="confirm-title" className="border-b border-line px-6 py-4 text-[15px] font-semibold">Confirm investment</h2>
        <div className="px-6 py-5">
          <p className="label">Total at maturity</p>
          <p className="mt-1.5 text-[36px] leading-tight font-medium tracking-[-0.025em]">{formatUsd((principal || 0) + interest)}</p>
          <dl className="mt-5 grid grid-cols-[1fr_auto] border-t border-line text-[14px] [&>*]:border-b [&>*]:border-line [&>*]:py-2.5">
            <dt className="text-muted">Principal</dt>
            <dd className="text-right">{formatUsd(principal || 0)}</dd>
            <dt className="text-muted">Fixed rate · term</dt>
            <dd className="text-right">{formatRate(rateBps)} · {termMonths} months</dd>
            <dt className="text-muted">Expected return</dt>
            <dd className="text-right font-medium text-accent">{formatUsd(interest)}</dd>
          </dl>
          <p className="mt-4 text-[13px] text-muted">Expected return = principal × rate × term ÷ 12. Demo only: no real funds move.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-fill/60 px-6 py-3.5">
          <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit">Confirm and fund</Button>
        </div>
      </dialog>
    </form>
  );
}
