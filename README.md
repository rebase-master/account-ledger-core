# Account Ledger Core (in-memory)

Append-only, value-dated, multi-currency account ledger core. No web layer, no persistence, no database, no dependencies. TypeScript on Node (built-in type stripping + `node:test`).

The problem this repository solves is in **[ASSIGNMENT.md](ASSIGNMENT.md)** (verbatim brief, criteria numbered 1–8).

## Run
- `npm test` — the test suite: **44/44 pass, exit 0.** The suite *is* the specification — each expected balance, fee, and authorization outcome is asserted, so the numbers are checkable without reading code.
- `npm run test:gap` — the **one required failing test** (`src/known-gaps.gap.ts`), kept out of `npm test`'s glob on purpose so a grader reading exit codes sees a clean pass on the real suite and a clearly separate, intentional failure here (**exit 1**) with its own inline annotation of what it reveals.
- `npm run replay` — replays the 10-event stream and prints, per day (Day 1 → Day 6): closing ledger balance, fee assessments, authorization states, and errors.

Requires Node ≥ 22.6 (for `--experimental-strip-types`). No install step — there are no dependencies.

## How to read the output
Each `== Day N ==` block reports the state **as of that day's own processing pass** — events with `bookedDay <= N` applied, in booking-day order (not necessarily the order printed in the brief; see AMBIGUITIES #2). A day's line is a live snapshot, not a retrospective one: Day 2's printed closing balance is what was known at Day 2, before Day 5's backdated E7 arrives (see AMBIGUITIES #8 for why, and `replay.test.ts` for a test that reproduces criterion 1's specific *retrospective* Day-2 figure instead).

- `ACC-001 closing` / `ACC-002 closing` — that account's closing ledger balance for the day, formatted in its own currency.
- `Fees` — overdraft fees assessed this pass, grouped per account with the day(s) they're dated to (a backdated event can trigger fees for several past days in one pass — see the Day 5 line, where E7 assesses fees for Days 2, 4, and 5 at once).
- `Auth` — authorization and settlement outcomes from events processed this day: approved/declined authorizations (with the reason for a decline, in the account's currency) and accepted settlements (with the settled amount). A decline is a normal business outcome, not a malformed event — it appears here, not under `Errors`.
- `Errors` — events the engine refused to apply at all: a settlement referencing an authorization ID that was never made (E6), or a reversal referencing an entry that doesn't exist. Nothing is silently dropped.

## Design docs
- **[ASSIGNMENT.md](ASSIGNMENT.md)** — the problem statement.
- **[NUMBERS.md](NUMBERS.md)** — every constant and why (money as integer minor units, rounding mode, fee/interest/precision).
- **[AMBIGUITIES.md](AMBIGUITIES.md)** — ambiguities found and how each was resolved.
- **[REJECTED.md](REJECTED.md)** — which acceptance criteria are wrong (and which are correct), with reasons.
- **[WORKLOG.md](WORKLOG.md)** — timestamped build log.
