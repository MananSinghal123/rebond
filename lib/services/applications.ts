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

export type DocumentUpload = { name: string; bytes: Uint8Array<ArrayBuffer> };

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
