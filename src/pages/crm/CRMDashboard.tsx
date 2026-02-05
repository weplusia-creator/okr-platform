import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, TrendingUp, Clock, Plus, Phone, Mail, Calendar, ArrowRight } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { LEAD_STATUS_CONFIG } from '../../types/crm';
import type { Activity } from '../../types/crm';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

export function CRMDashboard() {
  const navigate = useNavigate();
  const { leads, deals, activities, getStats, getPipelineByStage, loading, getStageConfig } = useCRM();
  const [stats, setStats] = useState(getStats());
  const [pipeline, setPipeline] = useState(getPipelineByStage());

  useEffect(() => {
    setStats(getStats());
    setPipeline(getPipelineByStage());
  }, [leads, deals, activities, getStats, getPipelineByStage]);

  // Get the next 5 pending activities sorted by due date
  const upcomingActivities = activities
    .filter(a => !a.isCompleted && a.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  // Get the last 5 leads
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Calculate max value for funnel visualization
  const maxPipelineValue = Math.max(...pipeline.map(p => p.value), 1);

  const getActivityIcon = (activity: Activity) => {
    switch (activity.activityType) {
      case 'llamada':
        return <Phone className="w-4 h-4 text-blue-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-purple-500" />;
      case 'reunion':
        return <Calendar className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Manana';
    }
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const handleActivityClick = (activity: Activity) => {
    if (activity.dealId) {
      navigate(`/crm/deals/${activity.dealId}`);
    } else if (activity.leadId) {
      navigate(`/crm/leads/${activity.leadId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Resumen de ventas y actividades</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/crm/leads/new')}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Lead
          </button>
          <button
            onClick={() => navigate('/crm/deals/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva Oportunidad
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLeads}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pipeline Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.pipelineValue)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.winRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Actividades Pendientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingActivities}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Pipeline & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline de Ventas</h2>
          <div className="space-y-3">
            {pipeline.map((stage) => {
              const config = getStageConfig(stage.stage);
              const widthPercent = maxPipelineValue > 0 ? (stage.value / maxPipelineValue) * 100 : 0;
              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{config.label}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {stage.count} deals - {formatCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                    <div
                      className={`h-full ${config.headerBg} transition-all duration-300 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(widthPercent, 5)}%` }}
                    >
                      {stage.count > 0 && (
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{stage.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/crm/deals')}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Ver pipeline completo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Upcoming Activities */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Proximas Actividades</h2>
          {upcomingActivities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No hay actividades pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="shrink-0">{getActivityIcon(activity)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.ownerName}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                    {formatDate(activity.dueDate!)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/crm/activities')}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Ver todas las actividades <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Leads Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leads Recientes</h2>
          <button
            onClick={() => navigate('/crm/leads')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {recentLeads.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No hay leads registrados</p>
            <button
              onClick={() => navigate('/crm/leads/new')}
              className="btn-primary mt-4"
            >
              Crear primer lead
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Contacto</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Empresa</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Creado</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => {
                  const statusConfig = LEAD_STATUS_CONFIG[lead.status];
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-900 dark:text-white">{lead.contactName}</p>
                        {lead.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{lead.email}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                        {lead.company || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgClass}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 dark:text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
