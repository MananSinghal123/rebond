# Applications Service Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Companies save and submit bond applications with FR-9 validation and PDF uploads (5 MB in total per save). Edits are allowed only in `DRAFT` or `CHANGES_REQUESTED`.

**Architecture:** REQUIREMENTS.md FR-8 (fields and PDF upload, stored only), FR-9 (amount > 0, rate 0–30%, term 1–60) and FR-10 (`DRAFT → SUBMITTED`, `CHANGES_REQUESTED → SUBMITTED`). Owner: `lib/services/applications.ts`. Edits are a guarded `updateMany` on the status read earlier (`where: { id, status: expected }`), so a stale save cannot push a claimed or listed bond back to DRAFT or rewrite its terms. The $8,000,000 cap keeps every stored cents value inside a 32-bit `Int`: the worst case is $8M principal + 30% × 5 years of interest = $20M, which is under $21.47M. Company name and description live on `Company` (§5), so saving an application updates them too, unless the company has a bond in `ISSUER_LOCKED_STATUSES`: once a curator may be reviewing or has vetted the issuer, its identity cannot change under investors. The rename is a guarded `updateMany` (`bonds: { none: { status in locked } }`) written first in a serializable `runTx`, before the bond's own status changes; either guard failing calls `abort`, so a refused save never leaves a partial rename (plan 07). Submitting clears any previous `curatorId`, so a resubmitted application returns to the shared queue (FR-12). Documents are stored as bytes, capped at 5 MB in total per save, and must start with `%PDF`. `next.config.ts` raises the server-action body limit so a 5 MB PDF fits.

**Tech Stack:** Prisma 6, Zod, Vitest.

---

**Files:**
- Create: `lib/services/applications.ts`
- Test: `tests/services/applications.test.ts`
- Modify: `next.config.ts`

### Task 1: Save and submit applications

