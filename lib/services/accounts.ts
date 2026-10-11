import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { fakeWalletAddress } from '@/lib/domain/chain';
import { assert, fail, ok, parseEnum, ROLES, type Actor, type Result, type Role } from '@/lib/domain/types';

export type SessionUser = { id: string; role: Role | null };

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

const Credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const RoleChoice = z.object({
  role: z.enum(ROLES, { message: 'Choose a role.' }),
  displayName: z.string().trim().max(120),
  verified: z.boolean(),
});

export async function signUp(input: unknown): Promise<Result<SessionUser>> {
  const parsed = Credentials.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return fail('An account with this email already exists.');

  const user = await db.user.create({ data: { email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } });
  return ok({ id: user.id, role: null });
}

export async function signIn(input: unknown): Promise<Result<SessionUser>> {
  const parsed = Credentials.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return fail('Email or password is incorrect.');

  return ok({ id: user.id, role: user.role === null ? null : parseEnum(ROLES, user.role) });
}

export async function chooseRole(userId: string, input: unknown): Promise<Result<{ id: string; role: Role }>> {
  const parsed = RoleChoice.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { role, displayName, verified } = parsed.data;
  if (role !== 'INVESTOR' && displayName.length < 2) return fail('Enter a name of at least 2 characters.');

  const chosen = await db.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: userId, role: null },
      data: { role, verified: role === 'INVESTOR' && verified },
    });
    if (claimed.count === 0) return false;
    if (role === 'COMPANY') await tx.company.create({ data: { ownerId: userId, name: displayName } });
    if (role === 'CURATOR') await tx.curator.create({ data: { userId, displayName } });
    return true;
  });
  if (!chosen) return fail('Your role is already set.');
  return ok({ id: userId, role });
}

export async function attestInvestor(actor: Actor): Promise<void> {
  assert(actor.role === 'INVESTOR', 'only investors attest verification');
  await db.user.update({ where: { id: actor.userId }, data: { verified: true } });
}

export async function connectWallet(userId: string): Promise<string> {
  const walletAddress = fakeWalletAddress(userId);
  await db.user.update({ where: { id: userId }, data: { walletAddress } });
  return walletAddress;
}
