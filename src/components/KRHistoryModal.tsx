import { useEffect, useState } from 'react';
import { X, Clock, User, ArrowRight, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HistoryRow {
  id: string;
  user_name: string | null;
  previous_progress: number | null;
  new_progress: number;
  previous_current_value: number | null;
  new_current_value: number | null;
  note: string | null;
  created_at: string;
}

interface KRHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyResultId: string;
  keyResultTitle: string;
}

/**
 * Slide-in panel that lists the audit log for a single Key Result.
 * Reads directly from key_result_history (RLS restricts what each user
 * can see). Sorted newest → oldest.
 */
export function KRHistoryModal({ isOpen, onClose, keyResultId, keyResultTitle }: KRHistoryModalProps) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !keyResultId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await (supabase as any)
        .from('key_result_history')
        .select('*')
        .eq('key_result_id', keyResultId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (err) {
        console.error('Error cargando historial:', err);
        setError(err.message);
      } else {
        setRows((data as any) || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isOpen, keyResultId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="modal-backdrop animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto animate-slide-in-right border-l border-gray-200 dark:border-gray-700">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
              Historial
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
              {keyResultTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Cargando…</p>
          ) : error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400 text-center py-8">{error}</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Todavía no hay actualizaciones registradas.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Cada cambio de progreso va a aparecer acá.
              </p>
            </div>
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2">
              {rows.map(r => {
                const delta = r.new_progress - (r.previous_progress ?? 0);
                const isFirstEntry = r.previous_progress === null;
                return (
                  <li key={r.id} className="ml-4 pb-5 relative">
                    {/* Dot */}
                    <span
                      className={
                        'absolute -left-[22px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ' +
                        (delta > 0 ? 'bg-emerald-500'
                          : delta < 0 ? 'bg-rose-500'
                          : 'bg-gray-400')
                      }
                    />

                    {/* Header line */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <User className="w-3 h-3" />
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {r.user_name || 'Usuario'}
                      </span>
                      <span>·</span>
                      <time>{formatRelative(r.created_at)}</time>
                    </div>

                    {/* Change */}
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      {isFirstEntry ? (
                        <span className="text-gray-700 dark:text-gray-200">
                          Estableció el progreso en{' '}
                          <span className="font-bold tabular-nums">{r.new_progress}%</span>
                        </span>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-200 inline-flex items-center gap-1">
                          <span className="tabular-nums text-gray-400">{r.previous_progress}%</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                          <span className="tabular-nums font-bold">{r.new_progress}%</span>
                          <span className={
                            'ml-1 text-xs font-semibold ' +
                            (delta > 0 ? 'text-emerald-600 dark:text-emerald-400'
                              : delta < 0 ? 'text-rose-600 dark:text-rose-400'
                              : 'text-gray-500')
                          }>
                            ({delta > 0 ? '+' : ''}{delta} pts)
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Current value change */}
                    {r.new_current_value != null && r.previous_current_value !== r.new_current_value && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Valor actual: {r.previous_current_value ?? '—'} → <span className="font-medium">{r.new_current_value}</span>
                      </p>
                    )}

                    {/* Optional note */}
                    {r.note && (
                      <div className="mt-1.5 inline-flex items-start gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
                        <span>{r.note}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// Relative-time formatter, Spanish, no extra dependency.
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < min)      return 'hace instantes';
  if (diff < hour)     return `hace ${Math.floor(diff / min)} min`;
  if (diff < day)      return `hace ${Math.floor(diff / hour)} h`;
  if (diff < 7 * day)  return `hace ${Math.floor(diff / day)} días`;
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}
