import { categoryLabel } from '../../constants/news';
import { CHAIN_BY_ID } from '../../constants/dexChains';
import { TOP_COINS } from '../../constants/topCoins';
import { formatAbsolute, formatRelative } from './format';

const COIN_NAMES = new Map(TOP_COINS.map((coin) => [coin.symbol?.toLowerCase(), coin.name]));
const SENTIMENT_LABELS = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

const NewsCard = ({ item, now, activeCoin, activeChain, onCoin, onChain }) => {
  const coverage = (item.coverage || []).map((entry) => entry.source).join(', ');
  const sentiment = item.sentiment ? SENTIMENT_LABELS[item.sentiment] : '';

  return (
    <article className="news-item">
      <span className="news-item-rank" aria-label={`Rank ${item.rank}`}>
        {item.rank ?? '·'}
      </span>

      <div className="news-item-body">
        <div className="news-item-flags">
          <span className={`news-category news-category--${item.category}`}>
            {categoryLabel(item.category)}
          </span>
          {item.sourceCount > 1 && (
            <span
              className="news-badge"
              title={coverage ? `Also covered by: ${coverage}` : undefined}
            >
              Covered by {item.sourceCount} sources
            </span>
          )}
          {sentiment && (
            <span className={`news-badge news-badge--${item.sentiment}`}>{sentiment}</span>
          )}
        </div>

        <h3 className="news-title">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>

        <p className="news-byline">
          <span className="news-source">{item.source}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.publishedAt} title={formatAbsolute(item.publishedAt)}>
            {formatRelative(item.publishedAt, now)}
          </time>
        </p>

        {item.snippet && <p className="news-snippet">{item.snippet}</p>}

        {(item.tags?.coins?.length > 0 || item.tags?.chains?.length > 0) && (
          <div className="news-tags" aria-label="Tagged assets">
            {item.tags.coins.map((symbol) => (
              <button
                key={`coin-${symbol}`}
                type="button"
                className={`news-chip${activeCoin === symbol ? ' is-active' : ''}`}
                onClick={() => onCoin(symbol)}
                aria-pressed={activeCoin === symbol}
                title={COIN_NAMES.get(symbol) || symbol.toUpperCase()}
              >
                ${symbol.toUpperCase()}
              </button>
            ))}

            {item.tags.chains.map((chainId) => (
              <button
                key={`chain-${chainId}`}
                type="button"
                className={`news-chip news-chip--chain${activeChain === chainId ? ' is-active' : ''}`}
                onClick={() => onChain(chainId)}
                aria-pressed={activeChain === chainId}
              >
                <span
                  className="news-chain-dot"
                  style={{ background: CHAIN_BY_ID[chainId]?.color || '#8a9dff' }}
                />
                {CHAIN_BY_ID[chainId]?.name || chainId}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default NewsCard;
