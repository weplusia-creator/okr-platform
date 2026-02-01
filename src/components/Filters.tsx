import { Search, X } from 'lucide-react';
import { useOKR } from '../context/OKRContext';
import type { Quarter, OKRStatus } from '../types';
import { QUARTER_LABELS, STATUS_CONFIG } from '../types';
import { getCurrentYear } from '../utils/helpers';

export function Filters() {
  const { filters, setFilters } = useOKR();

  const currentYear = getCurrentYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const hasActiveFilters =
    filters.quarter !== 'all' ||
    filters.year !== 'all' ||
    filters.status !== 'all' ||
    filters.search !== '';

  const clearFilters = () => {
    setFilters({
      quarter: 'all',
      year: 'all',
      status: 'all',
      search: '',
    });
  };

  return (
    <div className="card p-4 mb-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar objetivos, responsables..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input pl-10"
          />
        </div>

        {/* Quarter Filter */}
        <div className="w-full lg:w-48">
          <select
            value={filters.quarter}
            onChange={(e) =>
              setFilters({
                ...filters,
                quarter: e.target.value as Quarter | 'all',
              })
            }
            className="select"
            aria-label="Filtrar por trimestre"
          >
            <option value="all">Todos los trimestres</option>
            {(Object.keys(QUARTER_LABELS) as Quarter[]).map((q) => (
              <option key={q} value={q}>
                {QUARTER_LABELS[q]}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="w-full lg:w-36">
          <select
            value={filters.year}
            onChange={(e) =>
              setFilters({
                ...filters,
                year: e.target.value === 'all' ? 'all' : parseInt(e.target.value),
              })
            }
            className="select"
            aria-label="Filtrar por año"
          >
            <option value="all">Todos los años</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-44">
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value as OKRStatus | 'all',
              })
            }
            className="select"
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(STATUS_CONFIG) as OKRStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-ghost btn-sm flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
