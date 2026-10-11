import { expectedReturnCents } from './money';
import type { Bps, Cents, PayoutFrequency } from './types';

export type ScheduleInput = {
  amountCents: Cents;
  rateBps: Bps;
  termMonths: number;
  frequency: PayoutFrequency;
  start: Date;
};

export type ScheduledDistribution = {
  seq: number;
  dueDate: Date;
  amountCents: Cents;
  isPrincipal: boolean;
};

const PERIOD_MONTHS: Record<PayoutFrequency, number | null> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  AT_MATURITY: null,
};

export function addMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function buildSchedule(input: ScheduleInput): ScheduledDistribution[] {
  const { amountCents, rateBps, termMonths, frequency, start } = input;
  const period = PERIOD_MONTHS[frequency] ?? termMonths;
  const count = Math.ceil(termMonths / period);
  const interestThrough = (months: number) => expectedReturnCents(amountCents, rateBps, months);

  return Array.from({ length: count }, (_, index) => {
    const seq = index + 1;
    const monthsElapsed = Math.min(seq * period, termMonths);
    const interest = interestThrough(monthsElapsed) - interestThrough(index * period);
    const isPrincipal = seq === count;
    return {
      seq,
      dueDate: addMonthsUtc(start, monthsElapsed),
      amountCents: interest + (isPrincipal ? amountCents : 0),
      isPrincipal,
    };
  });
}