- [ ] **Step 1: Write the failing test `tests/services/applications.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { saveApplication } from '@/lib/services/applications';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActor } from '../helpers/actors';

const FIELDS = {
  companyName: 'Northwind Health',
  description: 'Regional clinic network with contracted health-plan premiums.',
  amountUsd: '250000',
  ratePct: '11',
  termMonths: '12',
  payoutFrequency: 'QUARTERLY',
  contractSummary: 'Three-year capitation contract with a regional health plan.',
  annualRevenueUsd: '1800000',
};

const pdf = (name = 'contract.pdf') => ({ name, bytes: new TextEncoder().encode('%PDF-1.7 demo') });

describe('companies apply to raise a bond', () => {
  let company: Actor;

  beforeEach(async () => {
    await clearDatabase();
    company = await makeActor('COMPANY');
  });

  describe('when a valid application is submitted with a PDF', () => {
    it('stores it as SUBMITTED in cents and basis points, with the document', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: true, fields: FIELDS, documents: [pdf()] }));
      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { documents: true, company: true } });
      expect(bond).toMatchObject({
        status: 'SUBMITTED',
        amountCents: 25_000_000,
        rateBps: 1100,
        termMonths: 12,
        payoutFrequency: 'QUARTERLY',
        annualRevenueCents: 180_000_000,
      });
      expect(bond.company.name).toBe('Northwind Health');
      expect(bond.documents.map((d) => d.name)).toEqual(['contract.pdf']);
    });
  });

  describe('when the application is saved as a draft', () => {
    it('keeps it in DRAFT', async () => {
      const result = unwrap(await saveApplication(company, { submit: false, fields: FIELDS, documents: [] }));
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('when the fixed rate is above 30%', () => {
    it('rejects the application and creates no bond', async () => {
      const result = await saveApplication(company, { submit: true, fields: { ...FIELDS, ratePct: '30.5' }, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Rate must be 30% or less.' });
      expect(await db.bond.count()).toBe(0);
    });
  });

  describe('when the term is longer than 60 months', () => {
    it('rejects the application', async () => {
      const result = await saveApplication(company, { submit: true, fields: { ...FIELDS, termMonths: '61' }, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Term must be 1 to 60 months.' });
    });
  });

  describe('when the raise is below the $100 minimum ticket', () => {
    it('rejects the application so every listed bond can be filled', async () => {
      const result = await saveApplication(company, { submit: true, fields: { ...FIELDS, amountUsd: '99' }, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Raise amount must be at least $100, the minimum ticket.' });
    });
  });

  describe('when an uploaded file is not a PDF', () => {
    it('rejects the application and names the file', async () => {
      const fake = { name: 'contract.pdf', bytes: new TextEncoder().encode('MZ not a pdf') };
      const result = await saveApplication(company, { submit: true, fields: FIELDS, documents: [fake] });
      expect(result).toEqual({ ok: false, error: 'contract.pdf is not a PDF.' });
    });
  });

  describe('when a draft is edited and then submitted', () => {
    it('updates the same bond and moves it to SUBMITTED', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: false, fields: FIELDS, documents: [] }));
      unwrap(await saveApplication(company, { bondId, submit: true, fields: { ...FIELDS, ratePct: '10.5' }, documents: [] }));
      expect(await db.bond.findUniqueOrThrow({ where: { id: bondId } })).toMatchObject({ status: 'SUBMITTED', rateBps: 1050 });
      expect(await db.bond.count()).toBe(1);
    });
  });

  describe('when the application is already SUBMITTED', () => {
    it('refuses further edits', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: true, fields: FIELDS, documents: [] }));
      const result = await saveApplication(company, { bondId, submit: true, fields: FIELDS, documents: [] });
      expect(result).toEqual({ ok: false, error: 'This application can no longer be edited.' });
    });
  });

  describe('when the company already has a bond submitted for review', () => {
    it('refuses to rename the company on a new application', async () => {
      unwrap(await saveApplication(company, { submit: true, fields: FIELDS, documents: [] }));
      const result = await saveApplication(company, {
        submit: false,
        fields: { ...FIELDS, companyName: 'Renamed Health' },
        documents: [],
      });
      expect(result).toEqual({ ok: false, error: 'Company details are locked while a bond is in review or listed.' });
      expect((await db.company.findUniqueOrThrow({ where: { ownerId: company.userId } })).name).toBe('Northwind Health');
    });
  });

  describe('when another company tries to edit the application', () => {
    it('treats the application as not found', async () => {
      const { bondId } = unwrap(await saveApplication(company, { submit: false, fields: FIELDS, documents: [] }));
      const intruder = await makeActor('COMPANY');
      const result = await saveApplication(intruder, { bondId, submit: true, fields: FIELDS, documents: [] });
      expect(result).toEqual({ ok: false, error: 'Application not found.' });
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/applications.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/applications"`

- [ ] **Step 3: Create `lib/services/applications.ts`**

