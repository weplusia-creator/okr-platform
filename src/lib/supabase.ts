import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// Simple mutex to serialize auth token refresh operations
const locks = new Map<string, Promise<any>>();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    // Mutex-based lock to replace navigator.locks (which causes AbortError in some browsers)
    lock: async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      const existing = locks.get(name);
      if (existing) await existing.catch(() => {});
      const promise = fn();
      locks.set(name, promise);
      try {
        return await promise;
      } finally {
        if (locks.get(name) === promise) locks.delete(name);
      }
    },
    storageKey: 'okr-platform-auth',
  } as any,
});
