import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newAccount } from './types.ts';
import type { Entry } from './types.ts';
import { closingLedgerBalance, availableBalance, applyEntry, authorize, settle } from './ledger.ts';

function entry(o: Partial<Entry> & { id: string; amountMinor: number; valueDate: number }): Entry {
  return {
    account: 'ACC-001', kind: 'credit', currency: 'AED', bookedDay: o.valueDate,
    ...o,
  };
}

test('closingLedgerBalance: sums entries with valueDate <= day, ignores later ones', () => {
  const entries = [
    entry({ id: 'e1', amountMinor: 1200_00, valueDate: 1 }),
    entry({ id: 'e2', amountMinor: -950_00, valueDate: 1 }),
    entry({ id: 'e3', amountMinor: 400_00, valueDate: 3 }),
  ];
  assert.equal(closingLedgerBalance(entries, 1), 250_00);
  assert.equal(closingLedgerBalance(entries, 2), 250_00);
  assert.equal(closingLedgerBalance(entries, 3), 650_00);
});

test('closingLedgerBalance: a later-arriving backdated entry changes a PAST day (E7 shape)', () => {
  const entries = [
    entry({ id: 'e1', amountMinor: 1200_00, valueDate: 1 }),
    entry({ id: 'e2', amountMinor: -950_00, valueDate: 1 }),
    entry({ id: 'e7', amountMinor: -620_00, valueDate: 2, bookedDay: 5 }),
  ];
  assert.equal(closingLedgerBalance(entries, 2), -370_00);
});

test('availableBalance: active holds reduce it, settled/declined holds do not', () => {
  const entries = [entry({ id: 'e1', amountMinor: 250_00, valueDate: 1 })];
  const activeHold = { authId: 'A', account: 'ACC-001' as const, amountMinor: 200_00, currency: 'AED' as const, bookedDay: 2, state: 'active' as const };
  const settledHold = { ...activeHold, authId: 'B', state: 'settled' as const };
  assert.equal(availableBalance(entries, [activeHold]), 50_00);
  assert.equal(availableBalance(entries, [settledHold]), 250_00);
  assert.equal(availableBalance(entries, [activeHold, settledHold]), 50_00);
});

test('applyEntry: appends without mutating prior entries', () => {
  const acc = newAccount('ACC-001', 'AED');
  const e1 = entry({ id: 'e1', amountMinor: 100, valueDate: 1 });
  applyEntry(acc, e1);
  applyEntry(acc, entry({ id: 'e2', amountMinor: 200, valueDate: 1 }));
  assert.equal(acc.entries.length, 2);
  assert.equal(acc.entries[0], e1);
});

test('authorize: approved when available stays >= 0 after the hold (E3 shape: 250 avail, 200 hold -> 50)', () => {
  const acc = newAccount('ACC-001', 'AED');
  applyEntry(acc, entry({ id: 'e1', amountMinor: 1200_00, valueDate: 1 }));
  applyEntry(acc, entry({ id: 'e2', amountMinor: -950_00, valueDate: 1 }));
  const result = authorize(acc, 'Auth-A', 200_00, 2);
  assert.equal(result.approved, true);
  assert.equal(result.hold?.state, 'active');
  assert.equal(availableBalance(acc.entries, [...acc.holds.values()]), 50_00);
});

test('authorize: an approved auth does NOT change the ledger balance', () => {
  const acc = newAccount('ACC-001', 'AED');
  applyEntry(acc, entry({ id: 'e1', amountMinor: 1200_00, valueDate: 1 }));
  applyEntry(acc, entry({ id: 'e2', amountMinor: -950_00, valueDate: 1 }));
  const before = closingLedgerBalance(acc.entries, 2);
  authorize(acc, 'Auth-A', 200_00, 2);
  assert.equal(closingLedgerBalance(acc.entries, 2), before);
});

test('authorize: declined when the hold would push available below zero (E8 shape: -155 avail, 90 hold -> -245)', () => {
  const acc = newAccount('ACC-001', 'AED');
  applyEntry(acc, entry({ id: 'e1', amountMinor: -155_00, valueDate: 5 }));
  const result = authorize(acc, 'Auth-B', 90_00, 5);
  assert.equal(result.approved, false);
  assert.ok(result.reason?.includes('< 0'));
  assert.equal(acc.holds.has('Auth-B'), false);
});

test('settle: posts a debit for the SETTLED amount and releases the WHOLE hold (E5 shape: 200 hold, 185 settled)', () => {
  const acc = newAccount('ACC-001', 'AED');
  applyEntry(acc, entry({ id: 'e1', amountMinor: 650_00, valueDate: 3 }));
  authorize(acc, 'Auth-A', 200_00, 2);
  const before = closingLedgerBalance(acc.entries, 4);
  const result = settle(acc, 'Auth-A', 185_00, 4, 4, 'e5');
  assert.equal(result.accepted, true);
  assert.equal(result.entry?.amountMinor, -185_00);
  assert.equal(closingLedgerBalance(acc.entries, 4), before - 185_00);
  assert.equal(acc.holds.get('Auth-A')?.state, 'settled');
  assert.equal(availableBalance(acc.entries, [...acc.holds.values()]), 465_00);
});

test('settle: rejected when the authId has no active hold, and NO entry is posted (E6 shape, criterion 4)', () => {
  const acc = newAccount('ACC-001', 'AED');
  applyEntry(acc, entry({ id: 'e1', amountMinor: 465_00, valueDate: 4 }));
  const before = acc.entries.length;
  const result = settle(acc, 'Auth-Z', 180_00, 4, 4, 'e6');
  assert.equal(result.accepted, false);
  assert.equal(acc.entries.length, before);
});
