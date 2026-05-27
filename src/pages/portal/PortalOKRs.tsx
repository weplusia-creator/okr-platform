import { useMemo } from 'react';
import { Loader2, Target, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOKR } from '../../context/OKRContext';

/**
 * Read-only portal view of OKRs scoped to the logged-in client.
 *
 * Why a separate page instead of reusing /okrs:
 *  - Sidebar / navigation context for clients lives under /portal/*
 *  - We want a focused, simpler layout — no quarter switcher / status
 *    filters / admin actions — just "here are your objectives".
 *  - The full /okrs page is for consultants and uses admin filters.
 *
 * Filtering happens client-side here on top of RLS (database also
 * filters server-side via the policy added in 20260527_okrs_client_id.sql).
 */
export function PortalOKRs() {
  const { appUser } = useAuth();
  const { objectives, loading } = useOKR();

  const myObjectives = useMemo(() => {
    if (!appUser?.clientId) return [];
    return objectives
      .filter(o => o.clientId === appUser.clientId)
      .sort((a, b) => b.year - a.year || b.quarter.localeCompare(a.quarter));
  }, [objectives, appUser?.clientId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          Mis OKRs
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Los objetivos y resultados clave de tu empresa. Podés ver el progreso
          y comentar en cada iniciativa.
        </p>
      </header>

      {myObjectives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Todavía no hay OKRs asignados a tu empresa. Cuando tu consultor cree
            objetivos, los vas a ver acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myObjectives.map(obj => {
            const totalProgress = obj.keyResults.length > 0
              ? Math.round(
                  obj.keyResults.reduce((acc, kr) => acc + (kr.progress || 0), 0) /
                  obj.keyResults.length
                )
              : 0;
            return (
              <article
                key={obj.id}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {obj.title}
                    </h2>
                    {obj.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {obj.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>{obj.quarter} {obj.year}</span>
                      {obj.owner && <span>· Resp. {obj.owner}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                      {totalProgress}%
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Progreso
                    </div>
                  </div>
                </header>

                {/* Key results list */}
                {obj.keyResults.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {obj.keyResults.map(kr => (
                      <li
                        key={kr.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-200 truncate">
                            {kr.title}
                          </p>
                          {(kr.currentValue != null || kr.targetValue != null) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {kr.currentValue ?? 0}{kr.unit ? ` ${kr.unit}` : ''}
                              {kr.targetValue != null && (
                                <> / {kr.targetValue}{kr.unit ? ` ${kr.unit}` : ''}</>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                          {kr.progress || 0}%
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
