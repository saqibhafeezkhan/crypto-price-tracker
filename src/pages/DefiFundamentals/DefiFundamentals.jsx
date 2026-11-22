import { useEffect, useMemo, useState } from 'react';
import './DefiFundamentals.css';
import { useCoin } from '../../context/coinContext';
import { DEFI_CHAINS, categoryLabel } from '../../constants/defiChains';
import {
  fetchDefiChain,
  fetchDefiSummary,
  isSnapshotStale,
  snapshotAgeMs,
} from '../../services/defiFundamentals';
import ChainSummaryTable from './ChainSummaryTable';
import ProtocolTable from './ProtocolTable';
import TvlFeesChart from './TvlFeesChart';
import { formatAge, formatDateTime, formatPercent, formatUsd, isNumber, sortRows } from './format';

const RANK_OPTIONS = [
  { id: 'tvl', label: 'TVL' },
  { id: 'fees30d', label: 'Fees' },
  { id: 'revenue30d', label: 'Revenue' },
];
const CHART_RANGES = [
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 365, label: '365D' },
];
const TOP_ROWS = 10;

const DefiFundamentals = () => {
  const { allCoin, currency } = useCoin();
  const [reloadToken, setReloadToken] = useState(0);
  const [summaryState, setSummaryState] = useState({ key: '', data: null, error: '' });
  const [chainState, setChainState] = useState({ key: '', data: null, error: '' });

  const [category, setCategory] = useState('all');
  const [rankBy, setRankBy] = useState('tvl');
  const [selectedChainId, setSelectedChainId] = useState('');
  const [chartDays, setChartDays] = useState(90);

  const summaryKey = String(reloadToken);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchDefiSummary({ signal: controller.signal, force: reloadToken > 0 })
      .then((data) => {
        if (active) setSummaryState({ key: summaryKey, data, error: '' });
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return;

        console.error('Failed to load the DeFi fundamentals snapshot:', error);
        setSummaryState({
          key: summaryKey,
          data: null,
          error: 'Could not load the DeFi fundamentals snapshot. Try again in a moment.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken, summaryKey]);

  const summary = summaryState.data;
  const loadingSummary = summaryState.key !== summaryKey;
  const summaryError = loadingSummary ? '' : summaryState.error;

  const chains = useMemo(() => summary?.chains || [], [summary]);
  const protocols = useMemo(() => summary?.protocols || [], [summary]);

  const activeChainId = selectedChainId || chains[0]?.id || DEFI_CHAINS[0].id;
  const chainKey = `${activeChainId}|${reloadToken}`;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const key = `${activeChainId}|${reloadToken}`;

    fetchDefiChain(activeChainId, { signal: controller.signal, force: reloadToken > 0 })
      .then((data) => {
        if (active) setChainState({ key, data, error: '' });
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return;

        console.error(`Failed to load the ${activeChainId} DeFi snapshot:`, error);
        setChainState({ key, data: null, error: `Could not load the ${activeChainId} breakdown.` });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeChainId, reloadToken]);

  const loadingChain = chainState.key !== chainKey;
  const chainDetail = loadingChain ? null : chainState.data;
  const chainError = loadingChain ? '' : chainState.error;

  const activeChain = chains.find((chain) => chain.id === activeChainId) || chainDetail?.chain;
  const chainMeta = DEFI_CHAINS.find((chain) => chain.id === activeChainId);

  const meta = summary?.meta;
  const stale = meta ? isSnapshotStale(meta) : false;

  const categories = useMemo(() => (summary?.categories || []).filter(Boolean), [summary]);

  const leaderboard = useMemo(
    () =>
      sortRows(
        protocols.filter(
          (row) =>
            (category === 'all' || row.category === category) &&
            isNumber(row[rankBy]) &&
            row[rankBy] > 0,
        ),
        { key: rankBy, direction: 'desc' },
      ).slice(0, TOP_ROWS),
    [protocols, category, rankBy],
  );

  const chainRows = useMemo(
    () =>
      sortRows(
        (chainDetail?.protocols || []).filter(
          (row) => category === 'all' || row.category === category,
        ),
        { key: 'tvl', direction: 'desc' },
      ).slice(0, TOP_ROWS),
    [chainDetail, category],
  );

  const coins = (allCoin || []).slice(0, 100);
  const reload = () => setReloadToken((current) => current + 1);

  return (
    <div className="defi">
      <header className="defi-hero">
        <div>
          <span className="defi-eyebrow">DefiLlama · Fees &amp; revenue</span>
          <h1>DeFi Fundamentals</h1>
          <p>
            Which protocols and chains earn real economic activity. Fees and revenue sit beside TVL,
            so a chain holding the most value is not mistaken for the one doing the most business.
          </p>
        </div>

        <div className="defi-meta">
          <span className="defi-meta-line">
            Data as of {meta ? formatDateTime(meta.generatedAt) : '—'}
            {meta && <small>{formatAge(snapshotAgeMs(meta))}</small>}
          </span>
          <span className="defi-meta-source">
            Source:{' '}
            <a href="https://defillama.com" target="_blank" rel="noopener noreferrer">
              DefiLlama
            </a>
          </span>
          <button type="button" className="defi-button" onClick={reload} disabled={loadingSummary}>
            {loadingSummary ? 'Loading…' : 'Reload data'}
          </button>
        </div>
      </header>

      {stale && (
        <p className="defi-note defi-note--stale">
          Showing the last cached snapshot. It is older than the usual refresh window, so these
          numbers may have moved.
        </p>
      )}

      {summaryError && (
        <div className="defi-error">
          <p>{summaryError}</p>
          <button type="button" className="defi-button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      <section className="defi-summary" aria-label="Totals across tracked chains">
        <div className="defi-card">
          <span className="defi-card-label">
            TVL · {chains.length || DEFI_CHAINS.length} chains
          </span>
          <strong>{loadingSummary ? '—' : formatUsd(summary?.totals?.tvl)}</strong>
          <span className="defi-card-hint">DefiLlama chain totals, no double counting</span>
        </div>
        <div className="defi-card">
          <span className="defi-card-label">Fees · 30d</span>
          <strong>{loadingSummary ? '—' : formatUsd(summary?.totals?.fees30d)}</strong>
          <span className="defi-card-hint">Paid by users across the tracked chains</span>
        </div>
        <div className="defi-card">
          <span className="defi-card-label">Revenue · 30d</span>
          <strong>{loadingSummary ? '—' : formatUsd(summary?.totals?.revenue30d)}</strong>
          <span className="defi-card-hint">Kept by protocols and token holders</span>
        </div>
        <div className="defi-card">
          <span className="defi-card-label">Protocols tracked</span>
          <strong>{loadingSummary ? '—' : (meta?.protocolsTracked ?? 'n/a')}</strong>
          <span className="defi-card-hint">Sorted leaderboard pool</span>
        </div>
      </section>

      <section className="defi-section" aria-labelledby="defi-chains-heading">
        <div className="defi-section-head">
          <div>
            <h2 id="defi-chains-heading">Chain summary</h2>
            <p>
              The 20 tracked chains, ranked by TVL. Click a chain to open its protocol breakdown.
            </p>
          </div>
        </div>

        <div className="defi-table-scroll">
          <ChainSummaryTable
            chains={chains}
            loading={loadingSummary}
            selectedChainId={activeChainId}
            onSelect={setSelectedChainId}
          />
        </div>
      </section>

      <section className="defi-section" aria-labelledby="defi-leaderboard-heading">
        <div className="defi-section-head">
          <div>
            <h2 id="defi-leaderboard-heading">Protocol leaderboard</h2>
            <p>
              Top 10 across all chains, ranked by what a protocol holds or earns. Only protocols
              that report the selected metric are listed, and the table shows just that metric.
            </p>
          </div>

          <div className="defi-controls">
            <label className="defi-select">
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <div className="defi-toggle" role="group" aria-label="Rank protocols by">
              {RANK_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={rankBy === option.id ? 'is-active' : ''}
                  onClick={() => setRankBy(option.id)}
                  aria-pressed={rankBy === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="defi-table-scroll">
          <ProtocolTable
            rows={leaderboard}
            limit={TOP_ROWS}
            coins={coins}
            currencySymbol={currency.symbol}
            showChains
            metric={rankBy}
            loading={loadingSummary}
            emptyLabel="No protocols match this category."
          />
        </div>
      </section>

      <section className="defi-section" aria-labelledby="defi-drilldown-heading">
        <div className="defi-section-head">
          <div>
            <h2 id="defi-drilldown-heading">Chain drill-down</h2>
            <p>
              Only this chain&apos;s portion of each protocol&apos;s TVL and fees. Chain totals come
              from DefiLlama&apos;s chain endpoints, not from summing the rows below.
            </p>
          </div>

          <div className="defi-controls">
            <label className="defi-select">
              <span>Chain</span>
              <select
                value={activeChainId}
                onChange={(event) => setSelectedChainId(event.target.value)}
                aria-label="Choose a chain"
              >
                {(chains.length > 0 ? chains : DEFI_CHAINS).map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="defi-toggle" role="group" aria-label="Chart window">
              {CHART_RANGES.map((range) => (
                <button
                  key={range.days}
                  type="button"
                  className={chartDays === range.days ? 'is-active' : ''}
                  onClick={() => setChartDays(range.days)}
                  aria-pressed={chartDays === range.days}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeChain && (
          <div className="defi-chain-stats">
            <span
              className="defi-chain-name"
              style={{ '--chain-color': chainMeta?.color || '#8a9dff' }}
            >
              <span className="chain-dot" style={{ background: chainMeta?.color || '#8a9dff' }} />
              {activeChain.name}
            </span>
            <span>
              TVL <strong>{formatUsd(activeChain.tvl)}</strong>
            </span>
            <span
              className={
                isNumber(activeChain.tvlChange30d)
                  ? activeChain.tvlChange30d > 0
                    ? 'is-up'
                    : 'is-down'
                  : ''
              }
            >
              30d TVL <strong>{formatPercent(activeChain.tvlChange30d)}</strong>
            </span>
            <span>
              Fees 30d <strong>{formatUsd(activeChain.fees30d)}</strong>
            </span>
            <span>
              Revenue 30d <strong>{formatUsd(activeChain.revenue30d)}</strong>
            </span>
            <span>
              Share{' '}
              <strong>
                {activeChain.share != null ? `${activeChain.share.toFixed(1)}%` : 'n/a'}
              </strong>
            </span>
          </div>
        )}

        {chainError && <p className="defi-note defi-note--error">{chainError}</p>}

        <div className="defi-table-scroll">
          <ProtocolTable
            rows={chainRows}
            limit={TOP_ROWS}
            coins={coins}
            currencySymbol={currency.symbol}
            loading={loadingChain}
            emptyLabel={`No protocols match this category on ${activeChain?.name || activeChainId}.`}
          />
        </div>

        <div className="defi-chart-wrap">
          {chainDetail ? (
            <TvlFeesChart series={chainDetail.series} days={chartDays} />
          ) : (
            <div className="defi-chart-placeholder">
              {chainError ? 'No chart data.' : 'Loading chart…'}
            </div>
          )}
        </div>
      </section>

      <footer className="defi-footer">
        <h2>How to read this page</h2>
        <dl>
          <div>
            <dt>Fees</dt>
            <dd>
              Everything users pay to use a protocol: swap, borrow, bridge and liquidation fees.
            </dd>
          </div>
          <div>
            <dt>Revenue</dt>
            <dd>
              The part the protocol or its token holders keep, as defined by DefiLlama. Fees that go
              to liquidity providers or validators are not revenue. The two are never merged.
            </dd>
          </div>
          <div>
            <dt>Annualized</dt>
            <dd>30-day value × 365/30. An estimate, used only for the P/F ratio.</dd>
          </div>
          <div>
            <dt>Fees/TVL · Rev/TVL</dt>
            <dd>
              30-day fees or revenue divided by current TVL. Higher means more real usage per dollar
              locked.
            </dd>
          </div>
          <div>
            <dt>P/F</dt>
            <dd>
              Market cap divided by annualized fees, shown only when the protocol token is in the
              app&apos;s top-100 coins dataset. The token price beside it comes from that dataset.
            </dd>
          </div>
          <div>
            <dt>Mercenary capital?</dt>
            <dd>
              TVL rose while fees fell over 30 days. Capital may be there for yield, not usage.
            </dd>
          </div>
          <div>
            <dt>Organic demand</dt>
            <dd>Fees rose while TVL was flat or down over 30 days. Suggests usage, not inflow.</dd>
          </div>
        </dl>

        <p className="defi-footer-note">
          Snapshots are built every {meta?.refreshIntervalMinutes ?? 60} minutes by a scheduled job
          and served as static JSON; DefiLlama is never called from this page. Chain TVL on the free
          API already excludes liquid staking and double-counted TVL, so no gross-variant toggle is
          offered. 30-day protocol TVL changes are collected for a bounded set of protocols to keep
          the refresh cheap; rows without one show n/a.
        </p>
      </footer>
    </div>
  );
};

export default DefiFundamentals;
