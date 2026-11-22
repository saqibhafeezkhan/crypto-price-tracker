import { normalizePair, searchPairs, fetchTokenPools } from './dexscreener';
import { fetchTopPools as fetchGeckoTerminalPools } from './geckoterminal';
import { withStore } from './store';

export const POOLS_PER_CHAIN = 100;
const MAX_DISCOVERY_CALLS = 12;
const DISCOVERY_BATCH = 3;
const POOLS_RETENTION_MS = 60 * 1000;
const PROVIDERS = new Set(['auto', 'dexscreener', 'geckoterminal']);

const byVolume = (a, b) => (b.volume24h ?? -1) - (a.volume24h ?? -1);

// DexScreener and the app do not always spell a chain the same way; the app id
// stays the key for the UI while requests use DexScreener's own id.
const dexChainId = (chain) => chain.dsId || chain.id;

const makeStats = (pools, tokenCount) => ({
  poolCount: pools.length,
  volume24h: pools.reduce((total, pool) => total + (pool.volume24h || 0), 0),
  liquidityUsd: pools.reduce((total, pool) => total + (pool.liquidityUsd || 0), 0),
  tokenCount,
});

// Curated contracts seed chains where symbol searches are ambiguous, and a
// symbol/name search seeds the chains that have no curated list at all.
const collectSeedTokens = async (chain, { signal }) => {
  const chainId = dexChainId(chain);
  const seeds = new Set(chain.addresses || []);
  const queries = [...new Set([...chain.terms, chain.name])];
  const settled = await Promise.allSettled(queries.map((query) => searchPairs(query, { signal })));
  const aborted = settled.find(
    (result) => result.status === 'rejected' && result.reason?.name === 'AbortError',
  );
  if (aborted) throw aborted.reason;

  for (const result of settled) {
    if (result.status !== 'fulfilled') {
      // One dead query must not stop the others from seeding.
      console.warn('DexScreener search failed:', result.reason);
      continue;
    }

    for (const pair of result.value) {
      if (pair?.chainId !== chainId) continue;

      for (const token of [pair.baseToken, pair.quoteToken]) {
        if (token?.address) seeds.add(token.address);
      }
    }
  }

  return seeds;
};

// Discovery starts from a few tokens and walks outwards: each token reports its
// 30 busiest pools, and the counterpart tokens of those pools become the next
// seeds. A handful of calls therefore covers a chain's busiest assets, which is
// the closest the public API gets to a "top pools per chain" listing.
const discoverPools = async (chain, seeds, { signal }) => {
  const chainId = dexChainId(chain);
  const pools = new Map();
  const peerScores = new Map();
  const tried = new Set();
  const queue = [...seeds];
  let calls = 0;

  const refillQueue = () => {
    if (queue.length >= DISCOVERY_BATCH) return;

    const next = [...peerScores.entries()]
      .filter(([address]) => !tried.has(address) && !queue.includes(address))
      .sort(([, left], [, right]) => right - left)
      .slice(0, DISCOVERY_BATCH - queue.length)
      .map(([address]) => address);

    queue.push(...next);
  };

  while (pools.size < POOLS_PER_CHAIN && calls < MAX_DISCOVERY_CALLS) {
    const batch = [];

    while (batch.length < DISCOVERY_BATCH && queue.length > 0) {
      const token = queue.shift();
      if (!token || tried.has(token)) continue;

      tried.add(token);
      batch.push(token);
    }

    if (batch.length === 0) break;

    calls += batch.length;

    const settled = await Promise.allSettled(
      batch.map((token) => fetchTokenPools(chainId, token, { signal })),
    );

    const aborted = settled.find(
      (result) => result.status === 'rejected' && result.reason?.name === 'AbortError',
    );
    if (aborted) throw aborted.reason;

    for (const result of settled) {
      if (result.status !== 'fulfilled') {
        // A failed token lookup degrades to the pools already found.
        console.warn(`DexScreener token-pairs lookup failed for ${chain.name}:`, result.reason);
        continue;
      }

      for (const pair of result.value) {
        const pool = normalizePair(pair, chain.id);
        if (pool && !pools.has(pool.id)) pools.set(pool.id, pool);

        const volume = Number(pair?.volume?.h24) || 0;

        for (const side of [pair?.baseToken, pair?.quoteToken]) {
          const address = side?.address;
          if (!address || tried.has(address)) continue;

          peerScores.set(address, (peerScores.get(address) || 0) + volume);
        }
      }
    }

    refillQueue();
  }

  const ranked = [...pools.values()].sort(byVolume).slice(0, POOLS_PER_CHAIN);

  return {
    chainId: chain.id,
    pools: ranked,
    stats: makeStats(ranked, tried.size),
    source: 'dexscreener',
    updatedAt: Date.now(),
  };
};

const loadDexScreenerPools = async (chain, { signal }) => {
  const seeds = await collectSeedTokens(chain, { signal });

  if (seeds.size === 0) {
    throw new Error(`DexScreener found no tokens for ${chain.name}`);
  }

  return discoverPools(chain, seeds, { signal });
};

// Auto keeps DexScreener as the primary provider and uses GeckoTerminal when it
// fails or cannot discover any pool for the chain.
const loadAutoPools = async (chain, { signal }) => {
  try {
    const result = await loadDexScreenerPools(chain, { signal });
    if (result.pools.length > 0) return result;
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    console.warn(`DexScreener failed for ${chain.name}; trying GeckoTerminal.`, error);
  }

  return fetchGeckoTerminalPools(chain, { signal });
};

const loaderFor = (source) => {
  if (source === 'dexscreener') return loadDexScreenerPools;
  if (source === 'geckoterminal') return fetchGeckoTerminalPools;
  return loadAutoPools;
};

export const fetchChainPools = (chain, { source = 'auto', signal, force = false } = {}) => {
  const requested = PROVIDERS.has(source) ? source : 'auto';
  const load = loaderFor(requested);

  return withStore(`dex-pools:v4:${requested}:${chain.id}`, () => load(chain, { signal }), {
    retentionMs: POOLS_RETENTION_MS,
    force,
  });
};
