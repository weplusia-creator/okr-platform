/**
 * fetch wrapper with a hard timeout. Prevents the UI from hanging forever
 * on requests where the server never responds.
 *
 * Use this for any direct fetch() call that bypasses the Supabase client.
 * Calls that go through the Supabase client are already protected by
 * authRetryFetch in src/lib/supabase.ts.
 */
export const DEFAULT_TIMEOUT_MS = 30_000;
export const AI_TIMEOUT_MS = 90_000;

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  ms: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(`Request timeout after ${ms}ms`, 'TimeoutError')),
    ms,
  );

  if (init?.signal) {
    if (init.signal.aborted) controller.abort(init.signal.reason);
    else init.signal.addEventListener('abort', () => controller.abort(init.signal!.reason), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
