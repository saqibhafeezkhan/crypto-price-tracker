import React, { useContext, useEffect, useState } from 'react';
import './Coin.css';
import { useParams } from 'react-router-dom';
import { coinContext } from '../../context/CoinContext';

const Coin = () => {
  const { coinId } = useParams();
  const { currency } = useContext(coinContext);
  const [coinData, setCoinData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        const options = {
          method: 'GET',
          headers: { accept: 'application/json', 'x-cg-demo-api-key': 'CG-EcPpaPKYcgVrtn6szPjdjCFU' }
        };
        
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`,
          options
        );
        const data = await response.json();
        setCoinData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching coin data:', error);
        setLoading(false);
      }
    };

    fetchCoinData();
  }, [coinId]);

  if (loading) {
    return <div className="coin"><p>Loading...</p></div>;
  }

  if (!coinData) {
    return <div className="coin"><p>Coin not found</p></div>;
  }

  return (
    <div className='coin'>
      <div className='coin-header'>
        <div className='coin-info'>
          <img src={coinData.image?.large} alt={coinData.name}/>
          <h1>{coinData.name} ({coinData.symbol?.toUpperCase()})</h1>
        </div>
      </div>

      <div className='coin-price-section'>
        <div className='price-card'>
          <p>Current Price</p>
          <h2>{currency.symbol}{coinData.market_data?.current_price?.[currency.name] || 'N/A'}</h2>
          <p className={`price-change ${coinData.market_data?.price_change_percentage_24h > 0 ? 'green' : 'red'}`}>
            {coinData.market_data?.price_change_percentage_24h?.toFixed(2)}% (24h)
          </p>
        </div>

        <div className='price-card'>
          <p>Market Cap</p>
          <h2>{currency.symbol}{coinData.market_data?.market_cap?.[currency.name]?.toLocaleString() || 'N/A'}</h2>
        </div>

        <div className='price-card'>
          <p>24h High</p>
          <h2>{currency.symbol}{coinData.market_data?.high_24h?.[currency.name] || 'N/A'}</h2>
        </div>

        <div className='price-card'>
          <p>24h Low</p>
          <h2>{currency.symbol}{coinData.market_data?.low_24h?.[currency.name] || 'N/A'}</h2>
        </div>
      </div>

      <div className='coin-chart'>
        <h3>Price Chart (Sparkline)</h3>
        <svg viewBox="0 0 500 100" preserveAspectRatio="none" className='sparkline-chart'>
          {coinData.market_data?.sparkline_7d?.price && (
            <polyline
              points={coinData.market_data.sparkline_7d.price
                .map((price, index) => {
                  const minPrice = Math.min(...coinData.market_data.sparkline_7d.price);
                  const maxPrice = Math.max(...coinData.market_data.sparkline_7d.price);
                  const range = maxPrice - minPrice || 1;
                  const y = 100 - ((price - minPrice) / range * 100);
                  const x = (index / (coinData.market_data.sparkline_7d.price.length - 1)) * 500;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#6b47f5"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      <div className='coin-details'>
        <div className='details-card'>
          <h3>About {coinData.name}</h3>
          <p>{coinData.description?.en?.split('. ')[0] || 'No description available'}</p>
        </div>

        <div className='details-card'>
          <h3>Market Details</h3>
          <ul>
            <li><strong>Rank:</strong> {coinData.market_cap_rank || 'N/A'}</li>
            <li><strong>Market Cap Rank:</strong> {coinData.market_cap_rank || 'N/A'}</li>
            <li><strong>Total Volume (24h):</strong> {currency.symbol}{coinData.market_data?.total_volume?.[currency.name]?.toLocaleString() || 'N/A'}</li>
            <li><strong>ATH (All Time High):</strong> {currency.symbol}{coinData.market_data?.ath?.[currency.name] || 'N/A'}</li>
            <li><strong>ATL (All Time Low):</strong> {currency.symbol}{coinData.market_data?.atl?.[currency.name] || 'N/A'}</li>
          </ul>
        </div>

        <div className='details-card'>
          <h3>Supply Information</h3>
          <ul>
            <li><strong>Total Supply:</strong> {coinData.market_data?.total_supply?.toLocaleString() || 'N/A'}</li>
            <li><strong>Circulating Supply:</strong> {coinData.market_data?.circulating_supply?.toLocaleString() || 'N/A'}</li>
            <li><strong>Max Supply:</strong> {coinData.market_data?.max_supply?.toLocaleString() || 'N/A'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Coin