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
