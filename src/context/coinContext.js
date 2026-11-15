import { createContext, useContext } from 'react';

export const CoinContext = createContext(null);

export const useCoin = () => {
  const context = useContext(CoinContext);

  if (!context) {
    throw new Error('useCoin must be used inside a CoinContextProvider');
  }

  return context;
};