```ts
import { z } from 'zod';
import { abort, db, runTx } from '@/lib/db';
import { assertTransition, EDITABLE_STATUSES, ISSUER_LOCKED_STATUSES } from '@/lib/domain/lifecycle';
import { centsToUsd, MAX_AMOUNT_USD, MIN_TICKET_CENTS, pctToBps, usdToCents } from '@/lib/domain/money';
import {
  assert,
  BOND_STATUSES,
  fail,
  ok,
  parseEnum,
  PAYOUT_FREQUENCIES,
  type Actor,
  type BondStatus,
  type Result,
} from '@/lib/domain/types';

export const MAX_DOCUMENTS_BYTES = 5 * 1024 * 1024;
const NOT_EDITABLE = 'This application can no longer be edited.';

export const ApplicationSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required.').max(120),
  description: z.string().trim().min(10, 'Describe the company in at least 10 characters.').max(2000),
  amountUsd: z.coerce
    .number()
    .min(centsToUsd(MIN_TICKET_CENTS), 'Raise amount must be at least $100, the minimum ticket.')
    .max(MAX_AMOUNT_USD, 'Raise amount is capped at $8,000,000 in this demo.'),
  ratePct: z.coerce.number().min(0.01, 'Rate must be above 0%.').max(30, 'Rate must be 30% or less.'),
  termMonths: z.coerce
    .number()
    .int('Term must be whole months.')
    .min(1, 'Term must be 1 to 60 months.')
    .max(60, 'Term must be 1 to 60 months.'),
  payoutFrequency: z.enum(PAYOUT_FREQUENCIES, { message: 'Choose a payout frequency.' }),
  contractSummary: z.string().trim().min(10, 'Summarise the contracts backing this bond.').max(4000),
  annualRevenueUsd: z.coerce
    .number()
    .min(0.01, 'Annual contracted revenue must be greater than 0.')
    .max(MAX_AMOUNT_USD, 'Annual revenue is capped at $8,000,000 in this demo.'),
});

export type DocumentUpload = { name: string; bytes: Uint8Array };

export type SaveRequest = {
  bondId?: string;
  submit: boolean;
  fields: unknown;
  documents: DocumentUpload[];
};

const isPdf = (doc: DocumentUpload) =>
  doc.name.toLowerCase().endsWith('.pdf') && new TextDecoder().decode(doc.bytes.slice(0, 4)) === '%PDF';

export async function saveApplication(
  actor: Actor,
  request: SaveRequest,
): Promise<Result<{ bondId: string; status: BondStatus }>> {
  assert(actor.role === 'COMPANY', 'only companies save applications');

  const parsed = ApplicationSchema.safeParse(request.fields);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const notPdf = request.documents.find((doc) => !isPdf(doc));
  if (notPdf) return fail(`${notPdf.name} is not a PDF.`);
  const totalBytes = request.documents.reduce((sum, doc) => sum + doc.bytes.byteLength, 0);
  if (totalBytes > MAX_DOCUMENTS_BYTES) return fail('Documents must be 5 MB or less in total.');

  const company = await db.company.findUniqueOrThrow({ where: { ownerId: actor.userId } });
  const existing = request.bondId ? await db.bond.findUnique({ where: { id: request.bondId } }) : null;
  if (request.bondId && existing?.companyId !== company.id) return fail('Application not found.');

  const current: BondStatus = existing ? parseEnum(BOND_STATUSES, existing.status) : 'DRAFT';
  if (!EDITABLE_STATUSES.includes(current)) return fail(NOT_EDITABLE);
  const status: BondStatus = request.submit ? 'SUBMITTED' : current;
  if (status !== current) assertTransition(current, status);

  const fields = parsed.data;
  const detailsChanged = fields.companyName !== company.name || fields.description !== company.description;
  const bondData = {
    status,
    ...(status === 'SUBMITTED' ? { curatorId: null } : {}),
    amountCents: usdToCents(fields.amountUsd),
    rateBps: pctToBps(fields.ratePct),
    termMonths: fields.termMonths,
    payoutFrequency: fields.payoutFrequency,
    contractSummary: fields.contractSummary,
    annualRevenueCents: usdToCents(fields.annualRevenueUsd),
  };

  return runTx(async (tx): Promise<Result<{ bondId: string; status: BondStatus }>> => {
    if (detailsChanged) {
      const renamed = await tx.company.updateMany({
        where: { id: company.id, bonds: { none: { status: { in: [...ISSUER_LOCKED_STATUSES] } } } },
        data: { name: fields.companyName, description: fields.description },
      });
      if (renamed.count === 0) abort('Company details are locked while a bond is in review or listed.');
    }
    if (existing) {
      const updated = await tx.bond.updateMany({ where: { id: existing.id, status: current }, data: bondData });
      if (updated.count === 0) abort(NOT_EDITABLE);
    }
    const bondId = existing?.id ?? (await tx.bond.create({ data: { ...bondData, companyId: company.id } })).id;

    await tx.document.createMany({
      data: request.documents.map((doc) => ({ bondId, name: doc.name, sizeBytes: doc.bytes.byteLength, data: doc.bytes })),
    });
    return ok({ bondId, status });
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/applications.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Soundness check**

Delete the line `if (!EDITABLE_STATUSES.includes(current)) return fail(NOT_EDITABLE);`.
Run the same command. Expected: FAIL in `refuses further edits`, because the result is `{ ok: true, … }`: the submitted application was silently overwritten.
Restore and re-run. Expected: PASS.

### Task 2: Allow 5 MB uploads through server actions

- [ ] **Step 1: Replace `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/services/applications.ts tests/services/applications.test.ts next.config.ts
git commit -m "feat(company): save and submit bond applications with PDF uploads"
```
