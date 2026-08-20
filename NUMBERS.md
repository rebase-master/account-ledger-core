# Numbers

Numbers are represent as integers with their decimal point on the respective currency. So AED will have 2 decimal points and BHD will be 3 decimal places.
Scaling is done by multiplying the currency with 10^DP, where DP = number of decimal points.
For example, scaling for AED 10.35 would be 
``` 
10.35 X 10 ^ 2 
= 10.35 X 100
= 1035
```

Similarly, scaling for BHD 45.184 would be
```
45.184 X 10^3
= 45.184 X 1000
= 45184
```


## Constants

Given by the brief:
- Overdraft fee: AED 25.00 = **2500 fils**. Assessed once per day per account when that day's closing ledger balance (all entries with value_date <= that day) is negative; booked with value_date = the day assessed.
- Daily interest: 0.04% / day = **0.0004**, positive closing balances only. Capitalized as a single credit at end of Day 6.
- Currency exponents: **AED = 2**, **BHD = 3**. Exponent lives on the currency, never on the amount.
- Opening balances: ACC-001 AED 0.00 (0 fils), ACC-002 BHD 0.000 (0 fils).

Chosen by me ("why this value and not half it"):
- **Money type: integer minor units** (fils), not float/decimal. Floats can't represent decimal cents exactly and the error compounds across a ledger; integers are exact and only interest introduces a fraction, which is then rounded to a whole minor unit.
- **Rounding mode for a fractional interest accrual: HALF-UP.** For a 6-day window, rounding up/down to the nearest integer is acceptable enough since any rounding difference is immaterial at this scale.
