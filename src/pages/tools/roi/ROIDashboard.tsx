import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calculator, Search, Loader2, Trash2, Copy, FileText, Filter } from 'lucide-react';
import { useTools } from '../../../context/ToolsContext';
import type { ROIStatus, ROIAnalysis } from '../../../types/tools';

const STATUS_CONFIG: Record<ROIStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'badge badge-gray' },
  completed: { label: 'Completado', className: 'badge badge-primary' },
  archived: { label: 'Archivado', className: 'badge badge-warning' },
};

const STATUS_FILTERS: { value: ROIStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'completed', label: 'Completado' },
  { value: 'archived', label: 'Archivado' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$',
  USD: 'US$',
  EUR: '\u20AC',
};

const PERIOD_LABELS: Record<number, string> = {
  6: '6 meses',
  12: '1 ano',
  24: '2 anos',
  36: '3 anos',
  60: '5 anos',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ROIDashboard() {
  const navigate = useNavigate();
  const { roiAnalyses, loadingROI, deleteROIAnalysis, duplicateROIAnalysis } = useTools();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ROIStatus | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter analyses
  const filteredAnalyses = useMemo(() => {
    return roiAnalyses.filter((analysis: ROIAnalysis) => {
      // Status filter
      if (statusFilter !== 'all' && analysis.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = analysis.name.toLowerCase();
        const clientName = analysis.clientName?.toLowerCase() || '';
        if (!name.includes(query) && !clientName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [roiAnalyses, statusFilter, searchQuery]);

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estas seguro de eliminar este analisis de ROI? Esta accion no se puede deshacer.')) {
      setDeletingId(id);
      try {
        await deleteROIAnalysis(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    const newId = await duplicateROIAnalysis(id);
    if (newId) {
      navigate(`/tools/roi/${newId}`);
    }
  };

  if (loadingROI) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calculadora de ROI</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {roiAnalyses.length === 0
              ? 'Crea tu primer analisis de ROI'
              : `${roiAnalyses.length} analisis${roiAnalyses.length !== 1 ? '' : ''}`}
          </p>
        </div>
        <Link to="/tools/roi/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Analisis
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex gap-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-primary-300 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#3d3839] dark:text-gray-400 dark:hover:bg-[#252525]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Cards Grid */}
      {filteredAnalyses.length === 0 ? (
        <div className="card p-12 text-center">
          {roiAnalyses.length === 0 ? (
            <>
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                No hay analisis de ROI
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Crea tu primer analisis para calcular el retorno de inversion de tus servicios
              </p>
              <Link to="/tools/roi/new" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Analisis
              </Link>
            </>
          ) : (
            <>
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron analisis con los filtros aplicados
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnalyses.map((analysis: ROIAnalysis) => {
            const statusConfig = STATUS_CONFIG[analysis.status];
            const currencySymbol = CURRENCY_SYMBOLS[analysis.currency] || '$';
            const periodLabel = PERIOD_LABELS[analysis.analysisPeriod] || `${analysis.analysisPeriod} meses`;
            const isDeleting = deletingId === analysis.id;

            return (
              <div
                key={analysis.id}
                className={`card p-5 flex flex-col hover:shadow-md dark:hover:bg-[#3d3839] transition-all duration-200 ${
                  isDeleting ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {/* Clickable Area */}
                <button
                  onClick={() => navigate(`/tools/roi/${analysis.id}`)}
                  className="text-left flex-1 mb-3"
                >
                  {/* Name + Status */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 pr-2">
                      {analysis.name || 'Sin titulo'}
                    </h3>
                    <span className={statusConfig.className}>{statusConfig.label}</span>
                  </div>

                  {/* Client */}
                  {analysis.clientName && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {analysis.clientName}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span>{formatDate(analysis.createdAt)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>{currencySymbol} {analysis.currency}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>{periodLabel}</span>
                  </div>
                </button>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-100 dark:border-[#443f40]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(analysis.id);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3d3839] rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(analysis.id);
                    }}
                    disabled={isDeleting}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
