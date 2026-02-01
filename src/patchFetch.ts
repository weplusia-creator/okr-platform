// This file MUST be imported before any other module that uses fetch.
// It patches window.fetch to strip AbortSignal, preventing Supabase's
// gotrue-js from crashing with "AbortError: signal is aborted without reason".

const _originalFetch = window.fetch.bind(window);

window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init) {
    const { signal, ...rest } = init;
    // If there's a signal, ignore it but still make the request.
    // If the signal is already aborted, still proceed (don't throw).
    return _originalFetch(input, rest).catch((err: Error) => {
      if (err.name === 'AbortError') {
        // Retry without signal
        return _originalFetch(input, rest);
      }
      throw err;
    });
  }
  return _originalFetch(input);
};

export {};
