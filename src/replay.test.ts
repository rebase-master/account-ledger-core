import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runReplay } from './replay.ts';
import { newAccount } from './types.ts';
import { closingLedgerBalance, applyEntry, authorize, settle } from './ledger.ts';
import { toMinor } from './money.ts';

test('full stream: ACC-001 closes Day 5 at -230.00 (pre-fee -155, plus fees on days 2, 4, 5)', () => {
  const { accounts, reports } = runReplay();
  const day5 = reports.find((r) => r.day === 5)!;
  assert.equal(day5.closing['ACC-001'], -23000);

  const feeDays = accounts['ACC-001'].entries
    .filter((e) => e.kind === 'fee')
    .map((e) => e.valueDate)
    .sort((a, b) => a - b);
  assert.deepEqual(feeDays, [2, 4, 5]);
});

test('full stream: criterion 1 — Day 2 closing, evaluated at end of Day 5, before any fee, is -370.00', () => {
  const acc = newAccount('ACC-001', 'AED');
  applyEntry(acc, { id: 'E1', account: 'ACC-001', kind: 'credit', amountMinor: toMinor('1,200.00', 'AED'), currency: 'AED', bookedDay: 1, valueDate: 1 });
  applyEntry(acc, { id: 'E2', account: 'ACC-001', kind: 'debit', amountMinor: -toMinor('950.00', 'AED'), currency: 'AED', bookedDay: 1, valueDate: 1 });
  authorize(acc, 'Auth-A', toMinor('200.00', 'AED'), 2);
  applyEntry(acc, { id: 'E4', account: 'ACC-001', kind: 'credit', amountMinor: toMinor('400.00', 'AED'), currency: 'AED', bookedDay: 3, valueDate: 3 });
  settle(acc, 'Auth-A', toMinor('185.00', 'AED'), 4, 4, 'E5');
  settle(acc, 'Auth-Z', toMinor('180.00', 'AED'), 4, 4, 'E6');
  applyEntry(acc, { id: 'E7', account: 'ACC-001', kind: 'debit', amountMinor: -toMinor('620.00', 'AED'), currency: 'AED', bookedDay: 5, valueDate: 2 });

  assert.equal(closingLedgerBalance(acc.entries, 2), -37000);
});

test('full stream: criterion 6 refuted — after Day 6, ledger balance is higher but the fees stay booked', () => {
  const { accounts, reports } = runReplay();
  const day6 = reports.find((r) => r.day === 6)!;
  assert.equal(day6.closing['ACC-001'], 39081);

  const feeCount = accounts['ACC-001'].entries.filter((e) => e.kind === 'fee').length;
  assert.equal(feeCount, 3);
});

test('full stream: criterion 3 accepted — Auth-A settlement lands', () => {
  const { accounts } = runReplay();
  assert.equal(accounts['ACC-001'].holds.get('Auth-A')?.state, 'settled');
});

test('full stream: criterion 4 — E6 (unknown Auth-Z) is rejected on Day 4, no entry posted', () => {
  const { reports } = runReplay();
  const day4 = reports.find((r) => r.day === 4)!;
  assert.equal(day4.errors.length, 1);
  assert.match(day4.errors[0]!, /E6.*Auth-Z/);
});

test('full stream: criterion 5 — Auth-B is declined (its antecedent never fires)', () => {
  const { accounts, reports } = runReplay();
  const day5 = reports.find((r) => r.day === 5)!;
  assert.match(day5.authEvents.join(' '), /Auth-B: declined/);
  assert.equal(day5.errors.some((e) => e.includes('Auth-B')), false);
  assert.equal(accounts['ACC-001'].holds.has('Auth-B'), false);
});

test('full stream: criterion 7 refuted in code — E10 lands ACC-002 at exactly BHD 10.000', () => {
  const { reports } = runReplay();
  const day5 = reports.find((r) => r.day === 5)!;
  assert.equal(day5.closing['ACC-002'], 10000);
});

test('full stream: ACC-002 never overdraws, so no fee ever fires for it (AMBIGUITIES #5, unreached)', () => {
  const { accounts } = runReplay();
  assert.equal(accounts['ACC-002'].entries.filter((e) => e.kind === 'fee').length, 0);
});

test('full stream: Day 6 capitalization credits each account exactly once', () => {
  const { accounts, reports } = runReplay();
  const day6 = reports.find((r) => r.day === 6)!;
  assert.equal(accounts['ACC-001'].entries.filter((e) => e.kind === 'interest').length, 1);
  assert.equal(accounts['ACC-002'].entries.filter((e) => e.kind === 'interest').length, 1);
  assert.equal(day6.closing['ACC-002'], 10008);
});
