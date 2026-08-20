import type { AccountId, AccountState, LedgerEvent } from './types.ts';
import { newAccount } from './types.ts';
import {
  closingLedgerBalance,
  availableBalance,
  applyEntry,
  authorize,
  settle,
  assessOverdraftFee,
  accrueInterest,
  capitalizeInterest,
  reverse,
} from './ledger.ts';
import { toMinor, formatMinor, splitInstalments } from './money.ts';
import { pathToFileURL } from 'node:url';

const DAYS = 6;

function buildEventStream(): LedgerEvent[] {
  const [i1, i2, i3] = splitInstalments(toMinor('10.000', 'BHD'), 3) as [number, number, number];

  return [
    { kind: 'CREDIT', id: 'E1', account: 'ACC-001', amountMinor: toMinor('1,200.00', 'AED'), currency: 'AED', bookedDay: 1, valueDate: 1 },
    { kind: 'DEBIT', id: 'E2', account: 'ACC-001', amountMinor: toMinor('950.00', 'AED'), currency: 'AED', bookedDay: 1, valueDate: 1 },
    { kind: 'AUTHORIZATION', id: 'E3', account: 'ACC-001', authId: 'Auth-A', amountMinor: toMinor('200.00', 'AED'), currency: 'AED', bookedDay: 2, valueDate: 2 },
    { kind: 'CREDIT', id: 'E4', account: 'ACC-001', amountMinor: toMinor('400.00', 'AED'), currency: 'AED', bookedDay: 3, valueDate: 3 },
    { kind: 'SETTLEMENT', id: 'E5', account: 'ACC-001', authId: 'Auth-A', amountMinor: toMinor('185.00', 'AED'), currency: 'AED', bookedDay: 4, valueDate: 4 },
    { kind: 'SETTLEMENT', id: 'E6', account: 'ACC-001', authId: 'Auth-Z', amountMinor: toMinor('180.00', 'AED'), currency: 'AED', bookedDay: 4, valueDate: 4 },
    { kind: 'DEBIT', id: 'E7', account: 'ACC-001', amountMinor: toMinor('620.00', 'AED'), currency: 'AED', bookedDay: 5, valueDate: 2 },
    { kind: 'AUTHORIZATION', id: 'E8', account: 'ACC-001', authId: 'Auth-B', amountMinor: toMinor('90.00', 'AED'), currency: 'AED', bookedDay: 5, valueDate: 5 },
    { kind: 'REVERSAL', id: 'E9', account: 'ACC-001', reverses: 'E7', bookedDay: 6, valueDate: 2 },
    { kind: 'CREDIT', id: 'E10-1', account: 'ACC-002', amountMinor: i1, currency: 'BHD', bookedDay: 5, valueDate: 5 },
    { kind: 'CREDIT', id: 'E10-2', account: 'ACC-002', amountMinor: i2, currency: 'BHD', bookedDay: 5, valueDate: 5 },
    { kind: 'CREDIT', id: 'E10-3', account: 'ACC-002', amountMinor: i3, currency: 'BHD', bookedDay: 5, valueDate: 5 },
  ];
}

interface DayReport {
  readonly day: number;
  readonly closing: Record<AccountId, number>;
  readonly fees: string[];
  readonly authEvents: string[];
  readonly errors: string[];
}

export function runReplay(): { accounts: Record<AccountId, AccountState>; reports: DayReport[] } {
  const accounts: Record<AccountId, AccountState> = {
    'ACC-001': newAccount('ACC-001', 'AED'),
    'ACC-002': newAccount('ACC-002', 'BHD'),
  };
  const dailyAccruals: Record<AccountId, number[]> = { 'ACC-001': [], 'ACC-002': [] };
  const events = [...buildEventStream()].sort((a, b) => a.bookedDay - b.bookedDay);
  const reports: DayReport[] = [];

  for (let day = 1; day <= DAYS; day++) {
    const errors: string[] = [];
    const authEvents: string[] = [];

    for (const event of events.filter((e) => e.bookedDay === day)) {
      const state = accounts[event.account];
      switch (event.kind) {
        case 'CREDIT':
          applyEntry(state, {
            id: event.id, account: event.account, kind: 'credit',
            amountMinor: event.amountMinor, currency: event.currency,
            bookedDay: event.bookedDay, valueDate: event.valueDate,
          });
          break;
        case 'DEBIT':
          applyEntry(state, {
            id: event.id, account: event.account, kind: 'debit',
            amountMinor: -event.amountMinor, currency: event.currency,
            bookedDay: event.bookedDay, valueDate: event.valueDate,
          });
          break;
        case 'AUTHORIZATION': {
          const result = authorize(state, event.authId, event.amountMinor, event.bookedDay);
          authEvents.push(`${event.authId}: ${result.approved ? 'approved' : `declined (${result.reason})`}`);
          break;
        }
        case 'SETTLEMENT': {
          const result = settle(state, event.authId, event.amountMinor, event.bookedDay, event.valueDate, event.id);
          if (result.accepted) {
            authEvents.push(`${event.authId}: settled for ${formatMinor(event.amountMinor, event.currency)} ${event.currency}`);
          } else {
            errors.push(`${event.id}: settlement rejected — ${result.reason}`);
          }
          break;
        }
        case 'REVERSAL': {
          const result = reverse(state, event.reverses, event.bookedDay, event.id);
          if (!result.accepted) errors.push(`${event.id}: reversal rejected — ${result.reason}`);
          break;
        }
      }
    }

    const fees: string[] = [];
    for (const id of Object.keys(accounts) as AccountId[]) {
      const state = accounts[id];
      const feesThisPass: { amountMinor: number; day: number }[] = [];
      for (let d = 1; d <= day; d++) {
        const fee = assessOverdraftFee(state, d, day);
        if (fee) feesThisPass.push({ amountMinor: fee.amountMinor, day: d });
      }
      if (feesThisPass.length === 0) continue;
      const amount = formatMinor(-feesThisPass[0]!.amountMinor, state.currency);
      const days = feesThisPass.map((f) => f.day).join(', ');
      fees.push(`${id}: -${amount} ${state.currency} on day${feesThisPass.length > 1 ? 's' : ''} ${days}`);
    }

    const closing: Record<AccountId, number> = { 'ACC-001': 0, 'ACC-002': 0 };
    for (const id of Object.keys(accounts) as AccountId[]) {
      const state = accounts[id];
      const accrual = accrueInterest(state, day);
      dailyAccruals[id].push(accrual);
      if (day === DAYS) capitalizeInterest(state, dailyAccruals[id], day);
      closing[id] = closingLedgerBalance(state.entries, day);
    }

    reports.push({ day, closing, fees, authEvents, errors });
  }

  return { accounts, reports };
}

function main(): void {
  const { reports } = runReplay();
  for (const r of reports) {
    console.log(`\n== Day ${r.day} ==`);
    console.log(`  ACC-001 closing: ${formatMinor(r.closing['ACC-001'], 'AED')} AED`);
    console.log(`  ACC-002 closing: ${formatMinor(r.closing['ACC-002'], 'BHD')} BHD`);
    if (r.fees.length) console.log(`  Fees: ${r.fees.join('; ')}`);
    if (r.authEvents.length) console.log(`  Auth: ${r.authEvents.join('; ')}`);
    if (r.errors.length) console.log(`  Errors: ${r.errors.join('; ')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
