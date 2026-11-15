import { useId } from 'react';
import PropTypes from 'prop-types';
import './PriceChart.css';

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 240;
const PADDING = { top: 16, right: 8, bottom: 16, left: 8 };
const GRID_LINES = [0, 0.5, 1];

const formatPrice = (value) => {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  // Sub-cent coins need significant digits, otherwise they all read as 0.0000.
  return value.toPrecision(4);
};

const PriceChart = ({ prices = [], symbol = '', title = 'Last 7 days', period = '7d' }) => {
  const gradientId = `price-chart-gradient-${useId().replace(/:/g, '')}`;
  const values = prices.filter((price) => Number.isFinite(price));

  if (values.length < 2) {
    return <p className="price-chart-empty">No chart data available.</p>;
  }

  const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const baseline = PADDING.top + plotHeight;

  const first = values[0];
  const last = values[values.length - 1];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin;
  // Keep the line off the edges, and centre it when every value is identical.
  const breathingRoom = span === 0 ? Math.abs(rawMax) * 0.02 || 1 : span * 0.08;
  const min = rawMin - breathingRoom;
  const max = rawMax + breathingRoom;

  const points = values.map((value, index) => ({
    x: PADDING.left + (index / (values.length - 1)) * plotWidth,
    y: PADDING.top + (1 - (value - min) / (max - min)) * plotHeight,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const areaPath = [
    linePath,
    `L${points[points.length - 1].x.toFixed(2)} ${baseline}`,
    `L${points[0].x.toFixed(2)} ${baseline}`,
    'Z',
  ].join(' ');

  const change = first === 0 ? 0 : ((last - first) / first) * 100;
  const isUp = change >= 0;
  const changeLabel = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  return (
    <figure className={`price-chart ${isUp ? 'is-up' : 'is-down'}`}>
      <figcaption className="price-chart-header">
        <span className="price-chart-title">{title}</span>
        <span className="price-chart-change">{changeLabel}</span>
      </figcaption>

      <svg
        className="price-chart-svg"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={`${title} price chart: ${symbol}${formatPrice(rawMin)} low, ${symbol}${formatPrice(rawMax)} high, currently ${symbol}${formatPrice(last)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {GRID_LINES.map((fraction) => {
          const y = PADDING.top + fraction * plotHeight;
          return (
            <line
              key={fraction}
              x1={PADDING.left}
              y1={y}
              x2={VIEW_WIDTH - PADDING.right}
              y2={y}
              className="price-chart-grid"
            />
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <p className="price-chart-footer">
        <span>{period} low {symbol}{formatPrice(rawMin)}</span>
        <span>{period} high {symbol}{formatPrice(rawMax)}</span>
      </p>
    </figure>
  );
};

PriceChart.propTypes = {
  prices: PropTypes.arrayOf(PropTypes.number),
  symbol: PropTypes.string,
  title: PropTypes.string,
  period: PropTypes.string,
};

export default PriceChart;
