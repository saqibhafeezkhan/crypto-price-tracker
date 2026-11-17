const apiKey = () => import.meta.env.VITE_COINMARKETCAP_API_KEY;

// Without a key the client uses CoinMarketCap's keyless public API, which serves
// the listings, quotes and map endpoints for free but no price history.
const basePath = () => (apiKey() ? '' : '/public-api');

// CoinMarketCap serves coin logos straight off its CDN, so the image URL can be
// derived from the numeric id instead of spending an extra /info request.
const LOGO_BASE_URL = 'https://s2.coinmarketcap.com/static/img/coins/64x64';

// Ask for the extra fields the coin page renders; anything else is a wasted byte.
const AUX_FIELDS = 'cmc_rank,max_supply,circulating_supply,total_supply';

const request = async (path, { signal } = {}) => {
  const baseUrl = import.meta.env.VITE_CMC_API_BASE_URL || 'https://pro-api.coinmarketcap.com';
  const key = apiKey();

  const response = await fetch(`${baseUrl}${basePath()}${path}`, {
    headers: {
      accept: 'application/json',
      ...(key ? { 'X-CMC_PRO_API_KEY': key } : {}),
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`CoinMarketCap request failed: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();

  // CoinMarketCap reports some failures with a 200 status and an error_code.
  if (body?.status?.error_code) {
    throw new Error(
      `CoinMarketCap request failed: ${body.status.error_code} ${body.status.error_message || ''}`.trim(),
    );
  }

  return body;
};

// v1 answers with an array, v2/v3 with an object keyed by id, so normalise both.
const entriesOf = (body) => {
  const data = body?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return Object.values(data);
  return [];
};

const logoUrl = (id) => (id ? `${LOGO_BASE_URL}/${id}.png` : '');

// Answers are keyed by the requested currency in upper case, e.g. quote.USD.
const quoteOf = (entry, convert) => entry.quote?.[convert] || {};

const toMarket = (entry, convert) => {
  const quote = quoteOf(entry, convert);
  return {
    // CoinGecko route ids are slugs, so expose the CMC slug rather than its numeric id.
    id: entry.slug || String(entry.id),
    name: entry.name,
    symbol: entry.symbol,
    image: logoUrl(entry.id),
    market_cap_rank: entry.cmc_rank,
    current_price: quote.price,
    price_change_percentage_24h: quote.percent_change_24h,
    market_cap: quote.market_cap,
    total_volume: quote.volume_24h,
  };
};

const sortByRank = (a, b) => (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity);

export const fetchMarkets = async ({ vsCurrency, ids, perPage = 250, signal } = {}) => {
  const convert = vsCurrency.toUpperCase();

  if (ids && ids.length > 0) {
    const body = await request(
      `/v3/cryptocurrency/quotes/latest?slug=${encodeURIComponent(ids.join(','))}&convert=${convert}&aux=${AUX_FIELDS}`,
      { signal },
    );

    return entriesOf(body)
      .map((entry) => toMarket(entry, convert))
      .sort(sortByRank);
  }

  const body = await request(
    `/v3/cryptocurrency/listings/latest?convert=${convert}&limit=${perPage}`,
    { signal },
  );

  return entriesOf(body).map((entry) => toMarket(entry, convert));
};

// There is no search endpoint, so the catalogue is fetched once and matched
// locally against name and symbol. The numeric ids also feed the chart lookup,
// and the exchange providers reuse it to translate slug <-> ticker symbol.
let catalogPromise = null;

export const fetchCatalog = ({ signal } = {}) => {
  if (!catalogPromise) {
    catalogPromise = request('/v1/cryptocurrency/map?listing_status=active&sort=cmc_rank', {
      signal,
    })
      .then((body) => entriesOf(body))
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }

  return catalogPromise;
};

export const searchCoins = async (query, { signal } = {}) => {
  const term = query.trim().toLowerCase();
  const catalog = await fetchCatalog({ signal });

  const coins = catalog
    .filter(
      (entry) =>
        entry.name?.toLowerCase().includes(term) || entry.symbol?.toLowerCase().includes(term),
    )
    .slice(0, 50)
    .map((entry) => ({ id: entry.slug, name: entry.name, symbol: entry.symbol }));

  return { coins };
};

const resolveCoinId = async (coinId, { signal } = {}) => {
  if (/^\d+$/.test(coinId)) return coinId;

  const catalog = await fetchCatalog({ signal });
  const match = catalog.find((entry) => entry.slug === coinId);
  if (!match) throw new Error(`CoinMarketCap has no coin matching "${coinId}"`);

  return match.id;
};

export const fetchCoin = async (coinId, vsCurrency, { signal } = {}) => {
  const convert = vsCurrency.toUpperCase();
  const body = await request(
    `/v3/cryptocurrency/quotes/latest?slug=${encodeURIComponent(coinId)}&convert=${convert}&aux=${AUX_FIELDS}`,
    { signal },
  );

  const entry = entriesOf(body)[0];
  if (!entry) throw new Error(`CoinMarketCap has no coin matching "${coinId}"`);

  const quote = quoteOf(entry, convert);

  // CoinMarketCap has no description, ATH/ATL or 24h high/low in its public API,
  // so those fields stay absent and the UI renders its usual placeholder.
  return {
    id: entry.slug,
    name: entry.name,
    symbol: entry.symbol,
    image: { large: logoUrl(entry.id) },
    market_cap_rank: entry.cmc_rank,
    description: {},
    market_data: {
      current_price: { [vsCurrency]: quote.price },
      price_change_percentage_24h: quote.percent_change_24h,
      market_cap: { [vsCurrency]: quote.market_cap },
      total_volume: { [vsCurrency]: quote.volume_24h },
      circulating_supply: entry.circulating_supply,
      total_supply: entry.total_supply,
      max_supply: entry.max_supply,
    },
  };
};

// A line chart only needs quote snapshots, and these are included in the free
// Basic plan (unlike OHLCV). The keyless public API has no history at all.
const chartInterval = (spanHours) => {
  if (spanHours <= 6) return '5m';
  if (spanHours <= 48) return '1h';
  if (spanHours <= 8 * 24) return '2h';
  return '1d';
};

export const fetchMarketChart = async (coinId, { vsCurrency, days, from, to, signal } = {}) => {
  if (!apiKey()) {
    throw new Error('CoinMarketCap price history requires an API key');
  }

  const convert = vsCurrency.toUpperCase();
  const end = days ? Math.floor(Date.now() / 1000) : to;
  const start = days ? end - days * 86400 : from;
  const id = await resolveCoinId(coinId, { signal });

  const params = new URLSearchParams({
    id: String(id),
    convert,
    interval: chartInterval((end - start) / 3600),
    time_start: new Date(start * 1000).toISOString(),
    time_end: new Date(end * 1000).toISOString(),
  });

  const body = await request(`/v3/cryptocurrency/quotes/historical?${params}`, { signal });

  const quotes = body.data?.quotes || [];
  return {
    prices: quotes
      .map((point) => [
        Date.parse(point.timestamp ?? point.time_open),
        point.quote?.[convert]?.price ?? point.quote?.[convert]?.close,
      ])
      .filter(([, price]) => Number.isFinite(price)),
  };
};
