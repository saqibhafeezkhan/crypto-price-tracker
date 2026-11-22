import { requestJson } from './http';

// GeckoTerminal exposes a real "top pools for a network" endpoint, so unlike
// DexScreener it can be paged directly by 24h volume. The public API returns 20
// pools per page, so a full view uses five pages. Requests are paced and retried:
// firing the pages at once trips the rate limiter, which answers 429 and used to
// leave the page with only the first page's 20 pools.
const BASE_URL = 'https://api.geckoterminal.com/api/v2';
const REQUEST_LABEL = 'GeckoTerminal request';
const PAGE_SIZE = 20;
const MAX_PAGES = 5;
const PAGE_DELAY_MS = 1100;
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 3;
const ACCEPT_VERSION = 'application/json;version=20230203';

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const byVolume = (a, b) => (b.volume24h ?? -1) - (a.volume24h ?? -1);

const fetchPoolPage = async (networkId, page, { signal }) => {
  const params = new URLSearchParams({
    page: String(page),
    sort: 'h24_volume_usd_desc',
    include: 'base_token,quote_token',
  });

  return requestJson(`${BASE_URL}/networks/${encodeURIComponent(networkId)}/pools?${params}`, {
    signal,
    headers: { accept: ACCEPT_VERSION },
    label: REQUEST_LABEL,
  });
};

// A rate-limited page is worth retrying; the caller's abort still wins so
// navigating away does not wait out the backoff.
const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    let timer;
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    if (signal?.aborted) {
      abort();
      return;
    }

    timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', abort, { once: true });
  });

const fetchPoolPageWithRetry = async (networkId, page, { signal }) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetchPoolPage(networkId, page, { signal });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      if (error.status !== 429 || attempt >= MAX_ATTEMPTS) throw error;

      await wait(RETRY_DELAY_MS * attempt, signal);
    }
  }
};

const tokenAddressFromId = (id = '', networkId = '') => {
  const prefix = networkId ? `${networkId}_` : '';
  if (prefix && id.startsWith(prefix)) return id.slice(prefix.length);

  const separator = id.indexOf('_');
  return separator === -1 ? id : id.slice(separator + 1);
};

const normalizePool = (item, tokenMap, chain) => {
  const attributes = item?.attributes;
  const address = attributes?.address;
  if (!address) return null;

  const baseId = item.relationships?.base_token?.data?.id;
  const quoteId = item.relationships?.quote_token?.data?.id;
  const baseToken = tokenMap.get(baseId) || {};
  const quoteToken = tokenMap.get(quoteId) || {};
  const [nameBase, nameQuote] = String(attributes.name || '').split(/\s*\/\s*/);

  return {
    id: `${chain.id}:${address}`,
    chainId: chain.id,
    dexId: String(item.relationships?.dex?.data?.id || 'unknown'),
    pairAddress: address,
    url: `https://www.geckoterminal.com/${chain.geckoId}/pools/${address}`,
    baseSymbol: String(baseToken.symbol || nameBase || '?'),
    baseName: String(baseToken.name || nameBase || ''),
    baseAddress: baseToken.address || tokenAddressFromId(baseId, chain.geckoId),
    quoteSymbol: String(quoteToken.symbol || nameQuote || '?'),
    quoteName: String(quoteToken.name || nameQuote || ''),
    priceUsd: numberOrNull(attributes.base_token_price_usd),
    change24h: numberOrNull(attributes.price_change_percentage?.h24),
    volume24h: numberOrNull(attributes.volume_usd?.h24),
    liquidityUsd: numberOrNull(attributes.reserve_in_usd),
    marketCap: numberOrNull(attributes.market_cap_usd) ?? numberOrNull(attributes.fdv_usd),
    buys24h: numberOrNull(attributes.transactions?.h24?.buys),
    sells24h: numberOrNull(attributes.transactions?.h24?.sells),
    createdAt: attributes.pool_created_at
      ? numberOrNull(Date.parse(attributes.pool_created_at))
      : null,
    imageUrl: baseToken.image_url || '',
  };
};

const buildResult = (chain, payloads) => {
  const tokenMap = new Map();
  const rawPools = [];

  for (const payload of payloads) {
    for (const token of payload?.included || []) {
      if (token?.type === 'token') tokenMap.set(token.id, token.attributes || {});
    }

    for (const item of payload?.data || []) {
      rawPools.push(item);
    }
  }

  const seen = new Set();
  const pools = [];

  for (const item of rawPools) {
    const pool = normalizePool(item, tokenMap, chain);
    if (!pool || seen.has(pool.id)) continue;

    seen.add(pool.id);
    pools.push(pool);
  }

  pools.sort(byVolume);
  const top = pools.slice(0, 100);

  return {
    chainId: chain.id,
    pools: top,
    stats: {
      poolCount: top.length,
      volume24h: top.reduce((total, pool) => total + (pool.volume24h || 0), 0),
      liquidityUsd: top.reduce((total, pool) => total + (pool.liquidityUsd || 0), 0),
    },
    source: 'geckoterminal',
    updatedAt: Date.now(),
  };
};

export const fetchTopPools = async (chain, { signal } = {}) => {
  if (!chain.geckoId) {
    throw new Error(`GeckoTerminal does not support ${chain.name}`);
  }

  const payloads = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    if (page > 1) await wait(PAGE_DELAY_MS, signal);

    let payload;

    try {
      payload = await fetchPoolPageWithRetry(chain.geckoId, page, { signal });
    } catch (error) {
      if (error.name === 'AbortError') throw error;

      // The first page is the whole answer; a later page only adds rows to an
      // answer that already exists, so keep what came back.
      if (page === 1) throw error;

      console.warn(
        `GeckoTerminal page ${page} failed for ${chain.name}; keeping earlier pages.`,
        error,
      );
      break;
    }

    payloads.push(payload);

    if (!Array.isArray(payload?.data) || payload.data.length < PAGE_SIZE) break;
  }

  return buildResult(chain, payloads);
};
