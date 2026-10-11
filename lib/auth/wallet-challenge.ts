import { randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { secretKey } from './edge';

const CHALLENGE_COOKIE = 'rebond_wallet_challenge';
const CHALLENGE_TTL_SECONDS = 5 * 60;

export const challengeMessage = (nonce: string) => `Sign in to ReBond\nNonce: ${nonce}`;

export async function issueChallenge(): Promise<string> {
  const nonce = randomBytes(16).toString('hex');
  const token = await new SignJWT({ nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${CHALLENGE_TTL_SECONDS}s`)
    .sign(secretKey());
  (await cookies()).set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CHALLENGE_TTL_SECONDS,
  });
  return challengeMessage(nonce);
}

export async function consumeChallenge(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  store.delete(CHALLENGE_COOKIE);
  if (!token) return null;
  const verified = await jwtVerify(token, secretKey()).catch(() => null);
  const nonce = verified?.payload.nonce;
  return typeof nonce === 'string' ? challengeMessage(nonce) : null;
}
