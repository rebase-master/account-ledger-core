# Rejected acceptance criteria

The brief plants wrong acceptance criteria and asks me to refuse them here.
NOTE: events my engine rejects at runtime (e.g. E6 — a settlement for an authorization that was never made) are *correct behaviour*, reported in the replay's per-day error output — not here. Criterion 4, which mandates that rejection, is correct.

## Proven wrong
1. **Criterion 2 — "E7 causes exactly one overdraft fee, assessed on Day 2."** Wrong on the count: once E7 (value_date Day 2, −620) is known, the closing ledger balance is negative on Day 2 (−370), Day 4 (−155) and Day 5 (−155) — all pre-fee — so the once-per-day-per-account rule fires on **three** days, not one. ("on Day 2" also conflates the *moment of assessment* — end of Day 5, when E7 posts and the overdraft becomes known, per criterion 1's own "evaluated at end of Day 5" — with the fee's *value_date*, which is a separate decision documented in AMBIGUITIES.)
2. **Criterion 6 — "after E9, all balances and fees return to their pre-E7 values."** Wrong. E9 (+620, the reversal of E7) restores the ledger balance, but the ledger is append-only and entries are immutable, so any overdraft fee already booked because of E7 stays booked. Balances return; fees do not — reversing a fee would need a separate fee-reversal entry, which is a policy choice, not an automatic return.
3. **Criterion 7 — "the three BHD instalments in E10 must each be BHD 3.334."** Wrong since 3.334 x 3 = 10.002 != 10.000 — overpays by 2 fils and destroys money. Correct split: 3.333 / 3.333 / 3.334, i.e. round each down to 3.333 and let the final instalment absorb the remainder so the parts sum to exactly 10.000.
4. **Criterion 8 — "if the rounded daily interest accruals do not sum to the capitalized total, the remainder is discarded."** Self-contradictory with the interest rule ("the rounded daily accruals must sum exactly to the capitalized total"): the capitalized credit is *defined as* the sum of the rounded daily accruals, so there is never a remainder to discard.

> **Completeness:** all 8 criteria were evaluated; 1, 3, 4, 5 are accepted. The two non-obvious accepts: **#5**'s antecedent never fires (Auth-B is declined — available −155, below zero), and **#1** holds precisely because it is measured at end of Day 5, *before* E9 reverses E7.
