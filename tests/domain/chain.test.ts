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
