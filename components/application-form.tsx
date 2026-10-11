'use client';

import { useActionState } from 'react';
import { Button, Field, FREQUENCY_LABEL, Notice, inputClass, textareaClass } from '@/components/ui';
import { centsToUsd, MAX_AMOUNT_USD, MIN_TICKET_CENTS } from '@/lib/domain/money';

export type FormState = { error?: string; values?: Record<string, string> };

export type ApplicationDefaults = {
  bondId?: string;
  companyName: string;
  description: string;
  amountUsd?: number;
  ratePct?: number;
  termMonths?: number;
  payoutFrequency?: string;
  contractSummary?: string;
  annualRevenueUsd?: number;
};

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: ApplicationDefaults;
};

export function ApplicationForm({ action, defaults }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (name: keyof ApplicationDefaults) => state.values?.[name] ?? defaults[name];

  return (
    <form action={formAction} className="grid gap-8 sm:gap-10">
      {defaults.bondId && <input type="hidden" name="bondId" value={defaults.bondId} />}

      <fieldset className="grid gap-4">
        <legend className="mb-4 w-full border-b border-line pb-2.5 text-[15px] font-semibold">Company</legend>
        <Field label="Company name">
          <input name="companyName" required minLength={2} maxLength={120} defaultValue={value('companyName')} className={inputClass} />
        </Field>
        <p>
          <span className="font-medium">Sector:</span> <span className="text-muted">Healthcare (the only market at launch)</span>
        </p>
        <Field label="Description">
          <textarea name="description" required minLength={10} maxLength={2000} defaultValue={value('description')} className={textareaClass} />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
        <legend className="mb-4 w-full border-b border-line pb-2.5 text-[15px] font-semibold">Bond terms</legend>
        <Field label="Raise amount (USD)" hint="$100 to $8,000,000 in this demo." className="col-span-2 sm:col-span-1">
          <input name="amountUsd" type="number" required min={centsToUsd(MIN_TICKET_CENTS)} max={MAX_AMOUNT_USD} step="0.01" inputMode="decimal" defaultValue={value('amountUsd')} className={inputClass} />
        </Field>
        <Field label="Fixed annual rate (%)" hint="Above 0, at most 30.">
          <input name="ratePct" type="number" required min={0.01} max={30} step="0.01" inputMode="decimal" defaultValue={value('ratePct')} className={inputClass} />
        </Field>
        <Field label="Term (months)" hint="1 to 60.">
          <input name="termMonths" type="number" required min={1} max={60} step={1} inputMode="numeric" defaultValue={value('termMonths')} className={inputClass} />
        </Field>
        <Field label="Payout frequency" className="col-span-2 sm:col-span-1">
          <select
            key={state.values?.payoutFrequency ?? 'initial'}
            name="payoutFrequency"
            required
            defaultValue={value('payoutFrequency') ?? 'QUARTERLY'}
            className={inputClass}
          >
            {Object.entries(FREQUENCY_LABEL).map(([option, label]) => (
              <option key={option} value={option}>{label}</option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 w-full border-b border-line pb-2.5 text-[15px] font-semibold">Backing contracts</legend>
        <Field label="Contract summary" hint="Counterparties, term, and what the contracts pay.">
          <textarea name="contractSummary" required minLength={10} maxLength={4000} defaultValue={value('contractSummary')} className={textareaClass} />
        </Field>
        <Field label="Annual contracted revenue (USD)">
          <input name="annualRevenueUsd" type="number" required min={1} max={MAX_AMOUNT_USD} step="0.01" inputMode="decimal" defaultValue={value('annualRevenueUsd')} className={inputClass} />
        </Field>
        <Field label="Supporting documents" hint="PDF only, up to 5 MB in total. Re-attach files after an error. Stored for curator review, never published.">
          <input name="documents" type="file" accept="application/pdf,.pdf" multiple className="text-[14px] text-ink-2 file:mr-3 file:h-11 file:rounded-[6px] sm:file:h-8 file:border file:border-line-strong file:bg-surface file:px-3 file:text-[13px] file:font-medium file:text-ink hover:file:bg-fill" />
        </Field>
      </fieldset>

      {state.error && <Notice>{state.error}</Notice>}

      <div className="flex gap-3">
        <Button name="intent" value="submit" disabled={pending} className="flex-1 sm:flex-none">Submit for review</Button>
        <Button name="intent" value="draft" variant="secondary" disabled={pending} className="flex-1 sm:flex-none">Save draft</Button>
      </div>
    </form>
  );
}
