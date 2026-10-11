import { jwtVerify, SignJWT } from 'jose';
import { assert, parseEnum, ROLES, type Role } from '@/lib/domain/types';

export const SESSION_COOKIE = 'rebond_session';

export type Session = { userId: string; role: Role | null };
export type Access = { kind: 'allow' } | { kind: 'redirect'; to: string };

export const ROLE_HOME: Record<Role, string> = {
  INVESTOR: '/portfolio',
  COMPANY: '/company',
  CURATOR: '/curator',
};

const PROTECTED: readonly { prefix: string; role: Role | 'ANY' }[] = [
  { prefix: '/portfolio', role: 'INVESTOR' },
  { prefix: '/company', role: 'COMPANY' },
  { prefix: '/curator', role: 'CURATOR' },
  { prefix: '/onboarding', role: 'ANY' },
];

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function routeAccess(pathname: string, session: Session | null): Access {
  const rule = PROTECTED.find((r) => isUnder(pathname, r.prefix));
  if (!rule) return { kind: 'allow' };
  if (!session) return { kind: 'redirect', to: `/login?next=${encodeURIComponent(pathname)}` };
  if (rule.role === 'ANY') return { kind: 'allow' };
  if (session.role === null) return { kind: 'redirect', to: '/onboarding' };
  if (session.role !== rule.role) return { kind: 'redirect', to: ROLE_HOME[session.role] };
  return { kind: 'allow' };
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  assert(secret && secret.length >= 32, 'SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<Session | null> {
  const verified = await jwtVerify(token, secretKey()).catch(() => null);
  if (!verified?.payload.sub) return null;
  const { sub, role } = verified.payload;
  return { userId: sub, role: typeof role === 'string' ? parseEnum(ROLES, role) : null };
}
