import verifySignature from '@cardano-foundation/cardano-verify-datasignature';
import { bech32, hex } from '@scure/base';
import { fail, ok, type Result } from '@/lib/domain/types';

const BECH32_LIMIT = 1023;
const MAINNET = 1;
const LAST_PAYMENT_TYPE = 7;

export type WalletSignature = { addressHex: string; signature: string; key: string; message: string };

export function addressFromHex(addressHex: string): Result<string> {
  if (!/^[0-9a-f]{58,}$/i.test(addressHex)) return fail('The wallet returned an unreadable address.');
  const bytes = hex.decode(addressHex.toLowerCase());
  const header = bytes[0];
  if (header >> 4 > LAST_PAYMENT_TYPE) return fail('Choose a payment address in your wallet.');
  const prefix = (header & 0x0f) === MAINNET ? 'addr' : 'addr_test';
  return ok(bech32.encode(prefix, bech32.toWords(bytes), BECH32_LIMIT));
}

const COSE_ADDRESS_LABEL = '6761646472657373';

const cborBytesPrefix = (length: number) =>
  length < 24 ? (0x40 + length).toString(16) : `58${length.toString(16).padStart(2, '0')}`;

const signedForAddress = (signature: string, addressHex: string) =>
  signature
    .toLowerCase()
    .includes(`${COSE_ADDRESS_LABEL}${cborBytesPrefix(addressHex.length / 2)}${addressHex.toLowerCase()}`);

export function verifyWalletSignature({ addressHex, signature, key, message }: WalletSignature): Result<string> {
  const address = addressFromHex(addressHex);
  if (!address.ok) return address;
  if (!signedForAddress(signature, addressHex)) {
    return fail('The wallet signature could not be verified. Please try again.');
  }
  const valid = (() => {
    try {
      return verifySignature(signature, key, message, address.value);
    } catch {
      return false;
    }
  })();
  if (!valid) return fail('The wallet signature could not be verified. Please try again.');
  return address;
}
