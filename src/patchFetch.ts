// This file MUST be imported before any other module that uses fetch.
// It patches window.fetch to strip AbortSignal ONLY for Supabase auth
// (gotrue-js) requests, preventing "AbortError: signal is aborted without reason".
// Non-auth requests keep their AbortSignal so locks/timeouts work normally.

const _originalFetch = window.fetch.bind(window);

window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.signal) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const isAuthRequest = url.includes('/auth/');

    if (isAuthRequest) {
      const { signal, ...rest } = init;
      return _originalFetch(input, rest).catch((err: Error) => {
        if (err.name === 'AbortError') {
          return _originalFetch(input, rest);
        }
        throw err;
      });
    }
  }
  return _originalFetch(input, init);
};

export {};
