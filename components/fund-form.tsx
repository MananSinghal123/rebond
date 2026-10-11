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
      {amountUsd !== '' && problem && <p className="text-xs text-bad">{problem}</p>}
      <Button type="button" disabled={problem !== null} onClick={() => dialog.current?.showModal()}>
        Review investment
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-lg border border-line bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">Confirm investment</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Principal</dt>
          <dd className="text-right">{formatUsd(principal || 0)}</dd>
          <dt className="text-muted">Fixed rate · term</dt>
          <dd className="text-right">{formatRate(rateBps)} · {termMonths} months</dd>
          <dt className="text-muted">Expected return</dt>
          <dd className="text-right font-medium">{formatUsd(interest)}</dd>
          <dt className="text-muted">Total at maturity</dt>
          <dd className="text-right font-medium">{formatUsd((principal || 0) + interest)}</dd>
        </dl>
        <p className="mt-3 text-xs text-muted">Expected return = principal × rate × term ÷ 12. Demo only: no real funds move.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit">Confirm and fund</Button>
        </div>
      </dialog>
    </form>
  );
}
