import type { Cents } from './types';

export type RankInput = { volumeCents: Cents; paidOnTime: number; paidLate: number };
export type CuratorRank = { onTimePct: number | null; score: number | null; lateCount: number };

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

export function curatorRank(records: readonly RankInput[]): CuratorRank {
  const lateCount = records.reduce((sum, r) => sum + r.paidLate, 0);
  const rated = records.filter((r) => r.paidOnTime + r.paidLate > 0);
  if (rated.length === 0) return { onTimePct: null, score: null, lateCount };

  const paid = rated.reduce((sum, r) => sum + r.paidOnTime + r.paidLate, 0);
  const onTime = rated.reduce((sum, r) => sum + r.paidOnTime, 0);
  const volume = rated.reduce((sum, r) => sum + r.volumeCents, 0);
  const weighted = rated.reduce((sum, r) => sum + (r.volumeCents * r.paidOnTime) / (r.paidOnTime + r.paidLate), 0);

  return {
    onTimePct: oneDecimal((onTime * 100) / paid),
    score: oneDecimal((weighted * 100) / volume),
    lateCount,
  };
}
