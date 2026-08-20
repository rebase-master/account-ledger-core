# Rejected acceptance criteria

The brief plants wrong acceptance criteria and asks me to refuse them here.
NOTE: events my engine rejects at runtime (e.g. E6 — a settlement for an  authorization that was never made) are *correct behaviour*, reported in the replay's per-day error output — not here. Criterion 4, which mandates that rejection, is correct.

## Proven wrong
1. **"The three BHD instalments in E10 must each be BHD 3.334."** This is wrong since 3.334 x 3 = 10.002 != 10.000 — overpays by 2 fils and destroys money.
   Correct split: 3.333 / 3.333 / 3.334, i.e. round each down to 3.333 and let the final instalment absorb the remainder so the parts sum to exactly 10.000.
2. **"if the rounded daily interest accruals do not sum to the
   capitalized total, the remainder is discarded."** Self-contradictory with the interest rule ("the rounded daily accruals must sum exactly to the capitalized total"): the capitalized credit is *defined as* the sum of the rounded daily accruals, so there is never a remainder to discard.
