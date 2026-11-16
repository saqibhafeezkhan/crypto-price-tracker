import { rangeScope, withStore } from './store.js';
import {
  fetchCoin,
  fetchMarketChart,
  fetchMarkets,
  searchCoins,
} from '../src/services/providers.js';

// The store already guarantees freshness, so responses must not be cached again
// by the browser or a proxy in front of it.
const sendJson = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
};

const badRequest = (message, status = 400) => Object.assign(new Error(message), { status });

// Absent query parameters arrive as null, and Number(null) is 0, so they are
// rejected before conversion rather than parsed as a real zero.
const asNumber = (value) => {
  if (value === null || value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const resolve = async (url) => {
  const vsCurrency = url.searchParams.get('vsCurrency') || 'usd';

  if (url.pathname === '/api/markets') {
    const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
    const perPage = asNumber(url.searchParams.get('perPage')) || 250;
    const scope = ids.length > 0 ? [...ids].sort().join(',') : 'top';

    return withStore(`markets:${vsCurrency}:${perPage}:${scope}`, () =>
      fetchMarkets({ vsCurrency, ids, perPage })
    );
  }

  if (url.pathname === '/api/search') {
    const query = (url.searchParams.get('query') || '').trim();
    // An empty term has no meaningful result, and would otherwise cache forever.
    if (!query) return { coins: [] };

    return withStore(`search:${query.toLowerCase()}`, () => searchCoins(query));
  }

  const match = /^\/api\/(coins|charts)\/([^/]+)$/.exec(url.pathname);
  if (!match) throw badRequest(`Unknown endpoint ${url.pathname}`, 404);

  const [, kind, rawCoinId] = match;
  const coinId = decodeURIComponent(rawCoinId);

  if (kind === 'coins') {
    return withStore(`coin:${coinId}:${vsCurrency}`, () => fetchCoin(coinId, vsCurrency));
  }

  const range = {
    days: asNumber(url.searchParams.get('days')),
    from: asNumber(url.searchParams.get('from')),
    to: asNumber(url.searchParams.get('to')),
  };
  if (!range.days && (range.from === undefined || range.to === undefined)) {
    throw badRequest('Pass either days or both from and to');
  }

  return withStore(`chart:${coinId}:${vsCurrency}:${rangeScope(range)}`, () =>
    fetchMarketChart(coinId, { vsCurrency, ...range })
  );
};

// Shared by the Vite dev middleware and server/index.js. Returns false when the
// request is not an API call, so the caller can keep serving static files.
export const handleApi = async (req, res, url) => {
  if (!url.pathname.startsWith('/api/')) return false;

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Only GET is supported' });
    return true;
  }

  try {
    sendJson(res, 200, await resolve(url));
  } catch (error) {
    console.error(`API request failed for ${url.pathname}: ${error.message}`);
    sendJson(res, error.status || 502, { error: error.message });
  }

  return true;
};
