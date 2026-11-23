import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CHAIN_BY_ID } from '../../constants/dexChains';
import { categoryLabel } from '../../constants/defiChains';
import { DIVERGENCE, divergenceFlag, priceToFees, ratio } from '../../services/defiMetrics';
import {
  changeClass,
  formatPercent,
  formatRatio,
  formatShareRatio,
  formatTokenPrice,
  formatUsd,
  isNumber,
  NOT_AVAILABLE,
} from './format';

const chainSummary = (protocol) => {
  const names = (protocol.chains || [])
    .map((chainId) => CHAIN_BY_ID[chainId]?.name)
    .filter(Boolean);

  if (names.length === 0) {
    return protocol.chainCount ? `${protocol.chainCount} chains` : NOT_AVAILABLE;
  }

  const extra = (protocol.chainCount || names.length) - names.length;
  return extra > 0 ? `${names.slice(0, 2).join(', ')} +${extra}` : names.join(', ');
};

const SkeletonRows = ({ rows, showChains, valueColumns }) => (
  <>
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="defi-row defi-row--skeleton">
        <span className="defi-skeleton defi-skeleton--small" />
        <span className="defi-skeleton" />
        {showChains && <span className="defi-skeleton defi-skeleton--short" />}
        {Array.from({ length: valueColumns }, (__, cell) => (
          <span key={cell} className="defi-skeleton defi-skeleton--short" />
        ))}
      </div>
    ))}
  </>
);

