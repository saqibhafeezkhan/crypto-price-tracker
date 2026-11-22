import { requestJson } from './http';

// Raw DexScreener reads. The public API has no "top pools per chain" endpoint,
// so pool candidates are gathered from its search API and ranked by 24h volume
// in dexPools.js. Search accepts token addresses as well as symbols.
const SEARCH_URL = 'https://api.dexscreener.com/latest/dex/search';
const TOKEN_PAIRS_URL = 'https://api.dexscreener.com/token-pairs/v1';
const REQUEST_LABEL = 'DexScreener request';

// Different DexScreener payloads wrap the pair list differently, so accept the
// array wherever it sits instead of failing on a shape change.
const readPairs = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.pairs)) return payload.pairs;
  if (Array.isArray(payload?.data?.pairs)) return payload.data.pairs;
  return [];
};

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const searchPairs = async (query, { signal } = {}) => {
  const payload = await requestJson(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
    signal,
    label: REQUEST_LABEL,
  });
  return readPairs(payload);
};

// Every pool that holds the token, busiest first, capped by DexScreener at 30
// per call. This is the one endpoint that reports many pools at once: the bulk
// tokens/v1 endpoint returns a single pair per address, which is why discovery
// has to page through tokens rather than batch their addresses.
export const fetchTokenPools = async (chainId, tokenAddress, { signal } = {}) => {
  if (!tokenAddress) return [];

  const payload = await requestJson(
    `${TOKEN_PAIRS_URL}/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`,
    { signal, label: REQUEST_LABEL },
  );

  return readPairs(payload).filter((pair) => pair?.chainId === chainId);
};

// The app's chain id is not always DexScreener's (Sei is "seiv2" there), so the
// caller can pass the id the rest of the page keys on.
export const normalizePair = (pair, chainId = pair?.chainId) => {
  if (!pair?.chainId || !pair?.pairAddress) return null;

  const base = pair.baseToken || {};
  const quote = pair.quoteToken || {};

  return {
    id: `${chainId}:${pair.pairAddress}`,
    chainId,
    dexId: String(pair.dexId || 'unknown'),
    pairAddress: pair.pairAddress,
    url: pair.url || `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}`,
    baseSymbol: String(base.symbol || '?'),
    baseName: String(base.name || ''),
    baseAddress: base.address || '',
    quoteSymbol: String(quote.symbol || '?'),
    quoteName: String(quote.name || ''),
    priceUsd: numberOrNull(pair.priceUsd),
    change24h: numberOrNull(pair.priceChange?.h24),
    volume24h: numberOrNull(pair.volume?.h24),
    liquidityUsd: numberOrNull(pair.liquidity?.usd),
    marketCap: numberOrNull(pair.marketCap) ?? numberOrNull(pair.fdv),
    buys24h: numberOrNull(pair.txns?.h24?.buys),
    sells24h: numberOrNull(pair.txns?.h24?.sells),
    createdAt: numberOrNull(pair.pairCreatedAt),
    imageUrl: pair.info?.imageUrl || '',
  };
};
