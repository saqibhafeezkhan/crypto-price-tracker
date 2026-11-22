import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { CHAIN_BY_ID } from '../../constants/dexChains';
import { changeClass, formatPercent, formatUsd, isNumber, nextSort, sortRows } from './format';

const COLUMNS = [
  { key: 'tvl', label: 'TVL', title: 'Total value locked on the chain (DefiLlama chain total)' },
  { key: 'tvlChange24h', label: '24h', title: 'TVL change, last 24 hours' },
  { key: 'tvlChange7d', label: '7d', title: 'TVL change, last 7 days' },
  { key: 'tvlChange30d', label: '30d', title: 'TVL change, last 30 days' },
  { key: 'fees24h', label: 'Fees 24h', title: 'Fees paid by users on this chain, last 24 hours' },
  { key: 'fees30d', label: 'Fees 30d', title: 'Fees paid by users on this chain, last 30 days' },
  { key: 'revenue24h', label: 'Rev 24h', title: 'Protocol revenue on this chain, last 24 hours' },
  { key: 'revenue30d', label: 'Rev 30d', title: 'Protocol revenue on this chain, last 30 days' },
  { key: 'share', label: 'Share', title: 'Share of the combined TVL of the 20 tracked chains' },
];

const SkeletonRows = () => (
  <>
    {Array.from({ length: 8 }, (_, index) => (
      <div key={index} className="defi-row defi-row--skeleton">
        <span className="defi-skeleton" />
        {Array.from({ length: 9 }, (__, cell) => (
          <span key={cell} className="defi-skeleton defi-skeleton--short" />
        ))}
      </div>
    ))}
  </>
);

const ChainSummaryTable = ({ chains, loading, selectedChainId, onSelect }) => {
  const [sort, setSort] = useState({ key: 'tvl', direction: 'desc' });

  const rows = useMemo(() => sortRows(chains, sort), [chains, sort]);

  return (
    <div className="defi-table defi-table--chains">
      <div className="defi-row defi-row--head">
        <span>Chain</span>
        {COLUMNS.map((column) => {
          const active = sort.key === column.key;

          return (
            <button
              key={column.key}
              type="button"
              className={`defi-sort${active ? ' is-active' : ''}`}
              onClick={() => setSort((current) => nextSort(current, column.key))}
              title={column.title}
              aria-label={`Sort by ${column.label}${
                active
                  ? `, currently ${sort.direction === 'desc' ? 'descending' : 'ascending'}`
                  : ''
              }`}
            >
              {column.label}
              <span aria-hidden="true">
                {active ? (sort.direction === 'desc' ? '▾' : '▴') : '↕'}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <SkeletonRows />}

      {!loading &&
        rows.map((chain) => {
          const meta = CHAIN_BY_ID[chain.id] || {};
          const isActive = chain.id === selectedChainId;

          return (
            <div key={chain.id} className={`defi-row${isActive ? ' is-selected' : ''}`}>
              <button
                type="button"
                className="defi-chain-cell"
                onClick={() => onSelect(chain.id)}
                aria-pressed={isActive}
                title={`Show ${chain.name} protocol breakdown`}
              >
                <span
                  className="chain-dot"
                  style={{ background: meta.color || '#8a9dff' }}
                  aria-hidden="true"
                />
                {chain.name}
              </button>

              <span className="num">{formatUsd(chain.tvl)}</span>
              <span className={`num ${changeClass(chain.tvlChange24h)}`}>
                {formatPercent(chain.tvlChange24h)}
              </span>
              <span className={`num ${changeClass(chain.tvlChange7d)}`}>
                {formatPercent(chain.tvlChange7d)}
              </span>
              <span className={`num ${changeClass(chain.tvlChange30d)}`}>
                {formatPercent(chain.tvlChange30d)}
              </span>
              <span className="num">{formatUsd(chain.fees24h)}</span>
              <span className="num">{formatUsd(chain.fees30d)}</span>
              <span className="num">{formatUsd(chain.revenue24h)}</span>
              <span className="num">{formatUsd(chain.revenue30d)}</span>
              <span className="num">
                {isNumber(chain.share) ? `${chain.share.toFixed(1)}%` : 'n/a'}
              </span>
            </div>
          );
        })}
    </div>
  );
};

ChainSummaryTable.propTypes = {
  chains: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  selectedChainId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

export default ChainSummaryTable;
