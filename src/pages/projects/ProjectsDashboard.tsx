import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Loader2,
  Users,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { PROJECT_STATUS_CONFIG, getProjectDisplayName } from '../../types/projects';
import { todayLocalISO } from '../../utils/helpers';

export function ProjectsDashboard() {
  const { projects, loading } = useProjects();
  const { orgUsers } = useAuth();
  const { clients } = useFinance();

  const clientLogoMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) {
      if (c.logoUrl) map[c.id] = c.logoUrl;
    }
    return map;
  }, [clients]);

  const today = todayLocalISO();

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
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      .slice(0, 5);
  }, [projects]);

  const projectsByOwner = useMemo(() => {
    const userMap = new Map<string, string>();
    for (const u of orgUsers) {
      userMap.set(u.id, u.fullName || u.email);
    }
    const counts: Record<string, { name: string; total: number; active: number }> = {};
    for (const p of projects) {
      if (!p.ownerId) continue;
      if (!counts[p.ownerId]) {
        counts[p.ownerId] = { name: userMap.get(p.ownerId) || p.ownerName || 'Sin asignar', total: 0, active: 0 };
      }
      counts[p.ownerId].total++;
      if (p.status === 'in_progress' || p.status === 'approved') {
        counts[p.ownerId].active++;
      }
    }
    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [projects, orgUsers]);

  const avatarColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ];

  const getInitials = (name: string) => {
    const words = name.split(/[\s|—-]+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

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
                const displayName = getProjectDisplayName(project);
                const initials = getInitials(displayName);
                const colorClass = getAvatarColor(project.id);
                const clientLogo = project.clientId ? clientLogoMap[project.clientId] : null;
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {clientLogo ? (
                      <img
                        src={clientLogo}
                        alt=""
                        className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-200 dark:border-gray-700 shrink-0"
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                        <span className="text-xs font-bold text-white">{initials}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {displayName}
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

        {/* Projects by Owner */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Proyectos por Responsable
          </h3>

          {projectsByOwner.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay proyectos asignados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projectsByOwner.map((owner) => (
                <div
                  key={owner.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {owner.name}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {owner.active} activos
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 rounded-full px-2.5 py-0.5">
                      {owner.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
