import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinor, EXPONENT } from './money.ts';

test('AED currency decimal places', () => {
  assert.equal(EXPONENT.AED, 2)
})

test('toMinor: a normal AED amount becomes integer fils', () => {
  assert.equal(toMinor('1,200.00', 'AED'), 120000);
});

test('toMinor: a normal BHD amount becomes integer fils (3 dp)', () => {
  assert.equal(toMinor('10.000', 'BHD'), 10000);
});

test('toMinor: an amount with no decimal point has a zero fraction', () => {
  assert.equal(toMinor('185', 'AED'), 18500);
});

test('toMinor: a short fraction is right-padded to the currency precision', () => {
  assert.equal(toMinor('1.5', 'AED'), 150);
});

test('toMinor: zero is zero', () => {
  assert.equal(toMinor('0.00', 'AED'), 0);
});

test('toMinor: more decimal places than the currency allows must throw, not truncate', () => {
  assert.throws(() => toMinor('1.234', 'AED'), /decimal|precision|places|fraction/i);
});