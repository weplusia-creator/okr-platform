import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeTableOptions {
  /** Table name in the public schema. */
  table: string;
  /** Optional Postgres filter (e.g. `organization_id=eq.${orgId}`). */
  filter?: string;
  /** Event(s) to listen for. Defaults to `*` (all). */
  event?: TableEvent;
  /** Unique channel name. If omitted, a name is derived from table + filter. */
  channelName?: string;
  /** Whether the subscription should be active. Use this to gate by auth/org readiness. */
  enabled?: boolean;
  /** Called on every matching change. */
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

/**
 * Subscribe to Postgres changes on a single Supabase table.
 *
 * - Cleans up the channel on unmount or when `enabled` flips to false.
 * - If the channel errors (Realtime not enabled in project, RLS denial, etc.),
 *   silently removes the channel to avoid reconnection storms.
 *
 * This is intentionally additive: contexts still own their fetch/mutate logic.
 * The realtime callback should reconcile its local state from `payload.new` /
 * `payload.old`, or call its existing refetch function.
 */
export function useRealtimeTable({
  table,
  filter,
  event = '*',
  channelName,
  enabled = true,
  onChange,
}: UseRealtimeTableOptions): void {
  // Keep the latest callback in a ref so changes don't tear down the subscription.
  const callbackRef = useRef(onChange);
  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    const name = channelName || `rt-${table}-${filter || 'all'}`;
    const channel: RealtimeChannel = supabase
      .channel(name)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          callbackRef.current(payload);
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Realtime not available or denied — drop the channel to stop reconnect storm.
          supabase.removeChannel(channel);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, table, filter, event, channelName]);
}
