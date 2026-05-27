import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Folder,
  FolderOpen,
  Briefcase,
  Target,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useOKR } from '../context/OKRContext';
import { useFinance } from '../context/FinanceContext';

/**
 * Folder-style landing for OKRs.
 *
 * Renders one tile per client (with how many OKRs they own + average
 * progress) plus a special "Internos" tile for objectives with no
 * client assigned. Clicking a tile drills into the client's filtered
 * list at /okrs/clients/:clientId — or /okrs/internal for the bucket.
 */
export function OKRClientsHub() {
  const { objectives } = useOKR();
  const { clients } = useFinance();

  // Build a quick lookup: clientId → { count, avgProgress }
  const statsByClient = useMemo(() => {
    const acc: Record<string, { count: number; progressSum: number }> = {};
    for (const obj of objectives) {
      const key = obj.clientId ?? '__internal__';
      if (!acc[key]) acc[key] = { count: 0, progressSum: 0 };
      acc[key].count += 1;
      const krProgress = obj.keyResults.length > 0
        ? obj.keyResults.reduce((s, kr) => s + (kr.progress || 0), 0) / obj.keyResults.length
        : 0;
      acc[key].progressSum += krProgress;
    }
    return acc;
  }, [objectives]);

  // Clients that have at least one OKR, sorted A→Z. Clients with zero
  // OKRs are still shown (so the user can "open the empty folder" and
  // create the first one), but listed at the end.
  const clientsSorted = useMemo(() => {
    return clients
      .slice()
      .sort((a, b) => {
        const aHas = (statsByClient[a.id]?.count ?? 0) > 0;
        const bHas = (statsByClient[b.id]?.count ?? 0) > 0;
        if (aHas !== bHas) return aHas ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [clients, statsByClient]);

  const internalStats = statsByClient.__internal__;
  const totalObjectives = objectives.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            OKRs por cliente
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Elegí un cliente para ver y gestionar sus objetivos.{' '}
            {totalObjectives > 0 && (
              <span className="text-gray-400">
                Total: {totalObjectives} {totalObjectives === 1 ? 'objetivo' : 'objetivos'}.
              </span>
            )}
          </p>
        </div>
      </header>

      {/* Internal bucket (OKRs sin cliente) */}
      {internalStats && internalStats.count > 0 && (
        <Link
          to="/okrs/internal"
          className="group block rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-900/30 p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                OKRs internos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {internalStats.count} objetivos · {Math.round(internalStats.progressSum / internalStats.count)}% promedio
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* Client folders */}
      {clientsSorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Todavía no hay clientes cargados. Creá un cliente desde la sección Proyectos → Clientes para poder armar OKRs.
          </p>
          <Link to="/projects/clients/new" className="btn-primary inline-flex">
            Crear cliente
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientsSorted.map(c => {
            const s = statsByClient[c.id];
            const count = s?.count ?? 0;
            const avg = count > 0 ? Math.round(s.progressSum / count) : 0;
            const isEmpty = count === 0;

            return (
              <Link
                key={c.id}
                to={`/okrs/clients/${c.id}`}
                className={
                  'group block rounded-2xl border bg-white dark:bg-gray-900/40 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 ' +
                  (isEmpty
                    ? 'border-gray-200/60 dark:border-gray-800 opacity-70 hover:opacity-100'
                    : 'border-gray-200 dark:border-gray-700')
                }
              >
                <div className="flex items-start gap-3">
                  <ClientFolderIcon name={c.name} hasContent={!isEmpty} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {isEmpty ? (
                        <span className="italic">Sin objetivos · Crear el primero →</span>
                      ) : (
                        <>{count} {count === 1 ? 'objetivo' : 'objetivos'} · {avg}% promedio</>
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-primary-500 transition-all shrink-0" />
                </div>

                {!isEmpty && (
                  <div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Folder icon — coloured by client name, open if has OKRs
// ────────────────────────────────────────────────────────

function ClientFolderIcon({ name, hasContent }: { name: string; hasContent: boolean }) {
  const palette = [
    'bg-gradient-to-br from-primary-500 to-primary-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-amber-500 to-orange-500',
    'bg-gradient-to-br from-pink-500 to-rose-500',
    'bg-gradient-to-br from-indigo-500 to-violet-600',
    'bg-gradient-to-br from-sky-500 to-cyan-600',
  ];
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const accent = palette[hash % palette.length];
  const Icon = hasContent ? FolderOpen : Folder;

  return (
    <span className={`flex items-center justify-center w-11 h-11 rounded-xl text-white shadow-sm ${accent}`}>
      <Icon className="w-5 h-5" />
    </span>
  );
}
