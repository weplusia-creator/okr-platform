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

// ── Session expiry event bus ────────────────────────────────────
// Components can subscribe to know when session is irrecoverably dead
type SessionExpiredCallback = () => void;
const sessionExpiredListeners = new Set<SessionExpiredCallback>();
export function onSessionExpired(cb: SessionExpiredCallback) {
  sessionExpiredListeners.add(cb);
  return () => { sessionExpiredListeners.delete(cb); };
}
function notifySessionExpired() {
  sessionExpiredListeners.forEach(cb => { try { cb(); } catch {} });
}

// ── Tab-resumed event bus ───────────────────────────────────────
// Fired when the user returns to a tab that was hidden for >1 minute.
// Background tabs miss realtime events (WebSocket may have closed) and
// data may be stale, so contexts use this to refetch their state.
type TabResumedCallback = () => void;
const tabResumedListeners = new Set<TabResumedCallback>();
export function onTabResumed(cb: TabResumedCallback) {
  tabResumedListeners.add(cb);
  return () => { tabResumedListeners.delete(cb); };
}
function notifyTabResumed() {
  tabResumedListeners.forEach(cb => { try { cb(); } catch {} });
}

// Mutex to serialize auth token refresh operations
const locks = new Map<string, Promise<any>>();

// Save native fetch before any wrapping
const rawFetch = globalThis.fetch.bind(globalThis);

// Coalesce concurrent refresh attempts — single in-flight refresh shared by
// authRetryFetch, refreshSessionSafely (visibility/interval), and
// getAccessTokenFresh. Without this, two refreshes can race: the first
// consumes the refresh_token, the second hangs or fails opaquely.
let refreshingPromise: Promise<any> | null = null;
function coalescedRefresh(reason: string): Promise<any> {
  if (!refreshingPromise) {
    refreshingPromise = withTimeout(
      supabaseClient.auth.refreshSession(),
      REFRESH_TIMEOUT_MS,
      `refreshSession (${reason})`,
    ).finally(() => { refreshingPromise = null; });
  }
  return refreshingPromise;
}

/** Race a promise against a timeout. Rejects with TimeoutError if exceeded. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.name = 'TimeoutError';
      reject(err);
    }, ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Fetch with a hard timeout — aborts the request if it hangs. */
function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), ms);

  // If caller provided a signal, abort our controller when it aborts
  if (init?.signal) {
    if (init.signal.aborted) controller.abort(init.signal.reason);
    else init.signal.addEventListener('abort', () => controller.abort(init.signal!.reason), { once: true });
  }

  return rawFetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

const REQUEST_TIMEOUT_MS = 30_000;
const REFRESH_TIMEOUT_MS = 15_000;

/**
 * Custom fetch that automatically retries once on 401/403 (expired JWT).
 * Skips retry for auth endpoints to avoid infinite recursion.
 * If refresh token is also expired, fires session-expired event.
 * Hard timeout prevents the UI from hanging forever on stuck requests.
 */
async function authRetryFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetchWithTimeout(input, init, REQUEST_TIMEOUT_MS);

  if (response.status === 401 || response.status === 403) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Don't retry auth endpoints (token refresh, sign in, etc.)
    if (!url.includes('/auth/')) {
      try {
        const result = await coalescedRefresh('401-retry');
        const newToken = result?.data?.session?.access_token;
        if (newToken) {
          const retryHeaders = new Headers(init?.headers);
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          return fetchWithTimeout(input, { ...init, headers: retryHeaders }, REQUEST_TIMEOUT_MS);
        }
        // refresh returned no session → session is dead
        notifySessionExpired();
      } catch {
        // Refresh token itself expired or timed out → session is dead
        notifySessionExpired();
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
    headers: { 'Cache-Control': 'no-store' },
  },
});

export const supabase = supabaseClient;

// ── Auth state listener: update realtime token & detect signout ──
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session?.access_token) {
    // Push new token to the realtime WebSocket so it reconnects with valid auth
    supabaseClient.realtime.setAuth(session.access_token);
  }

  if (event === 'SIGNED_OUT') {
    notifySessionExpired();
  }
});

// ── Proactive session refresh when tab becomes visible ──────────
// Handles: user leaves tab open overnight, laptop sleeps, etc.
// Goes through coalescedRefresh so it never races with authRetryFetch.
function refreshSessionSafely(reason: string) {
  coalescedRefresh(reason).catch((err) => {
    console.warn(`[supabase] refreshSession failed (${reason}):`, err);
  });
}

// Track when the tab went to background. If it was hidden long enough,
// we both refresh the token and tell contexts to refetch (because the
// realtime WebSocket likely missed events while throttled).
const TAB_RESUMED_THRESHOLD_MS = 60_000; // 1 minute
let tabHiddenAt: number | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      tabHiddenAt = Date.now();
      return;
    }
    if (document.visibilityState !== 'visible') return;

    const hiddenMs = tabHiddenAt ? Date.now() - tabHiddenAt : 0;
    tabHiddenAt = null;

    const token = getAccessTokenDirect();
    if (!token) return; // not logged in

    // Decide whether to refresh the token
    let needsRefresh = false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      // Refresh if token expires within 5 minutes OR the tab was hidden
      // long enough that the auto-refresh timers were likely throttled.
      needsRefresh = expiresAt < Date.now() + 300_000 || hiddenMs > TAB_RESUMED_THRESHOLD_MS;
    } catch {
      needsRefresh = true;
    }

    const refreshChain = needsRefresh
      ? coalescedRefresh('visibility').catch(() => {})
      : Promise.resolve();

    // After token is fresh (or skipped), notify contexts to refetch if the
    // tab was away long enough that realtime may have missed events.
    if (hiddenMs > TAB_RESUMED_THRESHOLD_MS) {
      refreshChain.finally(() => { notifyTabResumed(); });
    }
  });
}

// ── Periodic token check (every 4 min) ──────────────────────────
// Supabase auto-refresh uses setTimeout which gets throttled in
// background tabs. This interval ensures we catch expired tokens
// even if the tab was backgrounded for a while.
// Guarded so HMR / repeated module evaluation doesn't stack intervals.
declare global {
  // eslint-disable-next-line no-var
  var __supabaseTokenCheckInterval: ReturnType<typeof setInterval> | undefined;
}
if (typeof window !== 'undefined') {
  if (globalThis.__supabaseTokenCheckInterval) {
    clearInterval(globalThis.__supabaseTokenCheckInterval);
  }
  globalThis.__supabaseTokenCheckInterval = setInterval(() => {
    const token = getAccessTokenDirect();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      // Refresh if token expires within 5 minutes
      if (expiresAt < Date.now() + 300_000) {
        refreshSessionSafely('interval');
      }
    } catch {
      refreshSessionSafely('interval-decode');
    }
  }, 4 * 60 * 1000); // every 4 minutes
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

    // Token is expired or about to expire — refresh (coalesced)
    try {
      const { data } = await coalescedRefresh('getAccessTokenFresh');
      if (data?.session?.access_token) return data.session.access_token;
    } catch { /* refresh failed or timed out */ }

    // Fallback to stored token (might be stale, but better than nothing)
    return stored || '';
  };

  freshTokenPromise = doGetToken().finally(() => { freshTokenPromise = null; });
  return freshTokenPromise;
}
