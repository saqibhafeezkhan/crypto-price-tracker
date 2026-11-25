import { useEffect, useId, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { formatUsd } from './format';

const DEFAULT_WIDTH = 720;
const VIEW_HEIGHT = 260;
const PADDING = { top: 18, right: 66, bottom: 26, left: 10 };
const GRID_LINES = [0, 0.5, 1];

const toPoints = (series) =>
  (Array.isArray(series) ? series : [])
    .map((point) => ({ date: Number(point?.[0]), value: Number(point?.[1]) }))
    .filter((point) => Number.isFinite(point.date) && Number.isFinite(point.value));

const scaleFor = (min, max) => (value) => {
  if (max === min) return PADDING.top + (VIEW_HEIGHT - PADDING.top - PADDING.bottom) / 2;

  const ratio = (value - min) / (max - min);
  return PADDING.top + (1 - ratio) * (VIEW_HEIGHT - PADDING.top - PADDING.bottom);
};

const linePath = (points, x, y) =>
  points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${x(point.date).toFixed(2)} ${y(point.value).toFixed(2)}`,
    )
    .join(' ');

const boundsOf = (points) => {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return [min - span * 0.08, max + span * 0.08];
};

const TvlFeesChart = ({ series, days }) => {
  const gradientId = `tvl-fees-gradient-${useId().replace(/:/g, '')}`;

  // Draw at the rendered width so axis labels keep their real font size on narrow screens.
  const [svg, setSvg] = useState(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    if (!svg) return undefined;
    const update = () => setWidth(svg.getBoundingClientRect().width || DEFAULT_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svg]);

  const { tvl, fees, dates } = useMemo(() => {
    const tvlPoints = toPoints(series?.tvl);
    const feePoints = toPoints(series?.fees);
    const latest = Math.max(
      tvlPoints[tvlPoints.length - 1]?.date || 0,
      feePoints[feePoints.length - 1]?.date || 0,
    );
    const cutoff = latest - days * 86400;

    return {
      tvl: tvlPoints.filter((point) => point.date >= cutoff),
      fees: feePoints.filter((point) => point.date >= cutoff),
      dates: [cutoff, latest],
    };
  }, [series, days]);

  if (tvl.length < 2 || fees.length < 2) {
    return <p className="defi-placeholder">No chart data available for this window.</p>;
  }

  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const baseline = PADDING.top + plotHeight;

  const [tvlMin, tvlMax] = boundsOf(tvl);
  const [feeMin, feeMax] = boundsOf(fees);

  const start = Math.min(dates[0], dates[1]);
  const end = Math.max(dates[0], dates[1]);
  const x = (date) =>
    PADDING.left + (end === start ? 0 : ((date - start) / (end - start)) * plotWidth);

  const tvlY = scaleFor(tvlMin, tvlMax);
  const feeY = scaleFor(feeMin, feeMax);

  const tvlLine = linePath(tvl, x, tvlY);
  const tvlArea = [
    tvlLine,
    `L${x(tvl[tvl.length - 1].date).toFixed(2)} ${baseline}`,
    `L${x(tvl[0].date).toFixed(2)} ${baseline}`,
    'Z',
  ].join(' ');
  const feesLine = linePath(fees, x, feeY);

  const windowLabel = days >= 365 ? '365d' : `${days}d`;

  return (
    <figure className="defi-chart">
      <figcaption className="defi-chart-head">
        <span className="defi-chart-title">Chain TVL vs fees · {windowLabel}</span>
        <span className="defi-chart-legend">
          <span className="defi-legend defi-legend--tvl">TVL</span>
          <span className="defi-legend defi-legend--fees">Fees</span>
        </span>
      </figcaption>

      <svg
        ref={setSvg}
        className="defi-chart-svg"
        viewBox={`0 0 ${width} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={`Chain TVL and daily fees over ${windowLabel}. TVL ranges from ${formatUsd(tvlMin)} to ${formatUsd(tvlMax)}; daily fees range from ${formatUsd(feeMin)} to ${formatUsd(feeMax)}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
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
              x2={width - PADDING.right}
              y2={y}
              className="defi-chart-grid"
            />
          );
        })}

        <path
          d={tvlArea}
          fill={`url(#${gradientId})`}
          stroke="none"
          className="defi-chart-tvl-area"
        />
        <path d={tvlLine} className="defi-chart-tvl" vectorEffect="non-scaling-stroke" />
        <path d={feesLine} className="defi-chart-fees" vectorEffect="non-scaling-stroke" />

        <text x={width - PADDING.right + 8} y={PADDING.top + 4} className="defi-chart-axis">
          {formatUsd(tvlMax)}
        </text>
        <text x={width - PADDING.right + 8} y={baseline} className="defi-chart-axis">
          {formatUsd(tvlMin)}
        </text>
        <text
          x={PADDING.left}
          y={PADDING.top - 4}
          className="defi-chart-axis defi-chart-axis--fees"
        >
          fees {formatUsd(feeMax)}
        </text>
      </svg>

      <p className="defi-chart-footer">
        <span>{new Date(start * 1000).toLocaleDateString()}</span>
        <span>{new Date(end * 1000).toLocaleDateString()}</span>
      </p>
    </figure>
  );
};

TvlFeesChart.propTypes = {
  series: PropTypes.shape({
    tvl: PropTypes.array,
    fees: PropTypes.array,
  }),
  days: PropTypes.number.isRequired,
};

export default TvlFeesChart;
