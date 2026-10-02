import { useCallback, useEffect, useState } from 'react';
import { callApi } from '../apiClient.js';

// Asks the server for current prices and totals whenever the cart changes.
// The previous result stays on screen while a new one loads.
export function useCartQuote(items) {
  const [state, setState] = useState({ cart: null, error: null, loading: false });
  const [requestCount, setRequestCount] = useState(0);
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    const cartItems = JSON.parse(itemsKey);
    if (cartItems.length === 0) return undefined;
    let current = true;
    setState((previous) => ({ ...previous, loading: true }));
    callApi('/api/checkout/quote', { method: 'POST', body: { items: cartItems } })
      .then((data) => current && setState({ cart: data.cart, error: null, loading: false }))
      .catch((error) => current && setState({ cart: null, error: error.message, loading: false }));
    return () => { current = false; };
  }, [itemsKey, requestCount]);

  const reload = useCallback(() => setRequestCount((count) => count + 1), []);
  return { ...state, reload };
}
