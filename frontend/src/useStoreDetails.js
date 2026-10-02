import { useEffect, useState } from 'react';
import { callApi } from './apiClient.js';

const defaultStoreDetails = { name: 'Grocery Store', whatsappNumber: null };
let storeDetailsRequest = null;

// Store name and WhatsApp number, fetched once and shared by all pages.
export function useStoreDetails() {
  const [storeDetails, setStoreDetails] = useState(defaultStoreDetails);
  useEffect(() => {
    storeDetailsRequest ??= callApi('/api/store').catch(() => defaultStoreDetails);
    storeDetailsRequest.then(setStoreDetails);
  }, []);
  return storeDetails;
}
