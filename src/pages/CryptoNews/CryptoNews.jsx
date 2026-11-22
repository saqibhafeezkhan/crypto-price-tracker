import { useEffect, useMemo, useState } from 'react';
import './CryptoNews.css';
import {
  NEWS_CATEGORIES,
  NEWS_SCORING,
  NEWS_SOURCES,
  NEWS_WINDOWS,
  NEWS_REFRESH_MINUTES,
} from '../../constants/news';
import { TOP_CHAINS } from '../../constants/dexChains';
import { TOP_COINS } from '../../constants/topCoins';
import { fetchCryptoNews, isNewsStale } from '../../services/cryptoNews';
import { rankItems } from '../../services/newsRank';
import NewsCard from './NewsCard';
import { formatAbsolute, formatRelative } from './format';

const REFRESH_COOLDOWN_MS = 60 * 1000;
const refreshLabel = (minutes) =>
  minutes % 60 === 0 ? `${minutes / 60}-hour` : `${minutes}-minute`;
const COIN_NAMES = new Map(TOP_COINS.map((coin) => [coin.symbol?.toLowerCase(), coin.name]));
const CHAIN_ORDER = new Map(TOP_CHAINS.map((chain, index) => [chain.id, index]));

const CryptoNews = () => {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState({ key: '', data: null, error: '', fromCache: false });
  const [category, setCategory] = useState('all');
  const [coin, setCoin] = useState('');
  const [chain, setChain] = useState('');
  const [windowId, setWindowId] = useState('24h');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const fetchKey = String(reloadToken);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchCryptoNews({ signal: controller.signal, force: reloadToken > 0 })
      .then(({ data, fromCache }) => {
        if (active) setState({ key: fetchKey, data, error: '', fromCache });
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return;

        console.error('Failed to load the crypto news snapshot:', error);
        setState((previous) => ({
          key: fetchKey,
          // Keep whatever was already on screen rather than blanking the page.
          data: previous.data,
          error: previous.data
            ? 'The refresh failed, so this is the last snapshot we could load.'
            : 'Could not load the news snapshot. The scheduled job may not have run yet.',
          fromCache: Boolean(previous.data),
        }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, fetchKey]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // The countdown is state, not a Date.now() call during render, so re-renders
  // stay pure and the button label still updates every second.
  useEffect(() => {
    if (cooldownUntil <= 0) return undefined;

    const timer = setInterval(() => {
      const left = Math.max(0, cooldownUntil - Date.now());
      setCooldownLeft(left);
      if (left === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const loading = state.key !== fetchKey;
  const data = state.data;
  const items = useMemo(() => data?.items || [], [data]);
  const meta = data?.meta;

  const coinOptions = useMemo(() => {
    const counts = new Map();
    for (const item of items) {
      for (const symbol of item.tags?.coins || []) {
        counts.set(symbol, (counts.get(symbol) || 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 40)
      .map(([symbol, count]) => ({
        symbol,
        count,
        name: COIN_NAMES.get(symbol) || symbol.toUpperCase(),
      }));
  }, [items]);

  const chainOptions = useMemo(() => {
    const counts = new Map();
    for (const item of items) {
      for (const id of item.tags?.chains || []) counts.set(id, (counts.get(id) || 0) + 1);
    }

    return [...counts.entries()]
      .sort(
        (left, right) =>
          (CHAIN_ORDER.get(left[0]) ?? 99) - (CHAIN_ORDER.get(right[0]) ?? 99) ||
          right[1] - left[1],
      )
      .map(([id, count]) => ({
        id,
        count,
        name: TOP_CHAINS.find((entry) => entry.id === id)?.name || id,
      }));
  }, [items]);

  const activeWindow = NEWS_WINDOWS.find((option) => option.id === windowId) || NEWS_WINDOWS[2];

  const ranked = useMemo(() => {
    const filtered = items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (coin && !(item.tags?.coins || []).includes(coin)) return false;
      if (chain && !(item.tags?.chains || []).includes(chain)) return false;
      return true;
    });

    return rankItems(filtered, { now, windowHours: activeWindow.hours });
  }, [items, category, coin, chain, now, activeWindow.hours]);

  const filtersActive = category !== 'all' || Boolean(coin) || Boolean(chain);
  const stale = data ? state.fromCache || isNewsStale(meta, now) : false;
  const sources = meta?.sources || NEWS_SOURCES.map((source) => ({ ...source, ok: true }));
  const cryptoPanic = meta?.adapters?.cryptopanic;
  const showCryptoPanic = Boolean(
    cryptoPanic?.enabled && cryptoPanic?.ok && (cryptoPanic.matched > 0 || cryptoPanic.signals > 0),
  );
  const ranking = meta?.ranking || NEWS_SCORING;

  const clearFilters = () => {
    setCategory('all');
    setCoin('');
    setChain('');
  };

  const refresh = () => {
    if (cooldownLeft > 0 || loading) return;
    setCooldownUntil(Date.now() + REFRESH_COOLDOWN_MS);
    setCooldownLeft(REFRESH_COOLDOWN_MS);
    setReloadToken((value) => value + 1);
  };

  return (
    <div className="news">
      <header className="news-hero">
        <div>
          <span className="news-eyebrow">Publisher feeds · Headlines only</span>
          <h1>Crypto News</h1>
          <p>
            The 20 stories shaping crypto right now, tagged to the coins and chains this app tracks.
            Every headline opens the original publisher in a new tab.
          </p>
        </div>

        <div className="news-meta">
          <span className="news-updated">
            {meta ? (
              <>
                Updated {formatRelative(meta.generatedAt, now)}
                <small>{formatAbsolute(meta.generatedAt)}</small>
              </>
            ) : (
              'Not loaded yet'
            )}
          </span>
          <button
            type="button"
            className="news-button"
            onClick={refresh}
            disabled={loading || cooldownLeft > 0}
            title={`Reloads the published snapshot. The feed job runs every ${refreshLabel(
              meta?.refreshIntervalMinutes || NEWS_REFRESH_MINUTES,
            )}.`}
          >
            {loading
              ? 'Refreshing…'
              : cooldownLeft > 0
                ? `Refresh in ${Math.ceil(cooldownLeft / 1000)}s`
                : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="news-sourcebar">
        <span className="news-sourcebar-label">Sources</span>
        <div className="news-source-list">
          {sources.map((source) => (
            <a
              key={source.id || source.name}
              href={source.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className={`news-source-pill${source.ok === false ? ' is-down' : ''}`}
              title={
                source.ok === false
                  ? `Last fetch failed: ${source.error || 'unknown error'}`
                  : `${source.name}${source.itemCount != null ? ` · ${source.itemCount} items` : ''}`
              }
            >
              <span className="news-source-dot" />
              {source.name}
            </a>
          ))}
          {showCryptoPanic && (
            <a
              className="news-source-pill news-source-pill--powered"
              href={cryptoPanic.attributionUrl || 'https://cryptopanic.com'}
              target="_blank"
              rel="noopener noreferrer"
            >
              {cryptoPanic.attribution || 'Powered by CryptoPanic'}
            </a>
          )}
        </div>
      </div>

      {stale && (
        <p className="news-note news-note--stale">
          {state.fromCache
            ? 'Live refresh failed, so this is the last cached snapshot. It may be out of date.'
            : `This snapshot is older than the usual ${refreshLabel(
                NEWS_REFRESH_MINUTES,
              )} refresh window.`}{' '}
          {meta ? `Built ${formatRelative(meta.generatedAt, now)}.` : ''}
        </p>
      )}

      {state.error && (
        <div className="news-note news-note--error">
          <span>{state.error}</span>
          <button
            type="button"
            className="news-button"
            onClick={refresh}
            disabled={cooldownLeft > 0}
          >
            Try again
          </button>
        </div>
      )}

      <section className="news-toolbar" aria-label="News filters">
        <label className="news-select">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {NEWS_CATEGORIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="news-select">
          <span>Coin</span>
          <select value={coin} onChange={(event) => setCoin(event.target.value)}>
            <option value="">All coins</option>
            {coinOptions.map((option) => (
              <option key={option.symbol} value={option.symbol}>
                {option.name} ({option.symbol.toUpperCase()})
              </option>
            ))}
          </select>
        </label>

        <label className="news-select">
          <span>Chain</span>
          <select value={chain} onChange={(event) => setChain(event.target.value)}>
            <option value="">All chains</option>
            {chainOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <div className="news-toggle" role="group" aria-label="Time window">
          {NEWS_WINDOWS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={windowId === option.id ? 'is-active' : ''}
              onClick={() => setWindowId(option.id)}
              aria-pressed={windowId === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filtersActive && (
          <button type="button" className="news-clear" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </section>

      <div className="news-layout">
        <section className="news-main" aria-labelledby="news-list-heading">
          <div className="news-list-head">
            <h2 id="news-list-heading">
              Top {ranking.topCount || 20} · last {activeWindow.label}
            </h2>
            <span>
              {ranked.length} {ranked.length === 1 ? 'story' : 'stories'}
              {filtersActive ? ' after filters' : ''}
            </span>
          </div>

          {loading && !data && (
            <div className="news-list" aria-busy="true" aria-label="Loading headlines">
              {Array.from({ length: 5 }, (_, index) => (
                <div className="news-skeleton" key={index}>
                  <span className="news-skeleton-line news-skeleton-line--short" />
                  <span className="news-skeleton-line" />
                  <span className="news-skeleton-line news-skeleton-line--meta" />
                </div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="news-empty">
              No headlines are in the snapshot yet. The scheduled refresh may not have run; try
              again in a few minutes.
            </p>
          )}

          {items.length > 0 && ranked.length === 0 && (
            <div className="news-empty">
              <p>No stories match these filters in the last {activeWindow.label.toLowerCase()}.</p>
              <div className="news-empty-actions">
                {windowId !== '7d' && (
                  <button type="button" className="news-button" onClick={() => setWindowId('7d')}>
                    Search the last 7 days
                  </button>
                )}
                {filtersActive && (
                  <button type="button" className="news-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          {ranked.length > 0 && (
            <ol className="news-list">
              {ranked.map((item) => (
                <li key={item.id}>
                  <NewsCard
                    item={item}
                    now={now}
                    activeCoin={coin}
                    activeChain={chain}
                    onCoin={(symbol) => setCoin((current) => (current === symbol ? '' : symbol))}
                    onChain={(id) => setChain((current) => (current === id ? '' : id))}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="news-sidebar">
          <section className="news-panel">
            <h2>Trending tags · 24h</h2>
            <p className="news-panel-hint">Most-mentioned tracked assets across the last day.</p>

            {data?.trending?.coins?.length > 0 && (
              <div className="news-trendgroup">
                <span className="news-trendlabel">Coins</span>
                <div className="news-trendlist">
                  {data.trending.coins.map((entry) => (
                    <button
                      key={entry.symbol}
                      type="button"
                      className={`news-chip${coin === entry.symbol ? ' is-active' : ''}`}
                      onClick={() =>
                        setCoin((current) => (current === entry.symbol ? '' : entry.symbol))
                      }
                      aria-pressed={coin === entry.symbol}
                      title={entry.name}
                    >
                      ${entry.symbol.toUpperCase()}
                      <span className="news-chip-count">{entry.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data?.trending?.chains?.length > 0 && (
              <div className="news-trendgroup">
                <span className="news-trendlabel">Chains</span>
                <div className="news-trendlist">
                  {data.trending.chains.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={`news-chip news-chip--chain${chain === entry.id ? ' is-active' : ''}`}
                      onClick={() => setChain((current) => (current === entry.id ? '' : entry.id))}
                      aria-pressed={chain === entry.id}
                      title={entry.name}
                    >
                      <span
                        className="news-chain-dot"
                        style={{
                          background:
                            TOP_CHAINS.find((item) => item.id === entry.id)?.color || '#8a9dff',
                        }}
                      />
                      {entry.name}
                      <span className="news-chip-count">{entry.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!data?.trending?.coins?.length && !data?.trending?.chains?.length && (
              <p className="news-panel-hint">No tagged stories in the last 24 hours.</p>
            )}
          </section>

          <section className="news-panel">
            <h2>How ranking works</h2>
            <p className="news-panel-hint">
              Recency (half-life {ranking.recencyHalfLifeHours}h) + coverage + publisher trust +
              tracked-asset match + optional sentiment and importance. At most{' '}
              {ranking.topCount || 20} stories, and never more than {ranking.perSourceLimit || 6}{' '}
              from one publisher.
            </p>
            {meta && (
              <dl className="news-stats">
                <div>
                  <dt>Stories kept</dt>
                  <dd>{meta.totalItems}</dd>
                </div>
                <div>
                  <dt>Archive</dt>
                  <dd>{meta.archiveDays}d</dd>
                </div>
                <div>
                  <dt>Refresh</dt>
                  <dd>{meta.refreshIntervalMinutes} min</dd>
                </div>
              </dl>
            )}
          </section>
        </aside>
      </div>

      <footer className="news-footer">
        <h2>About this page</h2>
        <p>
          Headlines, source names, timestamps, links and short publisher summaries only. Article
          text is never copied and images are not hotlinked. Every title links to the original
          publisher; filtering and ranking happen in your browser from a snapshot built every{' '}
          {refreshLabel(meta?.refreshIntervalMinutes || NEWS_REFRESH_MINUTES)}.
        </p>
        <p>
          Category tags come from keyword rules, and coin/chain tags match the app&apos;s top-100
          coin list and top-25 chain list. Sentiment is shown only when a supported API supplies it;
          it is never inferred.
        </p>
      </footer>
    </div>
  );
};

export default CryptoNews;
