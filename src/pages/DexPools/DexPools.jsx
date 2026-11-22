import { useEffect, useMemo, useState } from 'react';
import './DexPools.css';
import { CHAIN_BY_ID, TOP_CHAINS, dexLabel } from '../../constants/dexChains';
import { POOLS_PER_CHAIN, fetchChainPools } from '../../services/dexPools';

const REFRESH_INTERVAL_MS = 60 * 1000;
const EMPTY_POOLS = [];

const SORT_COLUMNS = [
  { key: 'priceUsd', label: 'Price' },
  { key: 'change24h', label: '24h' },
  { key: 'volume24h', label: 'Volume 24h' },
  { key: 'liquidityUsd', label: 'Liquidity' },
  { key: 'marketCap', label: 'Market cap' },
];

const formatUsd = (value) => {
  if (!Number.isFinite(value)) return '—';

  const absolute = Math.abs(value);
  if (absolute >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (absolute >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absolute >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absolute >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const formatPrice = (value) => {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '$0';

  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (absolute >= 1) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  if (absolute >= 0.01) return `$${value.toFixed(5)}`;
  if (absolute >= 0.0001) return `$${value.toFixed(7)}`;
  return `$${value.toPrecision(4)}`;
};

const formatChange = (value) =>
  Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '—';

const changeClass = (value) => {
  if (!Number.isFinite(value) || value === 0) return '';
  return value > 0 ? 'is-up' : 'is-down';
};

const chainOf = (chainId) =>
  CHAIN_BY_ID[chainId] || {
    id: chainId,
    name: chainId,
    short: String(chainId).slice(0, 3).toUpperCase(),
    color: '#8a9dff',
  };

const sourceLabel = (source) =>
  source === 'dexscreener'
    ? 'DexScreener'
    : source === 'geckoterminal'
      ? 'GeckoTerminal'
      : 'DexScreener or GeckoTerminal';

const poolSearchText = (pool) =>
  [
    pool.baseSymbol,
    pool.baseName,
    pool.quoteSymbol,
    pool.quoteName,
    pool.dexId,
    dexLabel(pool.dexId),
    pool.pairAddress,
  ]
    .join(' ')
    .toLowerCase();

const TokenIcon = ({ pool, color }) => {
  const [broken, setBroken] = useState(false);

  if (pool.imageUrl && !broken) {
    return (
      <img
        className="pool-icon"
        src={pool.imageUrl}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className="pool-icon pool-icon-fallback"
      style={{
        color,
        borderColor: `${color}66`,
        backgroundColor: `${color}1f`,
      }}
    >
      {pool.baseSymbol.slice(0, 2).toUpperCase()}
    </span>
  );
};

const DexPools = () => {
  const [query, setQuery] = useState({
    chainId: TOP_CHAINS[0].id,
    source: 'auto',
    token: 0,
    force: false,
  });
  const { chainId, source, token, force } = query;
  const [poolsState, setPoolsState] = useState({
    key: '',
    chainId: '',
    requestSource: '',
    provider: '',
    pools: [],
    stats: null,
    updatedAt: 0,
    error: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState({ key: 'volume24h', direction: 'desc' });

  const refreshPools = () => {
    setQuery((current) => ({ ...current, token: current.token + 1, force: true }));
  };

  const selectedChain = CHAIN_BY_ID[chainId] || TOP_CHAINS[0];
  const requestKey = `${chainId}|${source}|${token}`;
  const loading = poolsState.key !== requestKey;
  const sameRequest = poolsState.chainId === chainId && poolsState.requestSource === source;
  const pools = sameRequest ? poolsState.pools : EMPTY_POOLS;
  const stats = sameRequest ? poolsState.stats : null;
  const updatedAt = sameRequest ? poolsState.updatedAt : 0;
  const provider = sameRequest ? poolsState.provider : '';
  const error = loading ? '' : sameRequest ? poolsState.error : '';
  const refreshing = loading && pools.length > 0;

  // Each chain/provider pair is read on demand and cached for a minute, so
  // switching tabs does not drag 25 chains' worth of pools into the browser.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchChainPools(selectedChain, {
      source,
      signal: controller.signal,
      force,
    })
      .then((data) => {
        if (!active) return;

        setPoolsState({
          key: `${selectedChain.id}|${source}|${token}`,
          chainId: selectedChain.id,
          requestSource: source,
          provider: data.source,
          pools: data.pools,
          stats: data.stats,
          updatedAt: data.updatedAt,
          error: '',
        });
      })
      .catch((fetchError) => {
        if (!active || fetchError.name === 'AbortError') return;

        console.error(`Failed to load pools for ${selectedChain.name}:`, fetchError);
        // Keep the last good rows on screen when this was a refresh of the same
        // chain and provider; a failed switch must not show the old rows.
        setPoolsState((previous) => {
          const sameTarget =
            previous.chainId === selectedChain.id && previous.requestSource === source;

          return {
            key: `${selectedChain.id}|${source}|${token}`,
            chainId: selectedChain.id,
            requestSource: source,
            provider: sameTarget ? previous.provider : '',
            pools: sameTarget ? previous.pools : EMPTY_POOLS,
            stats: sameTarget ? previous.stats : null,
            updatedAt: sameTarget ? previous.updatedAt : 0,
            error: `Could not load pools for ${selectedChain.name} from ${sourceLabel(source)} right now. Retry in a moment.`,
          };
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedChain, source, token, force]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;

      setQuery((current) => ({ ...current, token: current.token + 1, force: true }));
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // Volume rank stays fixed while the table is sorted by another column, so the
  // number in the first cell keeps meaning "position by 24h volume".
  const rankedPools = useMemo(() => {
    const byVolumeDesc = [...pools].sort((a, b) => (b.volume24h ?? -1) - (a.volume24h ?? -1));

    return byVolumeDesc.map((pool, index) => ({
      ...pool,
      rank: index + 1,
    }));
  }, [pools]);

  const visiblePools = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matched = query
      ? rankedPools.filter((pool) => poolSearchText(pool).includes(query))
      : [...rankedPools];

    matched.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const leftValid = Number.isFinite(left);
      const rightValid = Number.isFinite(right);

      if (!leftValid && !rightValid) return 0;
      if (!leftValid) return 1;
      if (!rightValid) return -1;

      return sort.direction === 'desc' ? right - left : left - right;
    });

    return matched.slice(0, POOLS_PER_CHAIN);
  }, [rankedPools, searchTerm, sort]);

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: 'desc' },
    );
  };

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const showEmpty = !loading && !(error && pools.length === 0) && visiblePools.length === 0;
  const statsPending = !stats;
  const thinCoverage =
    !loading && stats && stats.poolCount > 0 && stats.poolCount < POOLS_PER_CHAIN;
  const providerName =
    provider === 'geckoterminal'
      ? 'GeckoTerminal'
      : provider === 'dexscreener'
        ? 'DexScreener'
        : '';

  return (
    <div className="pools">
      <header className="pools-hero">
        <div>
          <span className="pools-eyebrow">DexScreener · GeckoTerminal</span>
          <h1>Top 100 DEX Pools</h1>
          <p>
            Pick one of the top 25 chains to see its 100 largest pools, ranked by 24-hour trading
            volume.
          </p>
        </div>
        <div className="pools-refresh">
          <span className="refresh-status">
            {loading && pools.length === 0
              ? `Loading ${selectedChain.name}…`
              : refreshing
                ? 'Refreshing…'
                : `Updated ${updatedLabel}`}
            <small>Auto-refreshes every minute</small>
          </span>
          <button
            type="button"
            className="refresh-button"
            onClick={refreshPools}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            Refresh
          </button>
        </div>
      </header>

      <section className="pools-summary" aria-label="Chain totals">
        <div className="summary-card">
          <span className="summary-label">24h volume</span>
          <strong>{statsPending ? '—' : formatUsd(stats.volume24h)}</strong>
          <span className="summary-hint">Top {POOLS_PER_CHAIN} pools on this chain</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Liquidity</span>
          <strong>{statsPending ? '—' : formatUsd(stats.liquidityUsd)}</strong>
          <span className="summary-hint">Across the tracked pools</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Pools loaded</span>
          <strong>{statsPending ? '—' : stats.poolCount}</strong>
          <span className="summary-hint">Up to 100 per chain</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Chains</span>
          <strong>{TOP_CHAINS.length}</strong>
          <span className="summary-hint">Top chains by DEX activity</span>
        </div>
      </section>

      <section className="chain-picker" aria-label="Choose a chain">
        <div className="chain-picker-head">
          <div>
            <h2>Chains</h2>
            <p>Each chain loads its own top {POOLS_PER_CHAIN} pools.</p>
          </div>
          <span
            className="selected-chain"
            style={{ '--chain-color': selectedChain.color }}
            aria-live="polite"
          >
            {selectedChain.name}
          </span>
        </div>

        <div className="chain-tabs" role="group" aria-label="Chains">
          {TOP_CHAINS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === chainId}
              className={`chain-tab${item.id === chainId ? ' is-active' : ''}`}
              onClick={() => {
                if (item.id === chainId) return;

                setQuery((current) => ({
                  ...current,
                  chainId: item.id,
                  token: 0,
                  force: false,
                }));
                setSearchTerm('');
              }}
            >
              <span className="chain-dot" style={{ background: item.color }} aria-hidden="true" />
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <div className="pools-toolbar">
        <p className="pools-toolbar-label">
          Top {POOLS_PER_CHAIN} pools on <strong>{selectedChain.name}</strong>
        </p>

        <div className="pools-controls">
          <label className="source-select">
            <span>Source</span>
            <select
              value={source}
              onChange={(event) => {
                const nextSource = event.target.value;
                if (nextSource === source) return;

                setQuery((current) => ({
                  ...current,
                  source: nextSource,
                  token: 0,
                  force: false,
                }));
              }}
              aria-label="Pool data source"
              title="Auto tries DexScreener first, then GeckoTerminal."
            >
              <option value="auto">Auto</option>
              <option value="dexscreener">DexScreener</option>
              <option value="geckoterminal">GeckoTerminal</option>
            </select>
          </label>

          <div className="pools-search">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search pair, token or DEX"
              aria-label="Search pools"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pools-status">
        <span>
          Showing <strong>{visiblePools.length}</strong>{' '}
          {visiblePools.length === 1 ? 'pool' : 'pools'} on {selectedChain.name}
          {searchTerm.trim() ? ` matching “${searchTerm.trim()}”` : ''}
        </span>
        <span>{providerName ? `${providerName} · ` : ''}Top by 24h volume · USD values</span>
      </div>

      {error && pools.length > 0 && <p className="pools-note is-error">{error}</p>}

      {thinCoverage && (
        <p className="pools-note">
          Only {stats.poolCount} pools were returned for {selectedChain.name}. Coverage varies by
          provider, and quiet chains can have fewer than {POOLS_PER_CHAIN} active pools.
        </p>
      )}

      <div className="pools-table">
        <div className="pools-row pools-head">
          <span className="pools-rank">#</span>
          <span>Pool</span>
          {SORT_COLUMNS.map(({ key, label }) => {
            const active = sort.key === key;

            return (
              <button
                key={key}
                type="button"
                className={`sort-button${active ? ' is-active' : ''}`}
                onClick={() => toggleSort(key)}
                aria-label={`Sort by ${label}${
                  active
                    ? `, currently ${sort.direction === 'desc' ? 'descending' : 'ascending'}`
                    : ''
                }`}
              >
                {label}
                <span className="sort-arrow" aria-hidden="true">
                  {active ? (sort.direction === 'desc' ? '▾' : '▴') : '↕'}
                </span>
              </button>
            );
          })}
        </div>

        {loading && pools.length === 0 && (
          <p className="pools-placeholder">Loading {selectedChain.name} pools…</p>
        )}

        {error && pools.length === 0 && (
          <div className="pools-placeholder">
            <p>{error}</p>
            <button type="button" className="refresh-button" onClick={refreshPools}>
              Try again
            </button>
          </div>
        )}

        {visiblePools.map((pool) => {
          const poolChain = chainOf(pool.chainId);

          return (
            <a
              key={pool.id}
              className="pools-row"
              href={pool.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${pool.baseSymbol}/${pool.quoteSymbol} on ${providerName || 'DexScreener'}`}
            >
              <p className="pools-rank">{pool.rank}</p>

              <div className="pool-cell">
                <TokenIcon pool={pool} color={poolChain.color} />
                <div className="pool-names">
                  <p className="pool-pair">
                    <span>{pool.baseSymbol}</span>
                    <span className="pool-sep">/</span>
                    <span className="pool-quote">{pool.quoteSymbol}</span>
                  </p>
                  <p className="pool-meta">
                    <span
                      className="chain-badge"
                      style={{ '--chain-color': poolChain.color }}
                      title={poolChain.name}
                    >
                      {poolChain.short}
                    </span>
                    <span className="pool-dex">{dexLabel(pool.dexId)}</span>
                  </p>
                </div>
              </div>

              <p className="pools-price">{formatPrice(pool.priceUsd)}</p>
              <p className={`pools-change ${changeClass(pool.change24h)}`}>
                {formatChange(pool.change24h)}
              </p>
              <p className="pools-number">{formatUsd(pool.volume24h)}</p>
              <p className="pools-number pools-liquidity">{formatUsd(pool.liquidityUsd)}</p>
              <p className="pools-number pools-mcap">{formatUsd(pool.marketCap)}</p>
            </a>
          );
        })}

        {showEmpty && (
          <p className="pools-placeholder">
            {searchTerm.trim()
              ? `No pools match “${searchTerm.trim()}”`
              : providerName === 'GeckoTerminal'
                ? `GeckoTerminal has no active pools for ${selectedChain.name}. Try the DexScreener source.`
                : `No pools were returned for ${selectedChain.name} yet.`}
          </p>
        )}
      </div>

      <p className="pools-footer">
        Data from{' '}
        <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer">
          DexScreener
        </a>{' '}
        and{' '}
        <a href="https://www.geckoterminal.com" target="_blank" rel="noopener noreferrer">
          GeckoTerminal
        </a>
        . DexScreener is tried first; GeckoTerminal is the automatic fallback and can also be
        selected directly. Chains are read on demand, and each view ranks up to 100 pools by 24-hour
        trading volume. Prices, volume and liquidity are in USD and refresh every minute. Coverage
        varies by chain, so quieter networks can show fewer than 100 pools.
      </p>
    </div>
  );
};

export default DexPools;
