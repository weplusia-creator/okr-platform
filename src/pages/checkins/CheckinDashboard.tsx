import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, TrendingDown, Clock, Heart,
  ChevronRight, Filter, Calendar, FolderKanban,
} from 'lucide-react';
import { useCheckin } from '../../context/CheckinContext';
import { useProjects } from '../../context/ProjectContext';
import { useFinance } from '../../context/FinanceContext';
import {
  CHECKIN_STATUS_LABELS, EMOJI_CONFIG, getPulsoColor,
} from '../../types/checkin';
import type { Checkin } from '../../types/checkin';

export function CheckinDashboard() {
  const navigate = useNavigate();
  const { checkins, configs, compromisos, fetchCheckins, fetchCompromisos, loading } = useCheckin();
  const { projects } = useProjects();
  const { clients } = useFinance();
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => {
    fetchCheckins();
    fetchCompromisos();
  }, [fetchCheckins, fetchCompromisos]);

  // Group by project
  const projectSummaries = useMemo(() => {
    const configuredProjects = configs.filter(c => c.activo);
    return configuredProjects.map(config => {
      const project = projects.find(p => p.id === config.proyectoId);
      const client = config.clienteId ? clients.find(c => c.id === config.clienteId) : null;
      const projectCheckins = checkins
        .filter(c => c.proyectoId === config.proyectoId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastCheckin = projectCheckins[0];
      const prevCheckin = projectCheckins[1];
      const pendingCompromisos = compromisos.filter(
        c => c.proyectoId === config.proyectoId && (c.estado === 'pendiente' || c.estado === 'en_progreso')
      );
      const overdueCompromisos = pendingCompromisos.filter(
        c => c.fechaLimite && new Date(c.fechaLimite) < new Date()
      );

      const pulsoTrend = lastCheckin && prevCheckin && lastCheckin.pulsoScore && prevCheckin.pulsoScore
        ? lastCheckin.pulsoScore - prevCheckin.pulsoScore
        : null;

      return {
        config,
        project,
        client,
        lastCheckin,
        projectCheckins,
        pendingCompromisos,
        overdueCompromisos,
        pulsoTrend,
      };
    }).sort((a, b) => {
      // Sort by pulso (worst first), then by name
      const aScore = a.lastCheckin?.pulsoScore ?? 11;
      const bScore = b.lastCheckin?.pulsoScore ?? 11;
      return aScore - bScore;
    });
  }, [configs, projects, clients, checkins, compromisos]);

  const filtered = filterProject
    ? projectSummaries.filter(s => s.config.proyectoId === filterProject)
    : projectSummaries;

  // Alerts
  const alerts = useMemo(() => {
    const items: { type: 'danger' | 'warning' | 'info'; message: string; link?: string }[] = [];

    projectSummaries.forEach(s => {
      if (s.lastCheckin?.necesitaAyudaUrgente) {
        items.push({
          type: 'danger',
          message: `${s.project?.name || 'Proyecto'}: Pidió ayuda urgente`,
          link: `/checkins/${s.lastCheckin.id}`,
        });
      }
      if (s.pulsoTrend !== null && s.pulsoTrend <= -2) {
        items.push({
          type: 'warning',
          message: `${s.project?.name || 'Proyecto'}: Pulso bajó ${Math.abs(s.pulsoTrend)} puntos`,
          link: `/checkins/${s.lastCheckin!.id}`,
        });
      }
      if (s.lastCheckin?.estado === 'pendiente') {
        items.push({
          type: 'info',
          message: `${s.project?.name || 'Proyecto'}: Check-in pendiente`,
          link: `/checkins/${s.lastCheckin.id}`,
        });
      }
      if (s.overdueCompromisos.length > 0) {
        items.push({
          type: 'warning',
          message: `${s.project?.name || 'Proyecto'}: ${s.overdueCompromisos.length} compromiso(s) vencido(s)`,
          link: `/checkins/history/${s.config.proyectoId}`,
        });
      }
    });

    return items;
  }, [projectSummaries]);

  if (loading && checkins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check-ins</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Seguimiento de clientes — pulso, compromisos y métricas
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/checkins/plantillas" className="btn-secondary flex items-center gap-2">
            Plantillas
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              onClick={() => alert.link && navigate(alert.link)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                alert.type === 'danger'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  : alert.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              }`}
            >
              {alert.type === 'danger' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                : alert.type === 'warning' ? <TrendingDown className="w-5 h-5 flex-shrink-0" />
                  : <Clock className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-medium flex-1">{alert.message}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" />
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="select"
        >
          <option value="">Todos los proyectos</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            No hay check-ins configurados
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configurá check-ins desde la vista de cada proyecto
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(summary => {
            const { config, project, client, lastCheckin, pendingCompromisos, pulsoTrend } = summary;
            return (
              <div
                key={config.id}
                className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => lastCheckin ? navigate(`/checkins/${lastCheckin.id}`) : navigate(`/checkins/config/${config.proyectoId}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {project?.name || 'Proyecto'}
                    </h3>
                    {client && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {client.name}
                      </p>
                    )}
                  </div>
                  {lastCheckin?.emoji && (
                    <span className="text-2xl ml-2">
                      {EMOJI_CONFIG[lastCheckin.emoji as keyof typeof EMOJI_CONFIG]?.emoji || ''}
                    </span>
                  )}
                </div>

                {/* Pulso */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-2xl font-bold ${getPulsoColor(lastCheckin?.pulsoScore ?? null)}`}>
                    {lastCheckin?.pulsoScore ?? '-'}/10
                  </div>
                  {pulsoTrend !== null && (
                    <span className={`text-sm font-medium ${
                      pulsoTrend > 0 ? 'text-green-600' : pulsoTrend < 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {pulsoTrend > 0 ? `+${pulsoTrend}` : pulsoTrend}
                    </span>
                  )}
                  {lastCheckin && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CHECKIN_STATUS_LABELS[lastCheckin.estado as keyof typeof CHECKIN_STATUS_LABELS]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {CHECKIN_STATUS_LABELS[lastCheckin.estado as keyof typeof CHECKIN_STATUS_LABELS]?.label || lastCheckin.estado}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>#{lastCheckin?.numero ?? 0}</span>
                  <span>{pendingCompromisos.length} compromisos</span>
                  {lastCheckin?.npsScore && (
                    <span>NPS: {lastCheckin.npsScore}</span>
                  )}
                </div>

                {/* Last date */}
                {lastCheckin && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(lastCheckin.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent checkins list */}
      {checkins.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Últimos check-ins</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {checkins.slice(0, 15).map(ci => {
              const statusCfg = CHECKIN_STATUS_LABELS[ci.estado as keyof typeof CHECKIN_STATUS_LABELS];
              return (
                <Link
                  key={ci.id}
                  to={`/checkins/${ci.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-xl">
                    {ci.emoji ? EMOJI_CONFIG[ci.emoji as keyof typeof EMOJI_CONFIG]?.emoji : '📋'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {ci.projectName || 'Proyecto'} — Check-in #{ci.numero}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {ci.periodo || new Date(ci.createdAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${getPulsoColor(ci.pulsoScore)}`}>
                    {ci.pulsoScore ?? '-'}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg?.color || 'bg-gray-100 text-gray-600'}`}>
                    {statusCfg?.label || ci.estado}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
