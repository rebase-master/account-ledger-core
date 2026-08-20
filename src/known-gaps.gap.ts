// ONE REQUIRED FAILING TEST (per the brief's deliverables list). This is left failing
// on purpose — it documents a real design gap, not a regression.
//
// What it reveals: reverse() has no guard against reversing the SAME entry twice.
// Compare with the guards that already exist elsewhere in this codebase:
//   - settle()             rejects a second settlement (hold.state !== 'active')
//   - assessOverdraftFee() dedupes by (kind === 'fee', valueDate) — re-entrant by design
// reverse() has no equivalent check. On THIS event stream it's never exercised — E9
// reverses E7 exactly once. But a real ledger consuming an at-least-once event source
// (a retried REVERSAL message, a replayed webhook) needs the same idempotency guard
// the other two operations already have, or a duplicate reversal silently double-credits
// the account. Left failing deliberately; see WORKLOG.md for the decision to defer it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newAccount } from './types.ts';
import { applyEntry, reverse } from './ledger.ts';

test('FAILING (by design): reverse() should reject reversing the same entry twice', () => {
  const acc = newAccount('ACC-001', 'AED');
  applyEntry(acc, {
    id: 'E7', account: 'ACC-001', kind: 'debit',
    amountMinor: -62000, currency: 'AED', bookedDay: 5, valueDate: 2,
  });

  reverse(acc, 'E7', 6, 'E9');
  const duplicate = reverse(acc, 'E7', 6, 'E9-retry');

  // This is the assertion that currently FAILS: reverse() has no dedupe, so a second
  // call against the same reversedEntryId happily succeeds and posts a second
  // contra-entry, double-crediting the account. A fixed implementation would decline it.
  assert.equal(duplicate.accepted, false);
});
