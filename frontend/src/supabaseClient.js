import { createClient } from '@supabase/supabase-js';

// The browser uses Supabase only for Google sign-in. All data goes
// through the Express API (see apiClient.js).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
