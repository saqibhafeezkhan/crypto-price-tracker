import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './Coin.css';
import PriceChart from '../../components/PriceChart/PriceChart';
import { CHART_RANGES, DEFAULT_CHART_RANGE, getChartRequestParams } from '../../constants/chartRanges';
import { useCoin } from '../../context/coinContext';
import { fetchCoin, fetchMarketChart } from '../../services/coingecko';

const FALLBACK = '—';

const Coin = () => {
  const { coinId } = useParams();
  const { currency } = useCoin();
  const [coinData, setCoinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartRange, setChartRange] = useState(DEFAULT_CHART_RANGE);
  const [chartPrices, setChartPrices] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError('');

    fetchCoin(coinId, currency.name, { signal: controller.signal })
      .then((data) => {
        if (active) setCoinData(data);
      })
      .catch((fetchError) => {
        if (!active || fetchError.name === 'AbortError') return;
        console.error('Failed to load coin data:', fetchError);
        setError('Could not load this coin right now.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [coinId, currency.name]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setChartPrices([]);
    setChartLoading(true);
    setChartError('');

    fetchMarketChart(coinId, {
      vsCurrency: currency.name,
      ...getChartRequestParams(chartRange),
      signal: controller.signal,
    })
      .then((data) => {
        if (!active) return;
        const prices = (data.prices || []).map(([, price]) => price);
        setChartPrices(prices);
      })
      .catch((fetchError) => {
        if (!active || fetchError.name === 'AbortError') return;
        console.error('Failed to load price history:', fetchError);
        setChartError('Price history is unavailable right now.');
      })
      .finally(() => {
        if (active) setChartLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [coinId, currency.name, chartRange]);

  if (loading) {
    return <div className="coin"><p>Loading…</p></div>;
  }

  if (error) {
    return <div className="coin"><p>{error}</p></div>;
  }

  if (!coinData) {
    return <div className="coin"><p>Coin not found</p></div>;
  }

  const marketData = coinData.market_data || {};
  const price = marketData.current_price?.[currency.name];
  const priceChange = marketData.price_change_percentage_24h;
  const changeLabel = Number.isFinite(priceChange)
    ? `${priceChange.toFixed(2)}% (24h)`
    : `${FALLBACK} (24h)`;

  return (
    <div className="coin">
      <div className="coin-header">
        <div className="coin-info">
          <img src={coinData.image?.large} alt={coinData.name} />
          <h1>{coinData.name} ({coinData.symbol?.toUpperCase()})</h1>
        </div>
      </div>

      <div className="coin-price-section">
        <div className="price-card">
          <p>Current Price</p>
          <h2>{currency.symbol}{price ?? FALLBACK}</h2>
          <p className={`price-change ${priceChange > 0 ? 'green' : 'red'}`}>
            {changeLabel}
          </p>
        </div>

        <div className="price-card">
          <p>Market Cap</p>
          <h2>{currency.symbol}{marketData.market_cap?.[currency.name]?.toLocaleString() ?? FALLBACK}</h2>
        </div>

        <div className="price-card">
          <p>24h High</p>
          <h2>{currency.symbol}{marketData.high_24h?.[currency.name] ?? FALLBACK}</h2>
        </div>

        <div className="price-card">
          <p>24h Low</p>
          <h2>{currency.symbol}{marketData.low_24h?.[currency.name] ?? FALLBACK}</h2>
        </div>
      </div>

      <div className="coin-chart">
        <div className="chart-toolbar">
          <h3>Price Chart</h3>
          <div className="chart-ranges" role="group" aria-label="Chart timeframe">
            {CHART_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                className={range.id === chartRange.id ? 'active' : ''}
                aria-pressed={range.id === chartRange.id}
                onClick={() => setChartRange(range)}
              >
                {range.buttonLabel}
              </button>
            ))}
          </div>
        </div>
        {chartError && <p className="chart-status">{chartError}</p>}
        {!chartError && chartLoading && <p className="chart-status">Loading chart…</p>}
        {!chartError && !chartLoading && (
          <PriceChart
            prices={chartPrices}
            symbol={currency.symbol}
            title={chartRange.title}
            period={chartRange.shortLabel}
          />
        )}
      </div>

      <div className="coin-details">
        <div className="details-card">
          <h3>About {coinData.name}</h3>
          <p>{coinData.description?.en?.split('. ')[0] || 'No description available'}</p>
        </div>

        <div className="details-card">
          <h3>Market Details</h3>
          <ul>
            <li><strong>Rank:</strong> {coinData.market_cap_rank || FALLBACK}</li>
            <li><strong>Market Cap Rank:</strong> {coinData.market_cap_rank || FALLBACK}</li>
            <li>
              <strong>Total Volume (24h):</strong> {currency.symbol}
              {marketData.total_volume?.[currency.name]?.toLocaleString() ?? FALLBACK}
            </li>
            <li><strong>ATH (All Time High):</strong> {currency.symbol}{marketData.ath?.[currency.name] ?? FALLBACK}</li>
            <li><strong>ATL (All Time Low):</strong> {currency.symbol}{marketData.atl?.[currency.name] ?? FALLBACK}</li>
          </ul>
        </div>

        <div className="details-card">
          <h3>Supply Information</h3>
          <ul>
            <li><strong>Total Supply:</strong> {marketData.total_supply?.toLocaleString() ?? FALLBACK}</li>
            <li><strong>Circulating Supply:</strong> {marketData.circulating_supply?.toLocaleString() ?? FALLBACK}</li>
            <li><strong>Max Supply:</strong> {marketData.max_supply?.toLocaleString() ?? FALLBACK}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Coin;
