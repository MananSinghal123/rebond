# Simulated Chain Events and Mock Wallet Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Deterministic fake Cardano-style records: `buildChainEvent` (payload hash plus tx hash, refusing PII) and `fakeWalletAddress` (an `addr1…` string).

**Architecture:** REQUIREMENTS.md FR-5 (fake `addr1…` wallet), FR-27 (ChainEvent row per lifecycle event) and FR-29 (no PII in the chain payload). Owner: `lib/domain/chain.ts`. It uses `node:crypto` and is server-only by usage: never import it from a `'use client'` file. Services persist the returned draft with `tx.chainEvent.create({ data })`. Nothing here talks to a network. Real CIP-30 and Cardano transactions are Phase 2 (§2 out of scope).

**Tech Stack:** TypeScript, `node:crypto`, Vitest.

---

**Files:**
- Create: `lib/domain/chain.ts`
- Test: `tests/domain/chain.test.ts`

### Task 1: Chain events and wallet address

- [ ] **Step 1: Write the failing test `tests/domain/chain.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildChainEvent, fakeWalletAddress } from '@/lib/domain/chain';

const at = new Date('2026-10-10T12:00:00Z');
const HEX_64 = /^[0-9a-f]{64}$/;

describe('lifecycle events get a simulated on-chain record', () => {
  describe('when a bond is listed', () => {
    it('produces a 64-hex tx hash and payload hash stamped with the event time', () => {
      const event = buildChainEvent('bond_1', 'BOND_LISTED', { amountCents: 25_000_000, rateBps: 1100 }, at);
      expect(event).toMatchObject({ bondId: 'bond_1', type: 'BOND_LISTED', createdAt: at });
      expect(event.txHash).toMatch(HEX_64);
      expect(event.payloadHash).toMatch(HEX_64);
    });
  });

  describe('when the same event is rebuilt', () => {
    it('yields the same hashes regardless of payload key order', () => {
      const a = buildChainEvent('bond_1', 'BOND_FUNDED', { amountCents: 1, distributions: 4 }, at);
      const b = buildChainEvent('bond_1', 'BOND_FUNDED', { distributions: 4, amountCents: 1 }, at);
      expect(b).toEqual(a);
    });
  });

  describe('when two events differ only in payload', () => {
    it('yields different tx hashes', () => {
      const a = buildChainEvent('bond_1', 'DISTRIBUTION_PAID', { seq: 1 }, at);
      const b = buildChainEvent('bond_1', 'DISTRIBUTION_PAID', { seq: 2 }, at);
      expect(b.txHash).not.toBe(a.txHash);
    });
  });

  describe('when a payload field contains an email address', () => {
    it('refuses to record PII on the simulated chain', () => {
      expect(() => buildChainEvent('bond_1', 'POSITION_OPENED', { investor: 'ana@example.com' }, at)).toThrow(
        'chain payload field "investor"',
      );
    });
  });
});

describe('connecting a wallet stores a fake Cardano address', () => {
  it('returns a 103-character addr1q address in the bech32 alphabet', () => {
    const address = fakeWalletAddress('user_123');
    expect(address).toMatch(/^addr1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{97}$/);
  });

  it('returns the same address for the same user', () => {
    expect(fakeWalletAddress('user_123')).toBe(fakeWalletAddress('user_123'));
    expect(fakeWalletAddress('user_456')).not.toBe(fakeWalletAddress('user_123'));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/domain/chain.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/domain/chain"`

- [ ] **Step 3: Create `lib/domain/chain.ts`**

```ts
import { createHash } from 'node:crypto';
import { assert, type ChainEventType } from './types';

export type ChainPayload = Record<string, string | number>;

export type ChainEventDraft = {
  bondId: string;
  type: ChainEventType;
  payloadHash: string;
  txHash: string;
  createdAt: Date;
};

const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const sha256 = (input: string) => createHash('sha256').update(input).digest('hex');

const canonicalJson = (payload: ChainPayload) =>
  JSON.stringify(Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b))));

function assertNoPii(payload: ChainPayload) {
  for (const [field, value] of Object.entries(payload)) {
    assert(!(typeof value === 'string' && value.includes('@')), `chain payload field "${field}" looks like an email`);
  }
}

export function buildChainEvent(bondId: string, type: ChainEventType, payload: ChainPayload, at: Date): ChainEventDraft {
  assertNoPii(payload);
  const payloadHash = sha256(canonicalJson({ ...payload, bondId, type }));
  const txHash = sha256(`${payloadHash}:${at.toISOString()}`);
  return { bondId, type, payloadHash, txHash, createdAt: at };
}

export function fakeWalletAddress(seed: string): string {
  const bytes = createHash('sha512').update(seed).digest();
  const body = Array.from({ length: 97 }, (_, i) => BECH32[bytes[i % bytes.length] % 32]).join('');
  return `addr1q${body}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/domain/chain.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Soundness check**

Delete the `assertNoPii(payload);` line.
Run the same command. Expected: FAIL `refuses to record PII…`, because the function did not throw.
Restore and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/domain/chain.ts tests/domain/chain.test.ts
git commit -m "feat(domain): simulated chain events with PII guard and fake wallet"
```
