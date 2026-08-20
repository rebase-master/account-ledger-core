import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinor, formatMinor, roundMinor, splitInstalments, EXPONENT } from './money.ts';

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

test('formatMinor: AED fils becomes a 2dp decimal string', () => {
  assert.equal(formatMinor(120000, 'AED'), '1200.00');
});

test('formatMinor: AED fils small amount', () => {
  assert.equal(formatMinor(5, 'AED'), '0.05');
});

test('formatMinor: BHD fils becomes a 3dp decimal string', () => {
  assert.equal(formatMinor(10000, 'BHD'), '10.000');
});


test('formatMinor: negative sub-unit AED values keep the sign in the right place', () => {
  assert.equal(formatMinor(-5, 'AED'), '-0.05');
  assert.equal(formatMinor(-50, 'AED'), '-0.50');
});

test('formatMinor: negative sub-unit BHD value keeps the sign in the right place', () => {
  assert.equal(formatMinor(-5, 'BHD'), '-0.005');
});

test('formatMinor: negative multi-unit values already worked (regression guard)', () => {
  assert.equal(formatMinor(-37000, 'AED'), '-370.00');
  assert.equal(formatMinor(-15500, 'AED'), '-155.00');
});

test('roundMinor: rounds to nearest whole fils, ties go up', () => {
  assert.equal(roundMinor(10.2), 10);
  assert.equal(roundMinor(10.5), 11);
  assert.equal(roundMinor(10.52), 11);
  assert.equal(roundMinor(0.4), 0);
});

test('splitInstalments: E10 shape — BHD 10.000 into 3 parts absorbs the remainder in the last part', () => {
  assert.deepEqual(splitInstalments(10000, 3), [3333, 3333, 3334]);
  assert.equal(splitInstalments(10000, 3).reduce((a, b) => a + b, 0), 10000);
});

test('splitInstalments: exact division needs no absorption', () => {
  assert.deepEqual(splitInstalments(9000, 3), [3000, 3000, 3000]);
});

test('splitInstalments: n=1 returns the whole amount', () => {
  assert.deepEqual(splitInstalments(500, 1), [500]);
});
