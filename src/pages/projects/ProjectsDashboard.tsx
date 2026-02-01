import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { PROJECT_STATUS_CONFIG, getProjectDisplayName } from '../../types/projects';

export function ProjectsDashboard() {
  const { projects, loading } = useProjects();

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => p.status === 'in_progress' || p.status === 'approved'
    );

    const overdue = projects.filter(
      (p) =>
        p.estimatedEndDate &&
        p.estimatedEndDate < today &&
        p.status !== 'completed' &&
        p.status !== 'cancelled'
    );

    const totalMonthlyFee = active.reduce((sum, p) => sum + (p.monthlyFee ?? 0), 0);

    return {
      activeCount: active.length,
      overdueCount: overdue.length,
      totalMonthlyFee,
    };
  }, [projects, today]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [projects]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard de Proyectos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen general de tus proyectos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Proyectos Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.activeCount}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <FolderKanban className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Proyectos Atrasados</p>
              <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-danger-600' : 'text-gray-900 dark:text-white'}`}>
                {stats.overdueCount}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.overdueCount > 0 ? 'bg-danger-100 dark:bg-danger-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <AlertTriangle className={`w-6 h-6 ${stats.overdueCount > 0 ? 'text-danger-600' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fee Mensual Total</p>
              <p className="text-2xl font-bold text-success-600">
                {formatCurrency(stats.totalMonthlyFee)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success-100 dark:bg-success-900/30">
              <DollarSign className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Proyectos Recientes
            </h3>
            <Link
              to="/projects"
              className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay proyectos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => {
                const statusConfig = PROJECT_STATUS_CONFIG[project.status];
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {getProjectDisplayName(project)}
                      </p>
                    </div>
                    <span className={`badge ${statusConfig.bgClass} ml-3 shrink-0`}>
                      {statusConfig.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deliverables Placeholder */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Proximos Entregables
          </h3>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Carga los entregables desde cada proyecto
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
