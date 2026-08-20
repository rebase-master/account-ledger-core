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

// formatMinor(120000, 'AED') -> '1200.00'. .
export function formatMinor(minor: number, ccy: Currency): string {
  const exp = EXPONENT[ccy];
  const negative = minor < 0;
  const padded = String(Math.abs(minor)).padStart(exp + 1, '0');
  const whole = padded.slice(0, -exp);
  const frac = padded.slice(-exp);
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

// half-up only for non-negative input
export function roundMinor(minor: number): number {
  return Math.round(minor)
}

export function splitInstalments(totalMinor: number, n: number): number[] {
  const base = Math.floor(totalMinor / n);
  const parts = new Array(n).fill(base);
  parts[n - 1] = totalMinor - base * (n - 1);
  return parts;
}
