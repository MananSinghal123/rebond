# Domain Types and Bond Lifecycle Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Define every shared enum and type, the `Result` / `assert` conventions, the FR-10 bond status machine as data, and the named status groups (`EDITABLE_STATUSES`, `PUBLIC_STATUSES`, `RAISED_STATUSES`, `ISSUER_LOCKED_STATUSES`) that every later plan imports instead of writing its own arrays.

**Architecture:** REQUIREMENTS.md §5 (data model) and FR-10 (status flow). Owner: `lib/domain/`, a pure module with no I/O. Every later plan imports these names. Enums are `as const` arrays because SQLite stores them as strings (see 00-overview "Conventions").

**Tech Stack:** TypeScript, Vitest.

---

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/domain/lifecycle.ts`
- Test: `tests/domain/lifecycle.test.ts`

### Task 1: Shared types

- [ ] **Step 1: Create `lib/domain/types.ts`**

```ts
export const ROLES = ['INVESTOR', 'CURATOR', 'COMPANY'] as const;
export type Role = (typeof ROLES)[number];

export const BOND_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'REJECTED',
  'LISTED',
  'FUNDED',
  'ACTIVE',
  'MATURED',
] as const;
export type BondStatus = (typeof BOND_STATUSES)[number];

export const PAYOUT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'AT_MATURITY'] as const;
export type PayoutFrequency = (typeof PAYOUT_FREQUENCIES)[number];

export const DISTRIBUTION_STATUSES = ['SCHEDULED', 'PAID', 'LATE'] as const;
export type DistributionStatus = (typeof DISTRIBUTION_STATUSES)[number];

export const CHAIN_EVENT_TYPES = [
  'BOND_LISTED',
  'POSITION_OPENED',
  'BOND_FUNDED',
  'DISTRIBUTION_PAID',
  'BOND_MATURED',
] as const;
export type ChainEventType = (typeof CHAIN_EVENT_TYPES)[number];

export type Cents = number;
export type Bps = number;

export type Actor = { userId: string; role: Role };

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: string): Result<never> => ({ ok: false, error });

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant: ${message}`);
}

export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Invariant: expected ok result, got "${result.error}"`);
  return result.value;
}

export function parseEnum<T extends string>(values: readonly T[], raw: string): T {
  const match = values.find((value) => value === raw);
  assert(match !== undefined, `unknown enum value "${raw}"`);
  return match;
}
```

### Task 2: Lifecycle transitions

- [ ] **Step 1: Write the failing test `tests/domain/lifecycle.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition, curatorCanDecide, curatorCanView, EDITABLE_STATUSES } from '@/lib/domain/lifecycle';
import { BOND_STATUSES, parseEnum } from '@/lib/domain/types';

describe('bond lifecycle follows Apply → Curate → Fund → Settle', () => {
  describe('when a curator decides on an application in review', () => {
    it('allows listing, rejecting or requesting changes from IN_REVIEW', () => {
      expect(canTransition('IN_REVIEW', 'LISTED')).toBe(true);
      expect(canTransition('IN_REVIEW', 'REJECTED')).toBe(true);
      expect(canTransition('IN_REVIEW', 'CHANGES_REQUESTED')).toBe(true);
    });
  });

  describe('when a step would skip review', () => {
    it('refuses to list a bond straight from SUBMITTED', () => {
      expect(canTransition('SUBMITTED', 'LISTED')).toBe(false);
      expect(() => assertTransition('SUBMITTED', 'LISTED')).toThrow('SUBMITTED → LISTED');
    });
  });

  describe('when a company resubmits after changes were requested', () => {
    it('returns the application from CHANGES_REQUESTED to SUBMITTED', () => {
      expect(canTransition('CHANGES_REQUESTED', 'SUBMITTED')).toBe(true);
    });
  });

  describe('when a bond is funded', () => {
    it('moves LISTED to FUNDED to ACTIVE to MATURED and no other way', () => {
      expect(canTransition('LISTED', 'FUNDED')).toBe(true);
      expect(canTransition('FUNDED', 'ACTIVE')).toBe(true);
      expect(canTransition('ACTIVE', 'MATURED')).toBe(true);
      expect(canTransition('LISTED', 'ACTIVE')).toBe(false);
    });
  });

  describe('when a bond is REJECTED or MATURED', () => {
    it('allows no further transition from a terminal status', () => {
      for (const to of BOND_STATUSES) {
        expect(canTransition('REJECTED', to)).toBe(false);
        expect(canTransition('MATURED', to)).toBe(false);
      }
    });
  });

  describe('when a company opens an application to edit', () => {
    it('permits edits only in DRAFT and CHANGES_REQUESTED', () => {
      expect(EDITABLE_STATUSES).toEqual(['DRAFT', 'CHANGES_REQUESTED']);
    });
  });

  describe('when a curator opens an application', () => {
    it('shows queued applications and the curator\'s own claims, never other drafts or reviews', () => {
      expect(curatorCanView('SUBMITTED', false)).toBe(true);
      expect(curatorCanView('IN_REVIEW', true)).toBe(true);
      expect(curatorCanView('IN_REVIEW', false)).toBe(false);
      expect(curatorCanView('DRAFT', false)).toBe(false);
    });

    it('lets only the claiming curator decide, and only while IN_REVIEW', () => {
      expect(curatorCanDecide('IN_REVIEW', true)).toBe(true);
      expect(curatorCanDecide('IN_REVIEW', false)).toBe(false);
      expect(curatorCanDecide('SUBMITTED', true)).toBe(false);
    });
  });
});

