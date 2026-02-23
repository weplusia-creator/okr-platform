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

// Mutex to serialize auth token refresh operations
const locks = new Map<string, Promise<any>>();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    lock: async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      // Short timeout (3s) to prevent UI hangs — if lock is held, proceed anyway
      const timeout = 3000;
      const existing = locks.get(name);
      if (existing) {
        await Promise.race([
          existing.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, timeout)),
        ]);
      }
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

/** Read auth token from localStorage without going through the auth lock */
export function getAccessTokenDirect(): string {
  try {
    const hostname = new URL(supabaseUrl).hostname.split('.')[0];
    const raw = localStorage.getItem(`sb-${hostname}-auth-token`)
      || localStorage.getItem('okr-platform-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || parsed?.currentSession?.access_token || '';
    }
  } catch { /* ignore */ }
  return '';
}
