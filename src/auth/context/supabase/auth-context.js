'use client';

import { createContext } from 'react';

// ----------------------------------------------------------------------

export const AuthContext = createContext({
  user: null,
  loading: true,
  supabase: null,
});
