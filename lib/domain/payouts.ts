import { assert, type Cents } from './types';

export type Share = { id: string; weight: number };
export type Allocation = { id: string; amountCents: Cents };

export function splitProRata(totalCents: Cents, shares: readonly Share[]): Allocation[] {
  const totalWeight = shares.reduce((sum, share) => sum + share.weight, 0);
  assert(totalWeight > 0, 'pro-rata split needs a positive total weight');

  const total = BigInt(totalCents);
  const weightSum = BigInt(totalWeight);
  const parts = shares.map((share, index) => {
    const numerator = total * BigInt(share.weight);
    return { id: share.id, index, floor: numerator / weightSum, remainder: numerator % weightSum };
  });

  const floored = parts.reduce((sum, part) => sum + part.floor, BigInt(0));
  const leftover = Number(total - floored);
  const byRemainder = [...parts].sort((a, b) => {
    if (a.remainder === b.remainder) return a.index - b.index;
    return b.remainder > a.remainder ? 1 : -1;
  });
  const bonus = new Set(byRemainder.slice(0, leftover).map((part) => part.index));

  return parts.map((part) => ({
    id: part.id,
    amountCents: Number(part.floor) + (bonus.has(part.index) ? 1 : 0),
  }));
}
