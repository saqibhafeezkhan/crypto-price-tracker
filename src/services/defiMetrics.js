// Pure metric helpers shared by the refresh script, the page and the tests.
// Nothing here touches the network or the DOM.

// A 1% move is treated as noise when deciding whether TVL is "up" or "flat",
// so a badge is only shown when both legs move clearly in opposite directions.
export const TVL_FLAT_BAND = 1;
export const FEE_MOVE_BAND = 1;

/** Percentage change, or null when the baseline is missing or zero. */
export const pctChange = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;

  return ((current - previous) / previous) * 100;
};

/** 30d value projected to a year. Always labelled as an estimate in the UI. */
export const annualize = (value30d) => (Number.isFinite(value30d) ? (value30d * 365) / 30 : null);

/** Guarded division: null instead of Infinity/NaN in the table. */
export const ratio = (numerator, denominator) =>
  Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : null;

/** Market cap divided by annualized fees. */
export const priceToFees = (marketCap, fees30d) => {
  const annualFees = annualize(fees30d);
  if (!Number.isFinite(marketCap) || marketCap <= 0) return null;
  if (!Number.isFinite(annualFees) || annualFees <= 0) return null;

  return marketCap / annualFees;
};

/**
 * Change over N days from a daily series of `{ date, tvl }` points (date in
 * seconds). The point nearest the target day is used, and a point that is more
 * than `toleranceDays` away is treated as missing rather than compared.
 */
export const changeFromSeries = (series, days, { toleranceDays = 2 } = {}) => {
  if (!Array.isArray(series) || !Number.isFinite(days) || days <= 0) return null;

  const points = series
    .filter((point) => Number.isFinite(point?.date) && Number.isFinite(point?.tvl))
    .sort((left, right) => left.date - right.date);

  if (points.length < 2) return null;

  const latest = points[points.length - 1];
  const targetDate = latest.date - days * 86400;
  let closest = null;

  for (const point of points) {
    const distance = Math.abs(point.date - targetDate);
    if (!closest || distance < closest.distance) closest = { point, distance };
  }

  if (!closest || closest.distance > toleranceDays * 86400) return null;

  return pctChange(latest.tvl, closest.point.tvl);
};

/**
 * Mercenary capital: TVL up while fees down over 30d.
 * Organic demand: fees up while TVL flat or down over 30d.
 * Returns null when either leg is missing or neither pattern holds.
 */
export const divergenceFlag = (
  tvlChange30d,
  feesChange30d,
  { tvlFlatBand = TVL_FLAT_BAND, feeBand = FEE_MOVE_BAND } = {},
) => {
  if (!Number.isFinite(tvlChange30d) || !Number.isFinite(feesChange30d)) return null;

  if (tvlChange30d > tvlFlatBand && feesChange30d < -feeBand) return 'mercenary';
  if (feesChange30d > feeBand && tvlChange30d <= tvlFlatBand) return 'organic';

  return null;
};

export const DIVERGENCE = {
  mercenary: {
    label: 'Mercenary capital?',
    title:
      'TVL rose over 30 days while fees fell, which can mean yield-seeking capital that leaves again.',
  },
  organic: {
    label: 'Organic demand',
    title:
      'Fees rose over 30 days while TVL was flat or down, which points to real usage rather than inflowed capital.',
  },
};
