import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SESSION_COOKIE, signSession, verifySession, type Session } from './edge';
import type { Actor, Role } from '@/lib/domain/types';

const WEEK_SECONDS = 60 * 60 * 24 * 7;

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
});

export async function startSession(session: Session) {
  (await cookies()).set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: WEEK_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireRole(): Promise<Session & { role: Role }> {
  const session = await requireSession();
  if (session.role === null) redirect('/onboarding');
  return { userId: session.userId, role: session.role };
}

export async function requireActor(role: Role): Promise<Actor> {
  const session = await requireSession();
  if (session.role !== role) redirect('/');
  return { userId: session.userId, role };
}
