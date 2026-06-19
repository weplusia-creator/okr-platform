// src/lib/preflight.ts
//
// Single source of truth for the "fresh token before INSERT" pattern.
// Every context's addX/updateX/deleteX function calls preflightToken() FIRST.
//
// Why: when a tab idles, the Supabase JWT expires. The next INSERT/UPDATE hits
// a 401, triggers an internal refresh, and the request waits on that refresh.
// If refresh hangs (network issue, race, server slow), the UI looks "frozen".
// preflightToken proactively refreshes BEFORE the INSERT, so by the time the
// query runs the token is valid and the request returns immediately.
//
// CRITICAL DESIGN DECISIONS:
//   1. This file is the ONLY place where this helper lives. No duplication
//      across contexts. Past attempts at copy-pasting into each context caused
//      Vite chunk-loading TDZ issues at runtime ("Cannot access 'ge' before
//      initialization") when the bundler shared minified names.
//   2. Imports ONLY from lib/supabase. NEVER from a context. Importing from a
//      context here would create circular imports through Provider chains.
//   3. Throws on failure (sesión expirada) so callers can show a real error
//      instead of silently failing the INSERT.

import { getAccessTokenFresh } from './supabase';

/**
 * Ensure the Supabase access token is fresh before performing a write.
 * Call this at the very start of every addX/updateX/deleteX in every context.
 *
 * Throws if the session is dead (refresh token also expired).
 */
export async function preflightToken(): Promise<void> {
  const token = await getAccessTokenFresh();
  if (!token) {
    throw new Error('Sesión expirada. Cerrá sesión y volvé a iniciar.');
  }
}
