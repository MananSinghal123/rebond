'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { usdToCents } from '@/lib/domain/money';
import { attestInvestor } from '@/lib/services/accounts';
import { fundBond } from '@/lib/services/funding';

export async function fundAction(formData: FormData) {
  const actor = await requireActor('INVESTOR');
  const bondId = String(formData.get('bondId'));
  const result = await fundBond(actor, bondId, usdToCents(Number(formData.get('amountUsd'))));
  if (!result.ok) redirect(`/bonds/${bondId}?error=${encodeURIComponent(result.error)}`);

  revalidatePath('/bonds');
  revalidatePath('/portfolio');
  redirect(`/bonds/${bondId}?funded=${result.value.txHash}`);
}

export async function attestAction(formData: FormData) {
  const actor = await requireActor('INVESTOR');
  await attestInvestor(actor);
  redirect(`/bonds/${String(formData.get('bondId'))}`);
}
