# Database Schema Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** The Prisma schema for every §5 entity on SQLite, a shared `db` client, `runTx`/`abort` for multi-write transactions, and `clearDatabase()` for tests and the seed.

**Architecture:** REQUIREMENTS.md §5 (data model), NFR-3 (integer cents and basis points) and §7 (Prisma + SQLite). Owner: `prisma/schema.prisma` and `lib/db.ts`. Enum columns are `String` and hold values from `lib/domain/types.ts`; read them back with `parseEnum`. The added columns are listed in 00-overview's deviations table. `Bond.fundedCents` is a running total that funding reserves with a guarded atomic increment (plan 20), so pages never re-sum positions. `Payout @@unique([distributionId, positionId])` makes a double payout impossible at the database level. `runTx(fn)` runs a serializable transaction; inside it, a guard that fails **after** an earlier write must call `abort(message)` (which throws and rolls everything back) and `runTx` turns that into `fail(message)`. A serialization conflict (Prisma `P2034`, e.g. a double-click racing itself on Postgres) also becomes a `fail`, never a 500. `return fail(...)` inside a plain transaction is allowed only before its first write. `ChainEvent.id` is an autoincrement so the simulated ledger has a strict order even when several events share one `createdAt` inside a transaction; always order the record by `id`.

**Tech Stack:** Prisma 6, SQLite.

---

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`
- Create: `.env.example`

### Task 1: Schema

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Enum-like String columns hold values from lib/domain/types.ts because SQLite has no enums.

model User {
  id            String     @id @default(cuid())
  email         String     @unique
  passwordHash  String
  role          String?
  walletAddress String?
  verified      Boolean    @default(false)
  createdAt     DateTime   @default(now())
  company       Company?
  curator       Curator?
  positions     Position[]
}

model Company {
  id          String @id @default(cuid())
  ownerId     String @unique
  owner       User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name        String
  sector      String @default("HEALTHCARE")
  description String @default("")
  bonds       Bond[]
}

model Curator {
  id          String @id @default(cuid())
  userId      String @unique
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName String
  bio         String @default("")
  bonds       Bond[]
}

model Bond {
  id                 String         @id @default(cuid())
  companyId          String
  company            Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  curatorId          String?
  curator            Curator?       @relation(fields: [curatorId], references: [id])
  status             String         @default("DRAFT")
  amountCents        Int
  fundedCents        Int            @default(0)
  rateBps            Int
  termMonths         Int
  payoutFrequency    String
  curatorFeeBps      Int?
  contractSummary    String
  annualRevenueCents Int
  reviewNote         String?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
  listedAt           DateTime?
  fundedAt           DateTime?
  maturityDate       DateTime?
  documents          Document[]
  positions          Position[]
  distributions      Distribution[]
  chainEvents        ChainEvent[]

  @@index([status])
}

model Document {
  id        String   @id @default(cuid())
  bondId    String
  bond      Bond     @relation(fields: [bondId], references: [id], onDelete: Cascade)
  name      String
  sizeBytes Int
  data      Bytes
  createdAt DateTime @default(now())
}

model Position {
  id          String   @id @default(cuid())
  bondId      String
  bond        Bond     @relation(fields: [bondId], references: [id], onDelete: Cascade)
  investorId  String
  investor    User     @relation(fields: [investorId], references: [id], onDelete: Cascade)
  amountCents Int
  txHash      String
  createdAt   DateTime @default(now())
  payouts     Payout[]

  @@index([investorId])
  @@index([bondId])
}

model Distribution {
  id          String    @id @default(cuid())
  bondId      String
  bond        Bond      @relation(fields: [bondId], references: [id], onDelete: Cascade)
  seq         Int
  dueDate     DateTime
  amountCents Int
  isPrincipal Boolean   @default(false)
  status      String    @default("SCHEDULED")
  paidAt      DateTime?
  txHash      String?
  payouts     Payout[]

  @@unique([bondId, seq])
  @@index([status, dueDate])
}

model Payout {
  id             String       @id @default(cuid())
  distributionId String
  distribution   Distribution @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  positionId     String
  position       Position     @relation(fields: [positionId], references: [id], onDelete: Cascade)
  amountCents    Int

  @@unique([distributionId, positionId])
  @@index([positionId])
}

model ChainEvent {
  id          Int      @id @default(autoincrement())
  bondId      String
  bond        Bond     @relation(fields: [bondId], references: [id], onDelete: Cascade)
  type        String
  payloadHash String
  txHash      String
  createdAt   DateTime

  @@index([bondId])
}
```

### Task 2: Environment and client

- [ ] **Step 1: Create `.env.example`**

```bash
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-32+-random-characters-openssl-rand-hex-32"
DEMO_DEV_TOOLS="1"
```

- [ ] **Step 2: Create your local `.env` from it**

```bash
cp .env.example .env
sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=\"$(openssl rand -hex 32)\"/" .env
```

- [ ] **Step 3: Create `lib/db.ts`**

```ts
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
```

### Task 3: Verify and commit

- [ ] **Step 1: Push the schema to the dev database**

Run: `pnpm prisma db push`
Expected: `🚀  Your database is now in sync with your Prisma schema.` followed by `✔ Generated Prisma Client`.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. `db.bond`, `db.chainEvent` and the other models resolve.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma lib/db.ts .env.example
git commit -m "feat(db): Prisma schema for bonds, positions, distributions, chain events"
```
