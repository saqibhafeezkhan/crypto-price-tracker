// The pages never call a market data provider directly: they ask the local API
// (server/), which owns the four-hour JSON store under data/. Keeping the
// provider keys on that side also keeps them out of this bundle.

const API_BASE_URL = '/api';

const request = async (path, { signal } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  // A dev server or proxy that misses /api answers with HTML, so never assume JSON.
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.error ||
        `Request to ${API_BASE_URL}${path} failed: ${response.status} ${response.statusText}`
    );
  }

  return body;
};

export const fetchMarkets = ({ vsCurrency, ids, perPage = 250, signal } = {}) => {
  const params = new URLSearchParams({ vsCurrency, perPage: String(perPage) });
  if (ids && ids.length > 0) params.set('ids', ids.join(','));

  return request(`/markets?${params}`, { signal });
};

export const searchCoins = (query, { signal } = {}) =>
  request(`/search?query=${encodeURIComponent(query)}`, { signal });

export const fetchCoin = (coinId, vsCurrency, { signal } = {}) =>
  request(
    `/coins/${encodeURIComponent(coinId)}?vsCurrency=${encodeURIComponent(vsCurrency)}`,
    { signal }
  );

export const fetchMarketChart = (coinId, { vsCurrency, days, from, to, signal } = {}) => {
  const params = new URLSearchParams({ vsCurrency });
  if (days) {
    params.set('days', String(days));
  } else {
    params.set('from', String(from));
    params.set('to', String(to));
  }

  return request(`/charts/${encodeURIComponent(coinId)}?${params}`, { signal });
};
