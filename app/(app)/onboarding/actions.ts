'use server';

import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@/lib/auth/edge';
import { requireSession, startSession } from '@/lib/auth/session';
import { chooseRole } from '@/lib/services/accounts';

export async function chooseRoleAction(formData: FormData) {
  const session = await requireSession();

  const result = await chooseRole(session.userId, {
    role: formData.get('role'),
    displayName: String(formData.get('displayName') ?? ''),
    verified: formData.get('verified') === 'on',
  });
  if (!result.ok) redirect(`/onboarding?error=${encodeURIComponent(result.error)}`);

  await startSession({ userId: session.userId, role: result.value.role });
  redirect(ROLE_HOME[result.value.role]);
}
