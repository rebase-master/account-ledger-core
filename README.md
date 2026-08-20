# Account Ledger Core (in-memory)

Append-only, value-dated, multi-currency account ledger core. No web layer, no persistence, no database, no dependencies. TypeScript on Node (built-in type stripping + `node:test`).

The problem this repository solves is in **[ASSIGNMENT.md](ASSIGNMENT.md)** (verbatim brief, criteria numbered 1–8).

## Run
- `npm test` — the test suite. The suite *is* the specification: each expected balance, fee, and authorization outcome is asserted, so the numbers are checkable without reading code.
- `npm run replay` — replays the 10-event stream and prints, per day (Day 1 → Day 6): closing ledger balance, fee assessments, authorization states, and errors.

Requires Node ≥ 22.6 (for `--experimental-strip-types`). No install step — there are no dependencies.

## How to read the output
_(Documented once the replay is built — per-day blocks: closing ledger balance per account, any fee/interest entries booked that day, authorization state changes, and rejected-event errors.)_

## Design docs
- **[ASSIGNMENT.md](ASSIGNMENT.md)** — the problem statement.
- **[NUMBERS.md](NUMBERS.md)** — every constant and why (money as integer minor units, rounding mode, fee/interest/precision).
- **[AMBIGUITIES.md](AMBIGUITIES.md)** — ambiguities found and how each was resolved.
- **[REJECTED.md](REJECTED.md)** — which acceptance criteria are wrong (and which are correct), with reasons.
- **[WORKLOG.md](WORKLOG.md)** — timestamped build log.
