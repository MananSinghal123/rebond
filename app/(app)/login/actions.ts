'use server';

import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@/lib/auth/edge';
import { startSession } from '@/lib/auth/session';
import { signIn, signUp } from '@/lib/services/accounts';

const isSafeNext = (next: string) => next.startsWith('/') && !next.startsWith('//');

export async function authenticate(formData: FormData) {
  const credentials = { email: formData.get('email'), password: formData.get('password') };
  const result = formData.get('intent') === 'signup' ? await signUp(credentials) : await signIn(credentials);
  if (!result.ok) redirect(`/login?error=${encodeURIComponent(result.error)}`);

  const { id, role } = result.value;
  await startSession({ userId: id, role });
  if (role === null) redirect('/onboarding');

  const next = String(formData.get('next') ?? '');
  redirect(isSafeNext(next) ? next : ROLE_HOME[role]);
}
