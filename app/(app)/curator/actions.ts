'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { pctToBps } from '@/lib/domain/money';
import { claimApplication, decideApplication, type Decision } from '@/lib/services/review';

const withError = (path: string, error: string) => `${path}?error=${encodeURIComponent(error)}`;

export async function claimAction(formData: FormData) {
  const actor = await requireActor('CURATOR');
  const bondId = String(formData.get('bondId'));
  const result = await claimApplication(actor, bondId);
  if (!result.ok) redirect(withError('/curator', result.error));
  revalidatePath('/curator');
  redirect(`/curator/review/${bondId}`);
}

function readDecision(formData: FormData): Decision {
  const note = String(formData.get('note') ?? '');
  const kind = formData.get('kind');
  if (kind === 'APPROVE') return { kind, feeBps: pctToBps(Number(formData.get('feePct'))), note };
  if (kind === 'REQUEST_CHANGES' || kind === 'REJECT') return { kind, note };
  throw new Error(`Invariant: unknown decision kind "${String(kind)}"`);
}

export async function decideAction(formData: FormData) {
  const actor = await requireActor('CURATOR');
  const bondId = String(formData.get('bondId'));
  const result = await decideApplication(actor, bondId, readDecision(formData));
  if (!result.ok) redirect(withError(`/curator/review/${bondId}`, result.error));
  revalidatePath('/curator');
  revalidatePath('/bonds');
  redirect(result.value.status === 'LISTED' ? `/bonds/${bondId}` : '/curator');
}
