import { describe, loadSymbolIndex, toSymbol } from './symbols.js';

// OKX quotes against USDT rather than USD and lists no EUR/INR pairs, so this
// provider is only used when the tracker is showing USD.
const QUOTE_ASSET = 'USDT';

const INTERVALS = [
  { maxHours: 6, bar: '5m', hours: 5 / 60 },
  { maxHours: 48, bar: '1H', hours: 1 },
  { maxHours: 8 * 24, bar: '2H', hours: 2 },
  { maxHours: Infinity, bar: '1D', hours: 24 },
];

// OKX reports logical errors with a 200 status and a non-zero code.
const request = async (path, { signal } = {}) => {
  const baseUrl = import.meta.env.VITE_OKX_API_BASE_URL || 'https://www.okx.com';

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`OKX request failed: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();

  if (body?.code && body.code !== '0') {
    throw new Error(`OKX request failed: ${body.code} ${body.msg || ''}`.trim());
  }

  return body;
};

const toNumber = (value) => {
  const number = Number(value);
  return value === '' || value === null || !Number.isFinite(number) ? undefined : number;
};

const assertUsd = (vsCurrency) => {
  if (vsCurrency.toLowerCase() !== 'usd') {
    throw new Error(`OKX only quotes USDT pairs, not ${vsCurrency}`);
  }
};

const instrumentFor = (symbol) => `${symbol}-${QUOTE_ASSET}`;

const baseOf = (instrument) => instrument.split('-')[0];

const percentChange = (ticker) => {
  const last = toNumber(ticker.last);
  const open = toNumber(ticker.open24h);
  if (last === undefined || !open) return undefined;
  return ((last - open) / open) * 100;
};

const toMarket = (ticker, index) => {
  const symbol = baseOf(ticker.instId);
  return {
    ...describe(symbol, index),
    symbol,
    current_price: toNumber(ticker.last),
    price_change_percentage_24h: percentChange(ticker),
    total_volume: toNumber(ticker.volCcy24h),
  };
};

const sortByRank = (a, b) => (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity);

const fetchSpotTickers = async ({ signal } = {}) => {
  const body = await request('/api/v5/market/tickers?instType=SPOT', { signal });
  return (body.data || []).filter((ticker) => ticker.instId?.endsWith(`-${QUOTE_ASSET}`));
};

export const fetchMarkets = async ({ vsCurrency, ids, perPage = 250, signal } = {}) => {
  assertUsd(vsCurrency);
  const index = await loadSymbolIndex();
  const tickers = await fetchSpotTickers({ signal });

  if (ids && ids.length > 0) {
    const symbols = new Set(await Promise.all(ids.map((id) => toSymbol(id))));
    return tickers
      .filter((ticker) => symbols.has(baseOf(ticker.instId)))
      .map((ticker) => toMarket(ticker, index))
      .sort(sortByRank);
  }

  return (
    tickers
      .map((ticker) => toMarket(ticker, index))
      // OKX has no market cap, so the list is ranked by traded value instead.
      .sort((a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0))
      .slice(0, perPage)
  );
};

export const fetchCoin = async (coinId, vsCurrency, { signal } = {}) => {
  assertUsd(vsCurrency);
  const symbol = await toSymbol(coinId);
  const body = await request(`/api/v5/market/ticker?instId=${instrumentFor(symbol)}`, { signal });
  const ticker = (body.data || [])[0];
  if (!ticker) throw new Error(`OKX has no market for ${symbol}`);

  const index = await loadSymbolIndex();
  const market = toMarket(ticker, index);

  return {
    ...market,
    image: {},
    description: {},
    market_data: {
      current_price: { [vsCurrency]: market.current_price },
      price_change_percentage_24h: market.price_change_percentage_24h,
      total_volume: { [vsCurrency]: market.total_volume },
      high_24h: { [vsCurrency]: toNumber(ticker.high24h) },
      low_24h: { [vsCurrency]: toNumber(ticker.low24h) },
    },
  };
};

export const fetchMarketChart = async (coinId, { vsCurrency, days, from, to, signal } = {}) => {
  assertUsd(vsCurrency);
  const symbol = await toSymbol(coinId);
  const spanHours = days ? days * 24 : (to - from) / 3600;
  const interval = INTERVALS.find((entry) => spanHours <= entry.maxHours);
  const limit = Math.min(100, Math.max(2, Math.ceil(spanHours / interval.hours)));

  const params = new URLSearchParams({
    instId: instrumentFor(symbol),
    bar: interval.bar,
    limit: String(limit),
  });

  const body = await request(`/api/v5/market/candles?${params}`, { signal });

  return {
    // OKX answers newest first: [ts, open, high, low, close, volume, ...]
    prices: (body.data || [])
      .slice()
      .reverse()
      .map((candle) => [toNumber(candle[0]), toNumber(candle[4])])
      .filter(([, price]) => Number.isFinite(price)),
  };
};
