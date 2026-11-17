import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { CoinContext } from './coinContext';
import { DEFAULT_CURRENCY } from '../constants/currencies';
import { fetchMarkets } from '../services/cryptoApi';

const CoinContextProvider = ({ children }) => {
  const [allCoin, setAllCoin] = useState([]);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchMarkets({ vsCurrency: currency.name, signal: controller.signal })
      .then((data) => {
        // The API answers with an error object instead of an array on rejected requests.
        if (active && Array.isArray(data)) setAllCoin(data);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('Failed to load market data:', error);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [currency.name]);

  const contextValue = useMemo(() => ({ allCoin, currency, setCurrency }), [allCoin, currency]);

  return <CoinContext.Provider value={contextValue}>{children}</CoinContext.Provider>;
};

CoinContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CoinContextProvider;
