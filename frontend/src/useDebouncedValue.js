import { useEffect, useState } from 'react';

// Waits until typing pauses before using the value, so each key press is not a request.
export function useDebouncedValue(value, delayInMilliseconds = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayInMilliseconds);
    return () => clearTimeout(timer);
  }, [value, delayInMilliseconds]);
  return debouncedValue;
}