describe('stored status strings are validated on read', () => {
  it('returns the typed status when the stored string is a known BondStatus', () => {
    expect(parseEnum(BOND_STATUSES, 'LISTED')).toBe('LISTED');
  });

  it('throws when the stored string is not a known BondStatus', () => {
    expect(() => parseEnum(BOND_STATUSES, 'PENDING')).toThrow('"PENDING"');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/domain/lifecycle.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/domain/lifecycle"`

- [ ] **Step 3: Create `lib/domain/lifecycle.ts`**

```ts
import { assert, type BondStatus, type DistributionStatus } from './types';

const TRANSITIONS: Record<BondStatus, readonly BondStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['IN_REVIEW'],
  IN_REVIEW: ['CHANGES_REQUESTED', 'REJECTED', 'LISTED'],
  CHANGES_REQUESTED: ['SUBMITTED'],
  REJECTED: [],
  LISTED: ['FUNDED'],
  FUNDED: ['ACTIVE'],
  ACTIVE: ['MATURED'],
  MATURED: [],
};

export const EDITABLE_STATUSES: readonly BondStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];
export const PUBLIC_STATUSES: readonly BondStatus[] = ['LISTED', 'FUNDED', 'ACTIVE', 'MATURED'];
export const RAISED_STATUSES: readonly BondStatus[] = ['FUNDED', 'ACTIVE', 'MATURED'];
export const ISSUER_LOCKED_STATUSES: readonly BondStatus[] = ['SUBMITTED', 'IN_REVIEW', ...PUBLIC_STATUSES];
export const SETTLED_DISTRIBUTION_STATUSES = ['PAID', 'LATE'] as const satisfies readonly DistributionStatus[];
export type SettledStatus = (typeof SETTLED_DISTRIBUTION_STATUSES)[number];

export function curatorCanView(status: BondStatus, claimedByMe: boolean): boolean {
  return status === 'SUBMITTED' || claimedByMe;
}

export function curatorCanDecide(status: BondStatus, claimedByMe: boolean): boolean {
  return status === 'IN_REVIEW' && claimedByMe;
}

export function canTransition(from: BondStatus, to: BondStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BondStatus, to: BondStatus): void {
  assert(canTransition(from, to), `illegal bond transition ${from} → ${to}`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/domain/lifecycle.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Soundness check**

In `TRANSITIONS`, change `SUBMITTED: ['IN_REVIEW']` to `SUBMITTED: ['IN_REVIEW', 'LISTED']`.
Run the same command. Expected: FAIL on `refuses to list a bond straight from SUBMITTED`.
Restore and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/domain/types.ts lib/domain/lifecycle.ts tests/domain/lifecycle.test.ts
git commit -m "feat(domain): shared enums, Result type and bond lifecycle"
```
