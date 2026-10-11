import { Prisma, PrismaClient } from '@prisma/client';
import { fail, type Result } from '@/lib/domain/types';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

class TxAborted extends Error {}

export function abort(message: string): never {
  throw new TxAborted(message);
}

export async function runTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<Result<T>>): Promise<Result<T>> {
  return db
    .$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    .catch((error: unknown) => {
      if (error instanceof TxAborted) return fail(error.message);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        return fail('Someone else changed this just now. Try again.');
      }
      throw error;
    });
}

export async function clearDatabase() {
  await db.$transaction([
    db.payout.deleteMany(),
    db.distribution.deleteMany(),
    db.chainEvent.deleteMany(),
    db.position.deleteMany(),
    db.document.deleteMany(),
    db.bond.deleteMany(),
    db.company.deleteMany(),
    db.curator.deleteMany(),
    db.user.deleteMany(),
  ]);
}
