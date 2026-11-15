export const CHART_RANGES = [
  { id: '1h', buttonLabel: '1H', title: 'Last hour', shortLabel: '1h', hours: 1 },
  { id: '6h', buttonLabel: '6H', title: 'Last 6 hours', shortLabel: '6h', hours: 6 },
  { id: '24h', buttonLabel: '1D', title: 'Last 24 hours', shortLabel: '24h', days: 1 },
  { id: '7d', buttonLabel: '7D', title: 'Last 7 days', shortLabel: '7d', days: 7 },
  { id: '30d', buttonLabel: '30D', title: 'Last 30 days', shortLabel: '30d', days: 30 },
];

export const DEFAULT_CHART_RANGE = CHART_RANGES.find((range) => range.id === '7d');

// CoinGecko only accepts fixed day spans, so short windows use the range endpoint
// with explicit second-based timestamps instead of the `days` parameter.
export const getChartRequestParams = (range, now = Date.now()) => {
  if (range.days) return { days: range.days };

  const to = Math.floor(now / 1000);
  return { from: to - range.hours * 3600, to };
};
