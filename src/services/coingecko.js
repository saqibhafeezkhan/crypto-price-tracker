// The demo key keeps a fresh clone working; set VITE_COINGECKO_API_KEY in
// .env.local to use your own quota (see .env.example).
const apiKey = () => import.meta.env.VITE_COINGECKO_API_KEY || 'CG-EcPpaPKYcgVrtn6szPjdjCFU';

const request = async (path, { signal } = {}) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.coingecko.com/api/v3';

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      accept: 'application/json',
      'x-cg-demo-api-key': apiKey(),
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export const fetchMarkets = ({ vsCurrency, ids, perPage = 250, signal } = {}) => {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    per_page: String(perPage),
  });
  if (ids && ids.length > 0) params.set('ids', ids.join(','));

  return request(`/coins/markets?${params}`, { signal });
};

export const searchCoins = (query, { signal } = {}) =>
  request(`/search?query=${encodeURIComponent(query)}`, { signal });

export const fetchMarketChart = (coinId, { vsCurrency, days, from, to, signal } = {}) => {
  const params = new URLSearchParams({ vs_currency: vsCurrency });

  if (days) {
    params.set('days', String(days));
    return request(`/coins/${coinId}/market_chart?${params}`, { signal });
  }

  params.set('from', String(from));
  params.set('to', String(to));
  return request(`/coins/${coinId}/market_chart/range?${params}`, { signal });
};

export const fetchCoin = (coinId, vsCurrency, { signal } = {}) => {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
  });

  return request(`/coins/${coinId}?${params}`, { signal });
};