const ProtocolTable = ({
  rows,
  limit,
  coins,
  currencySymbol,
  showChains = false,
  metric = 'tvl',
  loading = false,
  emptyLabel = 'No protocols to show.',
  caption,
}) => {
  const coinBySymbol = useMemo(() => {
    const map = new Map();
    for (const coin of coins || []) {
      if (coin?.symbol) map.set(String(coin.symbol).toUpperCase(), coin);
    }
    return map;
  }, [coins]);

  const decorated = useMemo(
    () =>
      rows.map((row) => {
        const coin = row.symbol ? coinBySymbol.get(String(row.symbol).toUpperCase()) : null;
        const marketCap = isNumber(row.mcap)
          ? row.mcap
          : currencySymbol === '$' && isNumber(coin?.market_cap)
            ? coin.market_cap
            : null;

        return {
          ...row,
          coin,
          feesToTvl: ratio(row.fees30d, row.tvl),
          revenueToTvl: ratio(row.revenue30d, row.tvl),
          priceToFees: coin ? priceToFees(marketCap, row.fees30d) : null,
          flag: divergenceFlag(row.tvlChange30d, row.feesChange30d),
        };
      }),
    [rows, coinBySymbol, currencySymbol],
  );

  const visible = decorated.slice(0, limit);

  // The leaderboard mirrors the active ranking: TVL shows only TVL columns,
  // Fees only fee columns and Revenue only revenue columns. The chain view
  // keeps the full breakdown.
  const view = showChains ? metric : 'all';
  const showTvl = view === 'all' || view === 'tvl';
  const showFees = view === 'all' || view === 'fees30d';
  const showRevenue = view === 'all' || view === 'revenue30d';
  const valueColumns = showTvl
    ? 4 + (showFees ? 5 : 0) + (showRevenue ? 4 : 0)
    : (showFees ? 5 : 0) + (showRevenue ? 4 : 0);

  return (
    <div
      className={`defi-table defi-table--protocols${
        showChains ? ` is-rank-${metric}` : ' is-chain-view'
      }`}
    >
      {caption && <p className="defi-table-caption">{caption}</p>}

      <div className="defi-row defi-row--head">
        <span>#</span>
        <span>Protocol</span>
        {showChains && <span>Chains</span>}
        {showTvl && (
          <>
            <span className="num">TVL</span>
            <span className="num" title="TVL change over the last 24 hours">
              24h
            </span>
            <span className="num" title="TVL change over the last 7 days">
              7d
            </span>
            <span className="num" title="TVL change over the last 30 days">
              30d
            </span>
          </>
        )}
        {showFees && (
          <>
            <span className="num" title="Fees paid by users, last 24 hours">
              Fees 24h
            </span>
            <span className="num" title="Fees paid by users, last 7 days">
              7d
            </span>
            <span className="num" title="Fees paid by users, last 30 days">
              30d
            </span>
            <span className="num" title="30-day fees divided by current TVL">
              Fees/TVL
            </span>
            <span className="num" title="Market cap divided by annualized (30d × 365/30) fees">
              P/F
            </span>
          </>
        )}
        {showRevenue && (
          <>
            <span className="num" title="Protocol revenue, last 24 hours">
              Rev 24h
            </span>
            <span className="num" title="Protocol revenue, last 7 days">
              7d
            </span>
            <span className="num" title="Protocol revenue, last 30 days">
              30d
            </span>
            <span className="num" title="30-day revenue divided by current TVL">
              Rev/TVL
            </span>
          </>
        )}
      </div>

      {loading && <SkeletonRows rows={limit} showChains={showChains} valueColumns={valueColumns} />}

      {!loading && visible.length === 0 && <p className="defi-placeholder">{emptyLabel}</p>}

      {!loading &&
        visible.map((row, index) => (
          <div key={`${row.slug}-${index}`} className="defi-row">
            <span className="defi-rank">{index + 1}</span>

            <div className="defi-protocol">
              <p className="defi-protocol-name">
                {row.name}
                {row.symbol && <span className="defi-symbol">{row.symbol}</span>}
              </p>
              <div className="defi-protocol-meta">
                <span className="defi-category-pill">{categoryLabel(row.category)}</span>
                {row.flag && (
                  <span
                    className={`defi-badge defi-badge--${row.flag}`}
                    title={DIVERGENCE[row.flag].title}
                    aria-label={DIVERGENCE[row.flag].title}
                  >
                    {DIVERGENCE[row.flag].label}
                  </span>
                )}
              </div>
            </div>

            {showChains && (
              <span
                className="defi-chains"
                data-label="Chains"
                title={(row.chains || []).join(', ')}
              >
                {chainSummary(row)}
              </span>
            )}

            {showTvl && (
              <>
                <span className="num" data-label="TVL">
                  {formatUsd(row.tvl)}
                </span>
                <span className={`num ${changeClass(row.tvlChange24h)}`} data-label="24h">
                  {formatPercent(row.tvlChange24h)}
                </span>
                <span className={`num ${changeClass(row.tvlChange7d)}`} data-label="7d">
                  {formatPercent(row.tvlChange7d)}
                </span>
                <span className={`num ${changeClass(row.tvlChange30d)}`} data-label="30d">
                  {formatPercent(row.tvlChange30d)}
                </span>
              </>
            )}

            {showFees && (
              <>
                <span className="num" data-label="Fees 24h">
                  {formatUsd(row.fees24h)}
                </span>
                <span className="num" data-label="Fees 7d">
                  {formatUsd(row.fees7d)}
                </span>
                <span className="num" data-label="Fees 30d">
                  {formatUsd(row.fees30d)}
                </span>
                <span className="num" data-label="Fees/TVL">
                  {formatShareRatio(row.feesToTvl)}
                </span>
                <span
                  className="num defi-pf"
                  data-label="P/F"
                  title={
                    row.coin
                      ? 'Market cap ÷ annualized 30d fees. Token price from the app price data.'
                      : 'Token is not in the app top-100 dataset, so P/F is not shown.'
                  }
                >
                  {formatRatio(row.priceToFees)}
                  {row.coin && (
                    <small className="defi-token-price">
                      {formatTokenPrice(row.coin.current_price, currencySymbol)}
                    </small>
                  )}
                </span>
              </>
            )}

            {showRevenue && (
              <>
                <span className="num" data-label="Rev 24h">
                  {formatUsd(row.revenue24h)}
                </span>
                <span className="num" data-label="Rev 7d">
                  {formatUsd(row.revenue7d)}
                </span>
                <span className="num" data-label="Rev 30d">
                  {formatUsd(row.revenue30d)}
                </span>
                <span className="num" data-label="Rev/TVL">
                  {formatShareRatio(row.revenueToTvl)}
                </span>
              </>
            )}
          </div>
        ))}
    </div>
  );
};

ProtocolTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  limit: PropTypes.number,
  coins: PropTypes.arrayOf(PropTypes.object),
  currencySymbol: PropTypes.string,
  showChains: PropTypes.bool,
  metric: PropTypes.oneOf(['tvl', 'fees30d', 'revenue30d']),
  loading: PropTypes.bool,
  emptyLabel: PropTypes.string,
  caption: PropTypes.string,
};

export default ProtocolTable;
