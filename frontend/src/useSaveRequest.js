import { useCallback, useState } from 'react';

// Runs a save call and keeps its error and per-field errors for the form.
// save(request) returns the API result, or null when it failed.
export function useSaveRequest() {
  const [state, setState] = useState({ saving: false, error: null, fieldErrors: {} });
  const save = useCallback(async (request) => {
    setState({ saving: true, error: null, fieldErrors: {} });
    try {
      const result = await request();
      setState({ saving: false, error: null, fieldErrors: {} });
      return result;
    } catch (error) {
      setState({ saving: false, error: error.message, fieldErrors: error.fieldErrors ?? {} });
      return null;
    }
  }, []);
  return { ...state, save };
}
