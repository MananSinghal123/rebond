# Company Apply UI Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** `/company/apply`: one plain form that saves a draft or submits for review, and keeps the user's input when the server rejects it.

**Architecture:** REQUIREMENTS.md FR-8 (form fields), FR-9 (validation) and §6 `/company/apply`. Owner: `components/application-form.tsx`, a client component reused by the edit view in plan 17. This is the one form that uses `useActionState`: it is long, and losing the input on a server error would be costly. React 19 resets uncontrolled fields after every form action, so on error the action returns the submitted text values and the form renders them as `defaultValue`. The reset then restores what the user typed. File inputs cannot be restored, and the hint says so. Both submit buttons are disabled while the action is pending, which is the MVP's guard against a double-submitted **first** save creating two bonds (edits are protected by the guarded writes in plan 15). Browser constraints (`required`, `min`, `max`, `step`) mirror FR-9 so most mistakes never reach the server. The server action re-checks the role (NFR-4) and delegates to `saveApplication` (plan 15). Load impeccable `reference/craft-floor.md` before editing.

**Tech Stack:** React 19 `useActionState`, Next.js 15 server actions.

---

**Files:**
- Create: `components/application-form.tsx`
- Create: `app/(app)/company/actions.ts`
- Create: `app/(app)/company/apply/page.tsx`

### Task 1: Server action

- [ ] **Step 1: Create `app/(app)/company/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/components/application-form';
import { requireActor } from '@/lib/auth/session';
import { saveApplication } from '@/lib/services/applications';

const textFields = (formData: FormData) =>
  Object.fromEntries([...formData].filter((entry): entry is [string, string] => typeof entry[1] === 'string'));

export async function saveApplicationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor('COMPANY');
  const files = formData.getAll('documents').filter((value): value is File => value instanceof File && value.size > 0);
  const documents = await Promise.all(
    files.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })),
  );

  const result = await saveApplication(actor, {
    bondId: String(formData.get('bondId') ?? '') || undefined,
    submit: formData.get('intent') === 'submit',
    fields: Object.fromEntries(formData),
    documents,
  });
  if (!result.ok) return { error: result.error, values: textFields(formData) };

  revalidatePath('/company');
  redirect(`/company/bonds/${result.value.bondId}`);
}
```

### Task 2: Form component

- [ ] **Step 1: Create `components/application-form.tsx`**

```tsx
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
    <form action={formAction} className="grid gap-6">
      {defaults.bondId && <input type="hidden" name="bondId" value={defaults.bondId} />}

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-sm font-semibold">Company</legend>
        <Field label="Company name">
          <input name="companyName" required minLength={2} maxLength={120} defaultValue={value('companyName')} className={inputClass} />
        </Field>
        <p className="text-sm">
          <span className="font-medium">Sector:</span> <span className="text-muted">Healthcare (the only market at launch)</span>
        </p>
        <Field label="Description">
          <textarea name="description" required minLength={10} maxLength={2000} defaultValue={value('description')} className={textareaClass} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Bond terms</legend>
        <Field label="Raise amount (USD)" hint="$100 to $8,000,000 in this demo.">
          <input name="amountUsd" type="number" required min={centsToUsd(MIN_TICKET_CENTS)} max={MAX_AMOUNT_USD} step="0.01" inputMode="decimal" defaultValue={value('amountUsd')} className={inputClass} />
        </Field>
        <Field label="Fixed annual rate (%)" hint="Above 0 and at most 30.">
          <input name="ratePct" type="number" required min={0.01} max={30} step="0.01" inputMode="decimal" defaultValue={value('ratePct')} className={inputClass} />
        </Field>
        <Field label="Term (months)" hint="1 to 60.">
          <input name="termMonths" type="number" required min={1} max={60} step={1} inputMode="numeric" defaultValue={value('termMonths')} className={inputClass} />
        </Field>
        <Field label="Payout frequency">
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
        <legend className="mb-2 text-sm font-semibold">Backing contracts</legend>
        <Field label="Contract summary" hint="Counterparties, term, and what the contracts pay.">
          <textarea name="contractSummary" required minLength={10} maxLength={4000} defaultValue={value('contractSummary')} className={textareaClass} />
        </Field>
        <Field label="Annual contracted revenue (USD)">
          <input name="annualRevenueUsd" type="number" required min={1} max={MAX_AMOUNT_USD} step="0.01" inputMode="decimal" defaultValue={value('annualRevenueUsd')} className={inputClass} />
        </Field>
        <Field label="Supporting documents" hint="PDF only, up to 5 MB in total. Re-attach files after an error. Stored for curator review, never published.">
          <input name="documents" type="file" accept="application/pdf,.pdf" multiple className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm" />
        </Field>
      </fieldset>

      {state.error && <Notice>{state.error}</Notice>}

      <div className="flex flex-wrap gap-3">
        <Button name="intent" value="submit" disabled={pending}>Submit for review</Button>
        <Button name="intent" value="draft" variant="secondary" disabled={pending}>Save draft</Button>
      </div>
    </form>
  );
}
```

### Task 3: Apply page

- [ ] **Step 1: Create `app/(app)/company/apply/page.tsx`**

```tsx
import { ApplicationForm } from '@/components/application-form';
import { PageHeader, Panel } from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { saveApplicationAction } from '../actions';

export default async function ApplyPage() {
  const actor = await requireActor('COMPANY');
  const company = await db.company.findUniqueOrThrow({ where: { ownerId: actor.userId } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Apply to raise a bond"
        description="Set a fixed rate and term backed by your contracted revenue. A curator reviews it before it is listed."
      />
      <Panel>
        <ApplicationForm action={saveApplicationAction} defaults={{ companyName: company.name, description: company.description }} />
      </Panel>
    </div>
  );
}
```

### Task 4: Verify and commit

`saveApplication` is integration-tested in plan 15. The submit path runs end to end in plan 28.

- [ ] **Step 1: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 2: Manual check**

Run: `pnpm dev`. Sign up as a company, then open `/company/apply`.
- Expected: the company name is prefilled from onboarding.
- Enter rate `31`, then **Submit**. Expected: the browser blocks it with a native "must be less than or equal to 30" message.
- Use DevTools to remove `max` from the rate input, then submit `31` again. Expected: red notice `Rate must be 30% or less.`, and every other field keeps its value.
- Fill valid values ($250,000 / 11 / 12 / Quarterly), attach a PDF, then **Submit for review**. Expected: redirect to `/company/bonds/<id>` (that page arrives in plan 17).
- At 360px: the term fields stack into one column.

- [ ] **Step 3: Commit**

```bash
git add components/application-form.tsx "app/(app)/company/actions.ts" "app/(app)/company/apply/page.tsx"
git commit -m "feat(company): application form with draft and submit"
```
