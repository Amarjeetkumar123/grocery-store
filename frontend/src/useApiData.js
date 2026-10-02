import { useCallback, useEffect, useState } from 'react';
import { callApi } from './apiClient.js';

// Loads data from the API for a page. Pass null as path to wait.
// Returns { data, error, loading, reload }.
export function useApiData(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });

  const reload = useCallback(async () => {
    if (!path) return;
    setState((previousState) => ({ ...previousState, loading: true, error: null }));
    try {
      const data = await callApi(path);
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error: error.message, loading: false });
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
