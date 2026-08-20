# Ambiguities

1. **Backdated value dates (E7: booked Day 5, value_date Day 2).** The money
   legally left on Day 2 but the ledger only learns of it on Day 5, so past days'
   closing balances must be re-evaluated. Open question this raises (tracked in
   REJECTED #2): *which* day(s) then get the overdraft fee, and is a fee dated to
   a day that is only discovered later. Resolution: closing balance for any day D
   = sum of entries with value_date <= D, recomputed after each new event.
   
2. **E10 is listed after E9 but is a Day-5 event (E9 is Day 6).** If "end of Day 5"
   processing fires the moment a Day-6 event is seen, E10 is missed and ACC-002's
   Day-5 closing balance (and its interest) is wrong. Resolution: order events by
   (booking day, then stream order) and run end-of-day processing per booking day,
   so E10 is folded into Day 5 before Day 5 closes.
   
3. **Available-balance basis for an authorization check.** Does "ledger balance" in the auth rule mean all booked entries, or only entries with value_date <= today? Resolution: use all booked entries minus active holds — a backdated debit still means the money is gone now. (Same result on this stream; recorded because it changes behaviour on other inputs.)
