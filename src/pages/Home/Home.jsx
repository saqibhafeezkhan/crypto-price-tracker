import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Home.css';
import { useCoin } from '../../context/coinContext';
import { fetchMarkets, searchCoins } from '../../services/cryptoApi';

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

  const allCoinRef = useRef(allCoin);
  useEffect(() => {
    allCoinRef.current = allCoin;
  }, [allCoin]);

  const term = searchTerm.trim();

  // Results are stored with the query they answer, so searching and error state
  // is derived during render instead of being reset inside the effect.
  const searchKey = term ? `${term}|${currency.name}` : '';
  const [searchResult, setSearchResult] = useState({ key: '', results: [], error: '' });

  const searching = Boolean(term) && searchResult.key !== searchKey;
  const remoteResults = searchResult.key === searchKey ? searchResult.results : [];
  const searchError = searchResult.key === searchKey ? searchResult.error : '';

  // Keep the query in the URL so it survives a refresh or a trip to a coin page.
  useEffect(() => {
    const current = searchParams.get('q') || '';
    if (current === term) return;

    const next = new URLSearchParams(searchParams);
    if (term) next.set('q', term);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }, [term, searchParams, setSearchParams]);

  // Search the whole catalogue: match ids by name/symbol, then price them in the
  // selected currency. Falls back to the loaded list if the API is unavailable.
  useEffect(() => {
    if (!term) return;

    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const searchData = await searchCoins(term, { signal: controller.signal });
        const ids = (searchData.coins || []).slice(0, 50).map((coin) => coin.id);

        if (!active) return;

        if (ids.length === 0) {
          setSearchResult({ key: searchKey, results: [], error: '' });
          return;
        }

        const markets = await fetchMarkets({
          vsCurrency: currency.name,
          ids,
          signal: controller.signal,
        });
        if (active) {
          setSearchResult({
            key: searchKey,
            results: Array.isArray(markets) ? markets : [],
            error: '',
          });
        }
      } catch (error) {
        if (!active || error.name === 'AbortError') return;
        console.error('Live search failed:', error);

        const query = term.toLowerCase();
        setSearchResult({
          key: searchKey,
          results: allCoinRef.current.filter(
            (item) =>
              (item.name || '').toLowerCase().includes(query) ||
              (item.symbol || '').toLowerCase().includes(query),
          ),
          error:
            'Live search is unavailable right now, so this shows matches from the loaded list.',
        });
      }
    }, 400);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, currency.name, searchKey]);

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
        {coins.map((item, index) => (
          <Link to={`/coin/${item.id}`} key={item.id} className="table-layout">
            <p>{index + 1}</p>
            <div>
              <img src={item.image} alt={item.name} />
              <p>{`${item.name} - ${item.symbol.toUpperCase()}`}</p>
            </div>
            <p>
              {currency.symbol}
              {item.current_price}
            </p>
            <p className={`align-center ${changeClass(item.price_change_percentage_24h)}`}>
              {formatChange(item.price_change_percentage_24h)}
            </p>
            <p className="align-right">
              {currency.symbol}
              {item.market_cap}
            </p>
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
