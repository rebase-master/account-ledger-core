export type Currency = 'AED' | 'BHD';

export const EXPONENT: Record<Currency, number> = { AED: 2, BHD: 3 };

// toMinor('1,200.00', 'AED') -> 120000.
export function toMinor(amount: string, ccy: Currency): number {
  const cleaned = amount.replace(/[,\s]/g, '');
  const [intPart, fracPart = ''] = cleaned.split('.');

  if (fracPart.length > EXPONENT[ccy]) {
    throw new Error(`too many decimal places for ${ccy}: "${amount}"`);
  }

  const paddedFrac = fracPart.padEnd(EXPONENT[ccy], '0'); // '5' -> '50' (AED), '' -> '00'
  return Number(intPart + paddedFrac);
}
