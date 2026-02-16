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

// Mutex with timeout to serialize auth token refresh operations
const locks = new Map<string, Promise<any>>();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    // Mutex-based lock with timeout to prevent deadlocks
    lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
      const timeout = Math.min(acquireTimeout || 5000, 10000); // Max 10s
      const existing = locks.get(name);
      if (existing) {
        // Wait for existing lock with timeout
        await Promise.race([
          existing.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, timeout)),
        ]);
      }
      const promise = fn();
      locks.set(name, promise);
      try {
        // Also timeout the lock function itself
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth lock timeout')), timeout)
          ),
        ]);
      } finally {
        if (locks.get(name) === promise) locks.delete(name);
      }
    },
    storageKey: 'okr-platform-auth',
  } as any,
});
