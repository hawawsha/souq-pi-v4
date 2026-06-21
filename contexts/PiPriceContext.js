/**
 * Souq Pi - Pi Price React Context
 * Dynamic Network Support
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const PiPriceContext = createContext();

export function PiPriceProvider({ children }) {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [network, setNetwork] = useState('testnet');

  useEffect(() => {
    // Read network from env or default
    setNetwork(process.env.PI_NETWORK || 'testnet');
    fetchPrice();
    const interval = setInterval(fetchPrice, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrice = async () => {
    try {
      const response = await fetch('/api/pi/price');
      const data = await response.json();

      if (data.success) {
        setPrice(data.data.price);
        setNetwork(data.data.network || 'testnet');
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch Pi price');
    } finally {
      setLoading(false);
    }
  };

  const convertToUSD = (piAmount) => {
    if (!price || !piAmount) return 0;
    return (piAmount * price).toFixed(2);
  };

  const value = {
    price,
    loading,
    error,
    network,
    convertToUSD,
    refresh: fetchPrice,
  };

  return (
    <PiPriceContext.Provider value={value}>
      {children}
    </PiPriceContext.Provider>
  );
}

export function usePiPrice() {
  const context = useContext(PiPriceContext);
  if (!context) {
    throw new Error('usePiPrice must be used within PiPriceProvider');
  }
  return context;
}

export default PiPriceContext;
