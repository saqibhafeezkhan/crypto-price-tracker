import { readEnv } from './env.js';
import { describe, loadSymbolIndex, toSymbol } from './symbols.js';

// Binance quotes against USDT rather than USD and lists no EUR/INR pairs, so this
// provider is only used when the tracker is showing USD.
const QUOTE_ASSET = 'USDT';

const INTERVALS = [
  { maxHours: 6, token: '5m', hours: 5 / 60 },
  { maxHours: 48, token: '1h', hours: 1 },
  { maxHours: 8 * 24, token: '2h', hours: 2 },
  { maxHours: Infinity, token: '1d', hours: 24 },
];

// Binance answers with numbers as strings, and empty strings for untraded pairs.
const toNumber = (value) => {
  const number = Number(value);
  return value === '' || value === null || !Number.isFinite(number) ? undefined : number;
};

const request = async (path, { signal } = {}) => {
  const baseUrl = readEnv('VITE_BINANCE_API_BASE_URL', 'https://api.binance.com');

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Binance request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const assertUsd = (vsCurrency) => {
  if (vsCurrency.toLowerCase() !== 'usd') {
    throw new Error(`Binance only quotes USDT pairs, not ${vsCurrency}`);
  }
};

const pairFor = (symbol) => `${symbol}${QUOTE_ASSET}`;

const toMarket = (ticker, index) => {
  const symbol = ticker.symbol.slice(0, -QUOTE_ASSET.length);
  return {
    ...describe(symbol, index),
    symbol,
    current_price: toNumber(ticker.lastPrice),
    price_change_percentage_24h: toNumber(ticker.priceChangePercent),
    total_volume: toNumber(ticker.quoteVolume),
  };
};

const sortByVolume = (a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0);

export const fetchMarkets = async ({ vsCurrency, ids, perPage = 250, signal } = {}) => {
  assertUsd(vsCurrency);
  const index = await loadSymbolIndex();

  if (ids && ids.length > 0) {
    const symbols = await Promise.all(ids.slice(0, 100).map((id) => toSymbol(id)));
    const pairs = JSON.stringify(symbols.map(pairFor));
    const tickers = await request(
      `/api/v3/ticker/24hr?symbols=${encodeURIComponent(pairs)}`,
      { signal }
    );

    return (Array.isArray(tickers) ? tickers : [])
      .map((ticker) => toMarket(ticker, index))
      .sort((a, b) => (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity));
  }

  const tickers = await request('/api/v3/ticker/24hr', { signal });

  return (Array.isArray(tickers) ? tickers : [])
    .filter((ticker) => ticker.symbol.endsWith(QUOTE_ASSET))
    .map((ticker) => toMarket(ticker, index))
    // Binance has no market cap, so the list is ranked by traded value instead.
    .sort(sortByVolume)
    .slice(0, perPage);
};

export const fetchCoin = async (coinId, vsCurrency, { signal } = {}) => {
  assertUsd(vsCurrency);
  const symbol = await toSymbol(coinId);
  const ticker = await request(`/api/v3/ticker/24hr?symbol=${pairFor(symbol)}`, { signal });
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
      high_24h: { [vsCurrency]: toNumber(ticker.highPrice) },
      low_24h: { [vsCurrency]: toNumber(ticker.lowPrice) },
    },
  };
};

export const fetchMarketChart = async (coinId, { vsCurrency, days, from, to, signal } = {}) => {
  assertUsd(vsCurrency);
  const symbol = await toSymbol(coinId);
  const spanHours = days ? days * 24 : (to - from) / 3600;
  const interval = INTERVALS.find((entry) => spanHours <= entry.maxHours);
  const limit = Math.min(1000, Math.max(2, Math.ceil(spanHours / interval.hours)));

  const klines = await request(
    `/api/v3/klines?symbol=${pairFor(symbol)}&interval=${interval.token}&limit=${limit}`,
    { signal }
  );

  return {
    // [openTime, open, high, low, close, ...]
    prices: (Array.isArray(klines) ? klines : [])
      .map((candle) => [candle[0], toNumber(candle[4])])
      .filter(([, price]) => Number.isFinite(price)),
  };
};
