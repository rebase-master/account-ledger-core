import type { Currency } from './money.ts';

export type AccountId = 'ACC-001' | 'ACC-002';

export type LedgerEvent =
  | { kind: 'CREDIT'; id: string; account: AccountId; amountMinor: number; currency: Currency; bookedDay: number; valueDate: number }
  | { kind: 'DEBIT'; id: string; account: AccountId; amountMinor: number; currency: Currency; bookedDay: number; valueDate: number }
  | { kind: 'AUTHORIZATION'; id: string; account: AccountId; authId: string; amountMinor: number; currency: Currency; bookedDay: number; valueDate: number }
  | { kind: 'SETTLEMENT'; id: string; account: AccountId; authId: string; amountMinor: number; currency: Currency; bookedDay: number; valueDate: number }
  | { kind: 'REVERSAL'; id: string; account: AccountId; reverses: string; bookedDay: number; valueDate: number };

export type EntryKind = 'credit' | 'debit' | 'settlement' | 'reversal' | 'fee' | 'interest';

export interface Entry {
  readonly id: string;
  readonly account: AccountId;
  readonly kind: EntryKind;
  readonly amountMinor: number;
  readonly currency: Currency;
  readonly bookedDay: number;
  readonly valueDate: number;
  readonly sourceEventId?: string;
}

export type HoldState = 'active' | 'settled';

export interface Hold {
  readonly authId: string;
  readonly account: AccountId;
  readonly amountMinor: number;
  readonly currency: Currency;
  readonly bookedDay: number;
  state: HoldState;
}

export interface AccountState {
  readonly id: AccountId;
  readonly currency: Currency;
  readonly entries: Entry[];
  readonly holds: Map<string, Hold>;
}

export function newAccount(id: AccountId, currency: Currency): AccountState {
  return { id, currency, entries: [], holds: new Map() };
}
