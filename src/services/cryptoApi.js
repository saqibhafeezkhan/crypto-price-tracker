import {
  fetchCoin as loadCoin,
  fetchMarketChart as loadMarketChart,
  fetchMarkets as loadMarkets,
  searchCoins as loadSearch,
} from './providers.js';
import { rangeScope, withStore } from './store.js';

// Each read goes through the provider chain in providers.js and is then kept as
// a JSON document for four hours, so the pages stay unchanged and the providers
// are asked at most once per window.

export const fetchMarkets = ({ vsCurrency, ids, perPage = 250, signal } = {}) => {
  const scope = ids && ids.length > 0 ? [...ids].sort().join(',') : 'top';

  return withStore(`markets:${vsCurrency}:${perPage}:${scope}`, () =>
    loadMarkets({ vsCurrency, ids, perPage, signal })
  );
};

export const searchCoins = (query, { signal } = {}) => {
  const term = query.trim();
  if (!term) return Promise.resolve({ coins: [] });

  return withStore(`search:${term.toLowerCase()}`, () => loadSearch(term, { signal }));
};

export const fetchCoin = (coinId, vsCurrency, { signal } = {}) =>
  withStore(`coin:${coinId}:${vsCurrency}`, () => loadCoin(coinId, vsCurrency, { signal }));

export const fetchMarketChart = (coinId, { vsCurrency, days, from, to, signal } = {}) =>
  withStore(`chart:${coinId}:${vsCurrency}:${rangeScope({ days, from, to })}`, () =>
    loadMarketChart(coinId, { vsCurrency, days, from, to, signal })
  );
