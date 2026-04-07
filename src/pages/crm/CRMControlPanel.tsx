import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Settings2,
} from 'lucide-react';
import { StageEditor } from './StageEditor';
import { useCRM } from '../../context/CRMContext';
import { TERMINAL_STAGES } from '../../types/crm';
import type { Deal, Activity } from '../../types/crm';
import { parseLocalDate } from '../../utils/helpers';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

interface SellerStats {
  ownerId: string | null;
  ownerName: string;
  totalDeals: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  pipelineValue: number;
  wonValue: number;
  winRate: number;
  pendingActivities: number;
  overdueActivities: number;
}

export function CRMControlPanel() {
  const navigate = useNavigate();
  const { deals, activities, loading, pipelineStages, getStageConfig } = useCRM();
  const [showStageEditor, setShowStageEditor] = useState(false);

  // Calculate stats per seller
  const sellerStats = useMemo(() => {
    const statsMap = new Map<string, SellerStats>();

    // Process deals
    deals.forEach((deal) => {
      const key = deal.ownerId || 'sin-asignar';
      const name = deal.ownerName || 'Sin asignar';

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          ownerId: deal.ownerId,
          ownerName: name,
          totalDeals: 0,
          activeDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          pipelineValue: 0,
          wonValue: 0,
          winRate: 0,
          pendingActivities: 0,
          overdueActivities: 0,
        });
      }

      const stats = statsMap.get(key)!;
      stats.totalDeals++;

      if (deal.stage === 'ganado') {
        stats.wonDeals++;
        stats.wonValue += deal.amount;
      } else if (deal.stage === 'perdido') {
        stats.lostDeals++;
      } else {
        stats.activeDeals++;
        stats.pipelineValue += deal.amount;
      }
    });

    // Process activities
    const now = new Date();
    activities.forEach((activity) => {
      if (activity.isCompleted) return;

      const key = activity.ownerId || 'sin-asignar';
      const name = activity.ownerName || 'Sin asignar';

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          ownerId: activity.ownerId,
          ownerName: name,
          totalDeals: 0,
          activeDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          pipelineValue: 0,
          wonValue: 0,
          winRate: 0,
          pendingActivities: 0,
          overdueActivities: 0,
        });
      }

      const stats = statsMap.get(key)!;
      stats.pendingActivities++;

      if (activity.dueDate && new Date(activity.dueDate) < now) {
        stats.overdueActivities++;
      }
    });

    // Calculate win rates
    statsMap.forEach((stats) => {
      const closed = stats.wonDeals + stats.lostDeals;
      stats.winRate = closed > 0 ? Math.round((stats.wonDeals / closed) * 100) : 0;
    });

    return Array.from(statsMap.values()).sort((a, b) => b.wonValue - a.wonValue);
  }, [deals, activities]);

  // Global stats
  const globalStats = useMemo(() => {
    const activeDeals = deals.filter((d) => !(TERMINAL_STAGES as readonly string[]).includes(d.stage));
    const wonDeals = deals.filter((d) => d.stage === 'ganado');
    const lostDeals = deals.filter((d) => d.stage === 'perdido');
    const pendingActivities = activities.filter((a) => !a.isCompleted);
    const overdueActivities = pendingActivities.filter(
      (a) => a.dueDate && new Date(a.dueDate) < new Date()
    );

    return {
      totalDeals: deals.length,
      activeDeals: activeDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      pipelineValue: activeDeals.reduce((sum, d) => sum + d.amount, 0),
      wonValue: wonDeals.reduce((sum, d) => sum + d.amount, 0),
      winRate:
        wonDeals.length + lostDeals.length > 0
          ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
          : 0,
      pendingActivities: pendingActivities.length,
      overdueActivities: overdueActivities.length,
      avgDealValue:
        wonDeals.length > 0
          ? wonDeals.reduce((sum, d) => sum + d.amount, 0) / wonDeals.length
          : 0,
    };
  }, [deals, activities]);

  // Deals by stage for pipeline overview
  const pipelineOverview = useMemo(() => {
    return pipelineStages.map((s) => {
      const stageDeals = deals.filter((d) => d.stage === s.name);
      return {
        stage: s.name,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.amount, 0),
      };
    });
  }, [deals, pipelineStages]);

  // Recent won deals
  const recentWonDeals = useMemo(() => {
    return deals
      .filter((d) => d.stage === 'ganado')
      .sort((a, b) => new Date(b.actualCloseDate || b.updatedAt).getTime() - new Date(a.actualCloseDate || a.updatedAt).getTime())
      .slice(0, 5);
  }, [deals]);

  // Overdue activities
  const overdueActivitiesList = useMemo(() => {
    const now = new Date();
    return activities
      .filter((a) => !a.isCompleted && a.dueDate && new Date(a.dueDate) < now)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 10);
  }, [activities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tablero de Control CRM
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vista general de rendimiento del equipo de ventas
          </p>
        </div>
        <button
          onClick={() => setShowStageEditor(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          Editar Etapas
        </button>
      </div>

      <StageEditor isOpen={showStageEditor} onClose={() => setShowStageEditor(false)} />

      {/* Global Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Oportunidades</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {globalStats.activeDeals}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pipeline</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(globalStats.pipelineValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ganados</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {globalStats.wonDeals}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Win Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {globalStats.winRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {globalStats.pendingActivities}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Vencidas</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {globalStats.overdueActivities}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Leaderboard */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Rendimiento por Vendedor
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  #
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Vendedor
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Activos
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Ganados
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Perdidos
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Win Rate
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Pipeline
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Facturado
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Actividades
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sellerStats.map((seller, index) => (
                <tr
                  key={seller.ownerId || 'sin-asignar'}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    {index === 0 && seller.wonValue > 0 ? (
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <span className="text-gray-400">{index + 1}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {seller.ownerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {seller.ownerName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                    {seller.activeDeals}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {seller.wonDeals}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-red-600 dark:text-red-400">
                      {seller.lostDeals}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        seller.winRate >= 50
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : seller.winRate >= 25
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {seller.winRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(seller.pipelineValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(seller.wonValue)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-gray-600 dark:text-gray-300">
                        {seller.pendingActivities}
                      </span>
                      {seller.overdueActivities > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded">
                          {seller.overdueActivities} vencidas
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sellerStats.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay datos de vendedores
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: Pipeline Overview & Recent Won */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Overview */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pipeline por Etapa
          </h2>
          <div className="space-y-3">
            {pipelineOverview.map((stage) => {
              const config = getStageConfig(stage.stage);
              const maxValue = Math.max(...pipelineOverview.map((p) => p.value), 1);
              const widthPercent = (stage.value / maxValue) * 100;

              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {config.label}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {stage.count} - {formatCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                    <div
                      className={`h-full ${config.headerBg} transition-all`}
                      style={{ width: `${Math.max(widthPercent, stage.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/crm/pipeline')}
            className="mt-4 text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            Ver pipeline completo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Recent Won Deals */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-500" />
            Ultimos Ganados
          </h2>
          {recentWonDeals.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No hay deals ganados aun
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentWonDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => navigate(`/crm/deals/${deal.id}`)}
                  className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {deal.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {deal.ownerName || 'Sin asignar'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(deal.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Activities Alert */}
      {overdueActivitiesList.length > 0 && (
        <div className="card border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10">
          <div className="p-4 border-b border-red-200 dark:border-red-800/30">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Actividades Vencidas ({overdueActivitiesList.length})
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overdueActivitiesList.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => {
                    if (activity.dealId) navigate(`/crm/deals/${activity.dealId}`);
                    else if (activity.leadId) navigate(`/crm/leads/${activity.leadId}`);
                  }}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/30 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="shrink-0">
                    {activity.activityType === 'llamada' && (
                      <Phone className="w-4 h-4 text-red-500" />
                    )}
                    {activity.activityType === 'email' && (
                      <Mail className="w-4 h-4 text-red-500" />
                    )}
                    {activity.activityType === 'reunion' && (
                      <Calendar className="w-4 h-4 text-red-500" />
                    )}
                    {!['llamada', 'email', 'reunion'].includes(activity.activityType) && (
                      <Clock className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.ownerName} - Vencio:{' '}
                      {parseLocalDate(activity.dueDate!).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
