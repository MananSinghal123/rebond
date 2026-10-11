'use server';

import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@/lib/auth/edge';
import { startSession } from '@/lib/auth/session';
import { consumeChallenge, issueChallenge } from '@/lib/auth/wallet-challenge';
import { verifyWalletSignature, type WalletSignature } from '@/lib/auth/wallet-signature';
import type { Result } from '@/lib/domain/types';
import { signIn, signInWithGoogleDemo, signInWithWallet, signUp, type SessionUser } from '@/lib/services/accounts';

const isSafeNext = (next: string) => next.startsWith('/') && !next.startsWith('//');

async function enter(user: SessionUser, next: string): Promise<never> {
  await startSession({ userId: user.id, role: user.role });
  if (user.role === null) redirect('/onboarding');
  redirect(isSafeNext(next) ? next : ROLE_HOME[user.role]);
}

export async function authenticate(formData: FormData) {
  const credentials = { email: formData.get('email'), password: formData.get('password') };
  const result = formData.get('intent') === 'signup' ? await signUp(credentials) : await signIn(credentials);
  if (!result.ok) redirect(`/login?error=${encodeURIComponent(result.error)}`);
  await enter(result.value, String(formData.get('next') ?? ''));
}

export async function startWalletSignIn(): Promise<string> {
  return issueChallenge();
}

export async function finishWalletSignIn(
  proof: Omit<WalletSignature, 'message'>,
  next: string,
): Promise<{ error: string }> {
  const message = await consumeChallenge();
  if (!message) return { error: 'The sign-in request expired. Please try again.' };
  const address = verifyWalletSignature({ ...proof, message });
  if (!address.ok) return { error: address.error };
  const user: Result<SessionUser> = await signInWithWallet(address.value);
  if (!user.ok) return { error: user.error };
  return enter(user.value, next);
}

export async function googleDemoAction(formData: FormData) {
  const result = await signInWithGoogleDemo({ email: formData.get('email'), name: formData.get('name') });
  if (!result.ok) redirect(`/login/google?error=${encodeURIComponent(result.error)}`);
  await enter(result.value, String(formData.get('next') ?? ''));
}
