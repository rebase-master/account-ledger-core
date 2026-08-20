// Fee -> ledger. Auth -> available. Only settlement moves both.
import type { AccountState, Entry, Hold } from './types.ts';
import { roundMinor, formatMinor } from './money.ts';

export function closingLedgerBalance(entries: readonly Entry[], day: number): number {
  return entries
    .filter((e) => e.valueDate <= day)
    .reduce((sum, e) => sum + e.amountMinor, 0);
}

export function availableBalance(entries: readonly Entry[], holds: readonly Hold[]): number {
  const ledgerNow = entries.reduce((sum, e) => sum + e.amountMinor, 0);
  const activeHoldsTotal = holds
    .filter((h) => h.state === 'active')
    .reduce((sum, h) => sum + h.amountMinor, 0);
  return ledgerNow - activeHoldsTotal;
}

export function applyEntry(state: AccountState, entry: Entry): void {
  state.entries.push(entry);
}

export interface AuthResult {
  readonly approved: boolean;
  readonly hold?: Hold;
  readonly reason?: string;
}

export function authorize(
  state: AccountState,
  authId: string,
  amountMinor: number,
  bookedDay: number,
): AuthResult {
  const availableNow = availableBalance(state.entries, [...state.holds.values()]);
  const availableAfter = availableNow - amountMinor;

  if (availableAfter < 0) {
    return {
      approved: false,
      reason: `available ${formatMinor(availableNow, state.currency)} - hold ${formatMinor(amountMinor, state.currency)} = ${formatMinor(availableAfter, state.currency)} < 0`,
    };
  }

  const hold: Hold = {
    authId,
    account: state.id,
    amountMinor,
    currency: state.currency,
    bookedDay,
    state: 'active',
  };
  state.holds.set(authId, hold);
  return { approved: true, hold };
}

export interface SettleResult {
  readonly accepted: boolean;
  readonly entry?: Entry;
  readonly reason?: string;
}

// Settlement releases the whole hold, not just the settled portion.
export function settle(
  state: AccountState,
  authId: string,
  settledAmountMinor: number,
  bookedDay: number,
  valueDate: number,
  entryId: string,
): SettleResult {
  const hold = state.holds.get(authId);
  if (!hold || hold.state !== 'active') {
    return { accepted: false, reason: `no active authorization "${authId}" on ${state.id}` };
  }

  const entry: Entry = {
    id: entryId,
    account: state.id,
    kind: 'settlement',
    amountMinor: -settledAmountMinor,
    currency: state.currency,
    bookedDay,
    valueDate,
    sourceEventId: entryId,
  };
  applyEntry(state, entry);
  hold.state = 'settled';
  return { accepted: true, entry };
}

const OVERDRAFT_FEE_MINOR = 2500;

export function assessOverdraftFee(state: AccountState, day: number, bookedDay: number): Entry | null {
  const balance = closingLedgerBalance(state.entries, day);
  if (balance >= 0) return null;

  const alreadyAssessed = state.entries.some((e) => e.kind === 'fee' && e.valueDate === day);
  if (alreadyAssessed) return null;

  const fee: Entry = {
    id: `fee-${state.id}-day${day}`,
    account: state.id,
    kind: 'fee',
    amountMinor: -OVERDRAFT_FEE_MINOR, // account currency; AMBIGUITIES #5
    currency: state.currency,
    bookedDay,
    valueDate: day,
  };
  applyEntry(state, fee);
  return fee;
}

const DAILY_INTEREST_RATE = 0.0004;

export function accrueInterest(state: AccountState, day: number): number {
  const balance = closingLedgerBalance(state.entries, day);
  if (balance <= 0) return 0;
  return roundMinor(balance * DAILY_INTEREST_RATE);
}

export function capitalizeInterest(
  state: AccountState,
  dailyAccruals: readonly number[],
  day: number,
): Entry | null {
  const total = dailyAccruals.reduce((sum, a) => sum + a, 0);
  if (total === 0) return null;

  const credit: Entry = {
    id: `interest-${state.id}-day${day}`,
    account: state.id,
    kind: 'interest',
    amountMinor: total,
    currency: state.currency,
    bookedDay: day,
    valueDate: day,
  };
  applyEntry(state, credit);
  return credit;
}

export interface ReverseResult {
  readonly accepted: boolean;
  readonly entry?: Entry;
  readonly reason?: string;
}

export function reverse(
  state: AccountState,
  reversedEntryId: string,
  bookedDay: number,
  entryId: string,
): ReverseResult {
  const original = state.entries.find((e) => e.id === reversedEntryId);
  if (!original) {
    return { accepted: false, reason: `no entry "${reversedEntryId}" to reverse on ${state.id}` };
  }

  const entry: Entry = {
    id: entryId,
    account: state.id,
    kind: 'reversal',
    amountMinor: -original.amountMinor,
    currency: original.currency,
    bookedDay,
    valueDate: original.valueDate,
    sourceEventId: entryId,
  };
  applyEntry(state, entry);
  return { accepted: true, entry };
}
