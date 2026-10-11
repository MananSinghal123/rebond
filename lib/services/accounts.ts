import { Prisma } from '@prisma/client';
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

const WalletAddress = z.string().regex(/^addr(_test)?1[02-9ac-hj-np-z]+$/, 'That is not a Cardano payment address.');

const GoogleDemoProfile = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  name: z.string().trim().min(1, 'Enter your name.').max(120),
});

const roleOf = (role: string | null): Role | null => (role === null ? null : parseEnum(ROLES, role));

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

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
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return fail('Email or password is incorrect.');
  }

  return ok({ id: user.id, role: roleOf(user.role) });
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

export async function signInWithWallet(address: string): Promise<Result<SessionUser>> {
  const parsed = WalletAddress.safeParse(address);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const user = await db.user.upsert({
    where: { walletAddress: parsed.data },
    create: { walletAddress: parsed.data, walletKind: 'EXTERNAL' },
    update: {},
  });
  return ok({ id: user.id, role: roleOf(user.role) });
}

export async function linkWallet(userId: string, address: string): Promise<Result<string>> {
  const parsed = WalletAddress.safeParse(address);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const linked = await db.user
    .updateMany({ where: { id: userId, walletAddress: null }, data: { walletAddress: parsed.data, walletKind: 'EXTERNAL' } })
    .catch((error: unknown) => {
      if (isUniqueViolation(error)) return null;
      throw error;
    });
  if (linked === null) return fail('This wallet is already linked to another account.');
  if (linked.count === 0) return fail('A wallet is already linked to this account.');
  return ok(parsed.data);
}

export async function signInWithGoogleDemo(input: unknown): Promise<Result<SessionUser>> {
  const parsed = GoogleDemoProfile.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return ok({ id: existing.id, role: roleOf(existing.role) });

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email } });
    return tx.user.update({
      where: { id: created.id },
      data: { walletAddress: fakeWalletAddress(created.id), walletKind: 'EMBEDDED_DEMO' },
    });
  });
  return ok({ id: user.id, role: null });
}
