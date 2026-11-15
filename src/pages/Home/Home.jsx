import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Home.css';
import { useCoin } from '../../context/coinContext';
import { fetchMarkets, searchCoins } from '../../services/coingecko';

const formatChange = (value) =>
  Number.isFinite(value) ? `${Math.floor(value * 100) / 100}%` : '—';

const changeClass = (value) => {
  if (!Number.isFinite(value)) return '';
  return value > 0 ? 'change-up' : 'change-down';
};

const Home = () => {
  const { allCoin, currency } = useCoin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [remoteResults, setRemoteResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const allCoinRef = useRef(allCoin);
  useEffect(() => {
    allCoinRef.current = allCoin;
  }, [allCoin]);

  const term = searchTerm.trim();

  // Keep the query in the URL so it survives a refresh or a trip to a coin page.
  useEffect(() => {
    const current = searchParams.get('q') || '';
    if (current === term) return;

    const next = new URLSearchParams(searchParams);
    if (term) next.set('q', term);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }, [term, searchParams, setSearchParams]);

  // Search the whole CoinGecko catalogue: match ids by name/symbol, then price them
  // in the selected currency. Falls back to the loaded list if the API is unavailable.
  useEffect(() => {
    if (!term) {
      setRemoteResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }

    const controller = new AbortController();
    let active = true;
    setSearching(true);
    setSearchError('');

    const timer = setTimeout(async () => {
      try {
        const searchData = await searchCoins(term, { signal: controller.signal });
        const ids = (searchData.coins || []).slice(0, 50).map((coin) => coin.id);

        if (ids.length === 0) {
          if (active) setRemoteResults([]);
          return;
        }

        const markets = await fetchMarkets({
          vsCurrency: currency.name,
          ids,
          signal: controller.signal,
        });
        if (active) setRemoteResults(Array.isArray(markets) ? markets : []);
      } catch (error) {
        if (!active || error.name === 'AbortError') return;
        console.error('Live search failed:', error);

        const query = term.toLowerCase();
        setRemoteResults(
          allCoinRef.current.filter(
            (item) =>
              (item.name || '').toLowerCase().includes(query) ||
              (item.symbol || '').toLowerCase().includes(query)
          )
        );
        setSearchError('Live search is unavailable right now, so this shows matches from the loaded list.');
      } finally {
        if (active) setSearching(false);
      }
    }, 400);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, currency.name]);

  const coins = term ? (searching ? [] : remoteResults) : allCoin.slice(0, 100);

  return (
    <div className="home">
      <div className="hero">
        <h1>Crypto Track &amp; Trade</h1>
        <p>Fast, easy and secure way to purchase, sell and manage your crypto</p>
        <form onSubmit={(event) => event.preventDefault()}>
          <input
            type="text"
            placeholder="Search crypto"
            aria-label="Search crypto"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          <button type="submit">Search</button>
        </form>
      </div>
      <div className="crypto-table">
        <div className="table-layout">
          <p>#</p>
          <p>Coins</p>
          <p>Price</p>
          <p className="align-center">24H Change</p>
          <p className="align-right">Market Cap</p>
        </div>
        {coins.map((item) => (
          <Link to={`/coin/${item.id}`} key={item.id} className="table-layout">
            <p>{item.market_cap_rank}</p>
            <div>
              <img src={item.image} alt={item.name} />
              <p>{`${item.name} - ${item.symbol.toUpperCase()}`}</p>
            </div>
            <p>{currency.symbol}{item.current_price}</p>
            <p className={`align-center ${changeClass(item.price_change_percentage_24h)}`}>
              {formatChange(item.price_change_percentage_24h)}
            </p>
            <p className="align-right">{currency.symbol}{item.market_cap}</p>
          </Link>
        ))}
        {term && searching && <p className="no-results">Searching…</p>}
        {term && !searching && coins.length === 0 && (
          <p className="no-results">No coins match “{term}”</p>
        )}
        {term && searchError && <p className="search-note">{searchError}</p>}
      </div>
    </div>
  );
};

export default Home;
