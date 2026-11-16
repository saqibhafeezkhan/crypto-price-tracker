import * as coinGecko from './coingecko.js';
import * as coinMarketCap from './coinmarketcap.js';
import * as binance from './binance.js';
import * as okx from './okx.js';

// CoinGecko's demo key runs out of credits quickly, so every read walks a chain
// of providers and returns the first usable answer. Each client normalises its
// payload to CoinGecko's shapes, which keeps the choice invisible to the caller.
//
// The chain is walked per call rather than sticking to whichever provider last
// answered: the exchange providers are the only ones with keyless price history
// but no market caps, so a chart call must not demote the coin list to them.
//
// These calls are made by the browser, so the chain also absorbs CORS failures
// and missing browser-demo quotas on top of ordinary rate limits.
const PROVIDERS = [
  ['coingecko', coinGecko],
  ['coinmarketcap', coinMarketCap],
  ['binance', binance],
  ['okx', okx],
];

const run = async (method, args, isValid) => {
  let lastError;

  for (const [name, provider] of PROVIDERS) {
    try {
      const data = await provider[method](...args);
      if (!isValid(data)) throw new Error(`${name} returned an unusable payload`);

      if (lastError) console.warn(`Fell back to ${name}: ${lastError.message}`);
      return data;
    } catch (error) {
      // Not a provider failure, whatever the provider did with the request.
      if (error.name === 'AbortError') throw error;
      lastError = error;
    }
  }

  throw lastError;
};

export const fetchMarkets = (options = {}) =>
  run('fetchMarkets', [options], (data) => Array.isArray(data) && data.length > 0);

export const searchCoins = (query, options = {}) =>
  run('searchCoins', [query, options], (data) => Array.isArray(data?.coins));

export const fetchCoin = (coinId, vsCurrency, options = {}) =>
  run('fetchCoin', [coinId, vsCurrency, options], (data) => Boolean(data?.market_data));

export const fetchMarketChart = (coinId, options = {}) =>
  run(
    'fetchMarketChart',
    [coinId, options],
    (data) => Array.isArray(data?.prices) && data.prices.length > 0
  );
