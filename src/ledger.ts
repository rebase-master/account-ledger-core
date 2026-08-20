// Fee -> ledger. Auth -> available. Only settlement moves both.
import type { AccountState, Entry, Hold } from './types.ts';

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
  const activeHolds = [...state.holds.values()].filter((h) => h.state === 'active');
  const availableNow = availableBalance(state.entries, activeHolds);
  const availableAfter = availableNow - amountMinor;

  if (availableAfter < 0) {
    return {
      approved: false,
      reason: `available ${availableNow} - hold ${amountMinor} = ${availableAfter} < 0`,
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
