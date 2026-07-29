import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_API } from 'src/config-global';

// ----------------------------------------------------------------------

export const supabaseBrowserClient = () => {
  const supabase = createBrowserClient(SUPABASE_API.url, SUPABASE_API.key);

  return { supabase };
};
