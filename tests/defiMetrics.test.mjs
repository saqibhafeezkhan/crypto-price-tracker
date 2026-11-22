import test from 'node:test';
import assert from 'node:assert/strict';
import {
  annualize,
  changeFromSeries,
  divergenceFlag,
  pctChange,
  priceToFees,
  ratio,
} from '../src/services/defiMetrics.js';

const DAY = 86400;
const series = (values, { start = 1_700_000_000, step = DAY } = {}) =>
  values.map((tvl, index) => ({ date: start + index * step, tvl }));

test('pctChange handles growth, decline and unusable baselines', () => {
  assert.equal(pctChange(110, 100), 10);
  assert.equal(pctChange(90, 100), -10);
  assert.equal(pctChange(0, 100), -100);
  assert.equal(pctChange(100, 0), null);
  assert.equal(pctChange(null, 100), null);
  assert.equal(pctChange(100, undefined), null);
  assert.equal(pctChange(Number.NaN, 100), null);
});

test('annualize projects the 30-day value and guards missing data', () => {
  assert.equal(annualize(30), 365);
  assert.equal(annualize(1), 12.166666666666666);
  assert.equal(annualize(null), null);
  assert.equal(annualize(Number.POSITIVE_INFINITY), null);
});

test('ratio never returns Infinity or NaN', () => {
  assert.equal(ratio(5, 10), 0.5);
  assert.equal(ratio(5, 0), null);
  assert.equal(ratio(5, -10), null);
  assert.equal(ratio(null, 10), null);
  assert.equal(ratio(5, null), null);
});

test('priceToFees uses annualized fees', () => {
  assert.equal(priceToFees(3650, 30), 10);
  assert.equal(priceToFees(1000, 0), null);
  assert.equal(priceToFees(0, 30), null);
  assert.equal(priceToFees(null, 30), null);
  assert.equal(priceToFees(1000, null), null);
});

test('changeFromSeries measures the 30-day change', () => {
  const points = series(Array.from({ length: 40 }, (_, index) => 100 + index));

  // Today is 139; 30 days back the value was 109 and 7 days back it was 132.
  assert.equal(changeFromSeries(points, 30), ((139 - 109) / 109) * 100);
  assert.equal(changeFromSeries(points, 7), ((139 - 132) / 132) * 100);
});

test('changeFromSeries tolerates gaps but not a missing window', () => {
  const sparse = series([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 110], {
    step: 3 * DAY,
  });

  // The nearest point to "30 days ago" is 30 days away (10 steps), so it is
  // accepted; a series that only spans 10 days is not.
  assert.equal(changeFromSeries(sparse, 30, { toleranceDays: 2 }), 10);

  const short = series([100, 101, 102]);
  assert.equal(changeFromSeries(short, 30), null);
});

test('changeFromSeries sorts, filters bad points and guards a zero baseline', () => {
  const unsorted = [
    { date: 1_700_000_000 + 30 * DAY, tvl: 150 },
    { date: 1_700_000_000, tvl: 100 },
    { date: 'not-a-date', tvl: 999 },
    { date: 1_700_000_000 + 10 * DAY, tvl: null },
  ];

  assert.equal(changeFromSeries(unsorted, 30), 50);

  const zeroBaseline = series([0, 0, 10]);
  assert.equal(changeFromSeries(zeroBaseline, 2), null);

  assert.equal(changeFromSeries(null, 30), null);
  assert.equal(changeFromSeries([], 30), null);
});

test('divergenceFlag identifies mercenary capital', () => {
  assert.equal(divergenceFlag(12, -6), 'mercenary');
  assert.equal(divergenceFlag(1.5, -1.5), 'mercenary');
});

test('divergenceFlag identifies organic demand', () => {
  assert.equal(divergenceFlag(-8, 9), 'organic');
  assert.equal(divergenceFlag(0.5, 9), 'organic');
  assert.equal(divergenceFlag(0, 9), 'organic');
});

test('divergenceFlag stays quiet on agreement, noise and missing data', () => {
  assert.equal(divergenceFlag(10, 10), null);
  assert.equal(divergenceFlag(-10, -10), null);
  assert.equal(divergenceFlag(1, -1), null);
  assert.equal(divergenceFlag(-1, 1), null);
  assert.equal(divergenceFlag(null, -10), null);
  assert.equal(divergenceFlag(10, null), null);
});
