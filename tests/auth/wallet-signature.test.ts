import { describe, expect, it } from 'vitest';
import { addressFromHex, verifyWalletSignature } from '@/lib/auth/wallet-signature';

const ADDRESS_HEX =
  '0197cab94302b6d471d54db7052335dbfcf980f8dfc924dd1777ee784a18987c1612069d4080a0eb247820cb987fea81bddeaafdd41f996281';
const ADDRESS = 'addr1qxtu4w2rq2mdguw4fkms2ge4m070nq8cmlyjfhghwlh8sjscnp7pvysxn4qgpg8ty3uzpjuc0l4gr0w74t7ag8uev2qseuyw6u';
const KEY = 'a4010103272006215820472be3f30b51ead6d020e0d370774861e242ca23eaca2f4eff4ddb8eaa3abefd';
const SIGNATURE =
  '845846a20127676164647265737358390197cab94302b6d471d54db7052335dbfcf980f8dfc924dd1777ee784a18987c1612069d4080a0eb247820cb987fea81bddeaafdd41f996281a166686173686564f44b68656c6c6f20776f726c645840d1a116c02d6ea035928f85ae59b7181f2b1cc31e673e1d890a5f92d6d3def81d667664ac091b42bd746dcd60b1a735b6c0ecceaa6672434ecf719b380db87808';

describe('wallet sign-in trusts only a CIP-30 signature over our challenge', () => {
  describe('when the wallet signed the exact challenge with the key behind its address', () => {
    it('returns the bech32 payment address', () => {
      expect(verifyWalletSignature({ addressHex: ADDRESS_HEX, signature: SIGNATURE, key: KEY, message: 'hello world' })).toEqual({
        ok: true,
        value: ADDRESS,
      });
    });
  });

  describe('when the signed message differs from the challenge', () => {
    it('rejects the sign-in', () => {
      const result = verifyWalletSignature({ addressHex: ADDRESS_HEX, signature: SIGNATURE, key: KEY, message: 'hello world!' });
      expect(result).toEqual({ ok: false, error: 'The wallet signature could not be verified. Please try again.' });
    });
  });

  describe('when the claimed address is not the one that signed', () => {
    it('rejects the sign-in', () => {
      const otherHex = `${ADDRESS_HEX.slice(0, -2)}00`;
      expect(verifyWalletSignature({ addressHex: otherHex, signature: SIGNATURE, key: KEY, message: 'hello world' }).ok).toBe(false);
    });
  });

  describe('when the wallet offers a stake address instead of a payment address', () => {
    it('refuses it as an account identity', () => {
      expect(addressFromHex('e118987c1612069d4080a0eb247820cb987fea81bddeaafdd41f996281')).toEqual({
        ok: false,
        error: 'Choose a payment address in your wallet.',
      });
    });
  });

  describe('when the address belongs to a test network', () => {
    it('encodes it with the addr_test prefix', () => {
      const testnetHex = `00${ADDRESS_HEX.slice(2)}`;
      const result = addressFromHex(testnetHex);
      expect(result.ok && result.value.startsWith('addr_test1')).toBe(true);
    });
  });
});
