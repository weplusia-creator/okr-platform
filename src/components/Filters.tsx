import { Search, X } from 'lucide-react';
import { useOKR } from '../context/OKRContext';
import type { Quarter, OKRStatus } from '../types';
import { QUARTER_LABELS, STATUS_CONFIG } from '../types';
import { getCurrentYear } from '../utils/helpers';

/**
 * Filter bar for OKR Dashboard.
 *
 * - Big search input
 * - Quarter pill tabs (Q1 · Q2 · Q3 · Q4 · Todos)
 * - Year compact selector
 * - Status chip toggles (All / In progress / Completed / At risk / Cancelled)
 *
 * The chip pattern beats native <select> for visibility and tap targets;
 * the quarter tabs make it obvious that the data is scoped to a period.
 */
export function Filters() {
  const { filters, setFilters } = useOKR();
  const currentYear = getCurrentYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const hasActiveFilters =
    filters.quarter !== 'all' ||
    filters.year !== 'all' ||
    filters.status !== 'all' ||
    filters.search !== '';

  const clearFilters = () =>
    setFilters({ quarter: 'all', year: 'all', status: 'all', search: '' });

  const quarterOptions: Array<Quarter | 'all'> = ['all', 'Q1', 'Q2', 'Q3', 'Q4'];
  const statusOptions: Array<OKRStatus | 'all'> = [
    'all', 'in_progress', 'completed', 'at_risk', 'cancelled',
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 space-y-3">
      {/* Row 1: search + year + clear */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar objetivos, responsables, KRs…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input pl-9"
          />
        </div>

        <select
          value={filters.year}
          onChange={(e) =>
            setFilters({
              ...filters,
              year: e.target.value === 'all' ? 'all' : parseInt(e.target.value),
            })
          }
          className="select w-auto"
          aria-label="Filtrar por año"
        >
          <option value="all">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      {/* Row 2: quarter pills + status chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Quarter tabs */}
        <div className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
          {quarterOptions.map((q) => {
            const active = filters.quarter === q;
            return (
              <button
                key={q}
                onClick={() => setFilters({ ...filters, quarter: q })}
                className={
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all ' +
                  (active
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200')
                }
              >
                {q === 'all' ? 'Todos' : QUARTER_LABELS[q]}
              </button>
            );
          })}
        </div>

        {/* Status chips */}
        <div className="inline-flex flex-wrap gap-1.5">
          {statusOptions.map((s) => {
            const active = filters.status === s;
            const cfg = s === 'all' ? null : STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setFilters({ ...filters, status: s })}
                className={
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ' +
                  (active
                    ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600')
                }
              >
                {cfg && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                  />
                )}
                {s === 'all' ? 'Todos' : cfg!.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
