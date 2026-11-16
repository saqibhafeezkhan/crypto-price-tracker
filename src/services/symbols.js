import { fetchCatalog } from './coinmarketcap.js';

// Exchange APIs are keyed by ticker symbol ("BTC") while routes carry slugs
// ("bitcoin"). CoinMarketCap's free ID map is the only keyless source that links
// the two, so the exchange providers borrow it when it is reachable or cached.
let indexPromise = null;

const buildIndex = (catalog) => {
  const bySymbol = new Map();
  const bySlug = new Map();

  for (const entry of catalog) {
    if (entry.symbol && !bySymbol.has(entry.symbol.toUpperCase())) {
      bySymbol.set(entry.symbol.toUpperCase(), entry);
    }
    if (entry.slug && !bySlug.has(entry.slug)) bySlug.set(entry.slug, entry);
  }

  return { bySymbol, bySlug };
};

const EMPTY_INDEX = buildIndex([]);

const loadIndex = () => {
  if (!indexPromise) {
    indexPromise = fetchCatalog().then(buildIndex);
    // Drop a failed load so a later call can retry; this call still gets the
    // empty index and the exchanges simply fall back to raw symbols.
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }

  return indexPromise;
};

export const loadSymbolIndex = async () => {
  try {
    return await loadIndex();
  } catch {
    return EMPTY_INDEX;
  }
};

export const toSymbol = async (coinId) => {
  const { bySymbol, bySlug } = await loadSymbolIndex();
  const known = bySlug.get(coinId.toLowerCase()) || bySymbol.get(coinId.toUpperCase());
  return (known?.symbol || coinId).toUpperCase();
};

// Exchange lists only carry tickers, so name, slug and rank come from the map.
export const describe = (symbol, index) => {
  const known = index.bySymbol.get(symbol.toUpperCase());
  return {
    id: known?.slug || symbol.toLowerCase(),
    name: known?.name || symbol,
    market_cap_rank: known?.rank,
  };
};
