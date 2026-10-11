'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { consumeChallenge, issueChallenge } from '@/lib/auth/wallet-challenge';
import { verifyWalletSignature, type WalletSignature } from '@/lib/auth/wallet-signature';
import { linkWallet } from '@/lib/services/accounts';

export async function startWalletLink(): Promise<string> {
  await requireSession();
  return issueChallenge();
}

export async function finishWalletLink(proof: Omit<WalletSignature, 'message'>): Promise<{ error: string } | { ok: true }> {
  const session = await requireSession();
  const message = await consumeChallenge();
  if (!message) return { error: 'The request expired. Please try again.' };
  const address = verifyWalletSignature({ ...proof, message });
  if (!address.ok) return { error: address.error };
  const linked = await linkWallet(session.userId, address.value);
  if (!linked.ok) return { error: linked.error };
  revalidatePath('/', 'layout');
  return { ok: true };
}
