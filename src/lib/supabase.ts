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

// Save native fetch before any wrapping
const rawFetch = globalThis.fetch.bind(globalThis);

// Coalesce concurrent refresh attempts
let refreshingPromise: Promise<any> | null = null;

/**
 * Custom fetch that automatically retries once on 401 (expired JWT).
 * Skips retry for auth endpoints to avoid infinite recursion.
 */
async function authRetryFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await rawFetch(input, init);

  if (response.status === 401) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Don't retry auth endpoints (token refresh, sign in, etc.)
    if (!url.includes('/auth/')) {
      if (!refreshingPromise) {
        refreshingPromise = supabaseClient.auth.refreshSession()
          .finally(() => { refreshingPromise = null; });
      }

      try {
        const result = await refreshingPromise;
        const newToken = result?.data?.session?.access_token;
        if (newToken) {
          const retryHeaders = new Headers(init?.headers);
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          return rawFetch(input, { ...init, headers: retryHeaders });
        }
      } catch {
        // Refresh failed — return original 401
      }
    }
  }

  return response;
}

// Create client with custom retry-fetch
// Using `let` so authRetryFetch can reference it via closure
let supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, then cap at 30s
      return Math.min(1000 * Math.pow(2, tries), 30000);
    },
  },
  global: {
    fetch: authRetryFetch,
  },
});

export const supabase = supabaseClient;

// ── Proactive session refresh when tab becomes visible ──────────
// Handles: user leaves tab open overnight, laptop sleeps, etc.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Check if stored token is expired or about to expire
      const token = getAccessTokenDirect();
      if (!token) return; // not logged in
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        // Refresh if token expires within 2 minutes
        if (expiresAt < Date.now() + 120_000) {
          supabaseClient.auth.refreshSession().catch(() => {});
        }
      } catch {
        // Can't decode JWT — try refreshing anyway
        supabaseClient.auth.refreshSession().catch(() => {});
      }
    }
  });
}

/** Read auth token from localStorage without going through the auth lock */
export function getAccessTokenDirect(): string {
  try {
    // Always read from the configured storageKey to avoid desync
    const raw = localStorage.getItem('okr-platform-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || parsed?.currentSession?.access_token || '';
    }
  } catch { /* ignore */ }
  return '';
}

// Coalesce concurrent getAccessTokenFresh calls
let freshTokenPromise: Promise<string> | null = null;

/**
 * Get a fresh access token, refreshing the session if needed.
 * Use this for direct fetch() calls outside the Supabase client.
 * Coalesces concurrent calls to avoid multiple simultaneous refreshes.
 */
export async function getAccessTokenFresh(): Promise<string> {
  // If there's already a refresh in flight, reuse it
  if (freshTokenPromise) return freshTokenPromise;

  const doGetToken = async (): Promise<string> => {
    const stored = getAccessTokenDirect();
    if (stored) {
      try {
        const payload = JSON.parse(atob(stored.split('.')[1]));
        // Token valid for more than 60 seconds — use it
        if (payload.exp * 1000 > Date.now() + 60_000) {
          return stored;
        }
      } catch {
        // Can't decode — fall through to refresh
      }
    }

    // Token is expired or about to expire — refresh
    try {
      const { data } = await supabaseClient.auth.refreshSession();
      if (data?.session?.access_token) return data.session.access_token;
    } catch { /* refresh failed */ }

    // Fallback to stored token (might be stale, but better than nothing)
    return stored || '';
  };

  freshTokenPromise = doGetToken().finally(() => { freshTokenPromise = null; });
  return freshTokenPromise;
}
