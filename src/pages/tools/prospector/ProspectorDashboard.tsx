import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  List,
  Settings,
  Users,
  DollarSign,
  Flame,
  AlertCircle,
  Loader2,
  Target,
  Globe,
  History,
} from 'lucide-react';
import { useProspector } from '../../../context/ProspectorContext';
import { SCORE_LABEL_CONFIG, PROSPECT_STATUS_CONFIG } from '../../../types/prospector';
import type { ScoreLabel, Prospect } from '../../../types/prospector';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(value);
}

export function ProspectorDashboard() {
  const navigate = useNavigate();
  const { prospects, loading, stats } = useProspector();

  // Top 5 prospects by score (descending)
  const topProspects = useMemo(() => {
    return [...prospects]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [prospects]);

  // Recent 5 prospects by updatedAt (descending)
  const recentProspects = useMemo(() => {
    return [...prospects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [prospects]);

  // Score distribution for horizontal bars
  const scoreDistribution = useMemo(() => {
    const labels: ScoreLabel[] = ['cold', 'warm', 'hot', 'ready_to_close'];
    const total = prospects.length || 1;
    return labels.map((label) => ({
      label,
      count: stats.byScore[label] || 0,
      percentage: ((stats.byScore[label] || 0) / total) * 100,
    }));
  }, [stats, prospects.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-300" />
      </div>
    );
  }

  // Empty state
  if (prospects.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prospector B2B</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/tools/prospector/settings"
              className="btn-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Configuracion
            </Link>
            <Link
              to="/tools/prospector/list"
              className="btn-secondary flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Lista Completa
            </Link>
            <Link
              to="/tools/prospector/new"
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Prospecto
            </Link>
          </div>
        </div>

        <div className="card p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            No hay prospectos
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Genera prospectos automaticamente con IA o agregalos manualmente
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/tools/prospector/scrape"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              Generador con IA
            </Link>
            <Link
              to="/tools/prospector/new"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manual
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prospector B2B</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/tools/prospector/history"
            className="btn-secondary flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Historial
          </Link>
          <Link
            to="/tools/prospector/settings"
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configuracion
          </Link>
          <Link
            to="/tools/prospector/list"
            className="btn-secondary flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Lista Completa
          </Link>
          <Link
            to="/tools/prospector/scrape"
            className="btn-primary flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            Generador IA
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total prospectos */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total prospectos
            </span>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalProspects}
          </p>
        </div>

        {/* Pipeline value */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Pipeline value
            </span>
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.pipelineValue)}
          </p>
        </div>

        {/* Hot + Ready to close */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Hot / Listos para cerrar
            </span>
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(stats.byScore.hot || 0) + (stats.byScore.ready_to_close || 0)}
          </p>
        </div>

        {/* Sin contacto 30d */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Sin contacto 30d
            </span>
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.staleProspects}
          </p>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Distribucion por Score
        </h2>
        <div className="space-y-3">
          {scoreDistribution.map(({ label, count, percentage }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-36 shrink-0">
                {SCORE_LABEL_CONFIG[label].label}
              </span>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-[#3d3839] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    label === 'cold'
                      ? 'bg-blue-500'
                      : label === 'warm'
                        ? 'bg-yellow-500'
                        : label === 'hot'
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.max(percentage, count > 0 ? 2 : 0)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout for Top and Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Prospectos */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Prospectos
          </h2>
          <div className="space-y-2">
            {topProspects.map((prospect: Prospect) => (
              <Link
                key={prospect.id}
                to={`/tools/prospector/${prospect.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#3d3839] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {prospect.companyName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {prospect.contactName}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${SCORE_LABEL_CONFIG[prospect.scoreLabel].bgClass}`}
                  >
                    {SCORE_LABEL_CONFIG[prospect.scoreLabel].label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROSPECT_STATUS_CONFIG[prospect.status].bgClass}`}
                  >
                    {PROSPECT_STATUS_CONFIG[prospect.status].label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Prospectos */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Prospectos Recientes
          </h2>
          <div className="space-y-2">
            {recentProspects.map((prospect: Prospect) => (
              <Link
                key={prospect.id}
                to={`/tools/prospector/${prospect.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#3d3839] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {prospect.companyName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {prospect.contactName}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${SCORE_LABEL_CONFIG[prospect.scoreLabel].bgClass}`}
                  >
                    {SCORE_LABEL_CONFIG[prospect.scoreLabel].label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROSPECT_STATUS_CONFIG[prospect.status].bgClass}`}
                  >
                    {PROSPECT_STATUS_CONFIG[prospect.status].label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
