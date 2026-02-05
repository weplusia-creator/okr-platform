import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Settings, Calendar, Search } from 'lucide-react';
import { useCheckin } from '../../context/CheckinContext';
import { useProjects } from '../../context/ProjectContext';
import { CHECKIN_STATUS_LABELS, EMOJI_CONFIG, getPulsoColor } from '../../types/checkin';

export function CheckinHistory() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { checkins, fetchCheckins, compromisos, fetchCompromisos } = useCheckin();
  const { projects } = useProjects();
  const [search, setSearch] = useState('');

  const project = projects.find(p => p.id === projectId);

  useEffect(() => {
    fetchCheckins(projectId);
    fetchCompromisos({ proyectoId: projectId });
  }, [projectId, fetchCheckins, fetchCompromisos]);

  const projectCheckins = useMemo(() =>
    checkins
      .filter(c => c.proyectoId === projectId)
      .sort((a, b) => b.numero - a.numero),
    [checkins, projectId]
  );

  const filteredCheckins = useMemo(() => {
    if (!search.trim()) return projectCheckins;
    const q = search.toLowerCase();
    return projectCheckins.filter(c =>
      c.periodo?.toLowerCase().includes(q) ||
      c.palabraClave?.toLowerCase().includes(q) ||
      c.notasConsultor?.toLowerCase().includes(q) ||
      c.resumenReunion?.toLowerCase().includes(q) ||
      String(c.numero).includes(q)
    );
  }, [projectCheckins, search]);

  // Trend data
  const trendData = useMemo(() => {
    return [...projectCheckins].reverse().map(c => ({
      numero: c.numero,
      pulso: c.pulsoScore,
      nps: c.npsScore,
      compromisosCumplidos: compromisos.filter(
        comp => comp.checkinId === c.id && comp.estado === 'completado'
      ).length,
      compromisosTotales: compromisos.filter(comp => comp.checkinId === c.id).length,
    }));
  }, [projectCheckins, compromisos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Historial de Check-ins
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{project?.name}</p>
        </div>
        <Link to={`/checkins/config/${projectId}`} className="btn-secondary flex items-center gap-2">
          <Settings className="w-4 h-4" /> Configurar
        </Link>
      </div>

      {/* Trend chart (simple bar visualization) */}
      {trendData.length > 1 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Evolución del Pulso</h2>
          <div className="flex items-end gap-1 h-32">
            {trendData.map((d, i) => {
              const height = d.pulso ? (d.pulso / 10) * 100 : 0;
              const color = d.pulso && d.pulso >= 8 ? 'bg-green-500' : d.pulso && d.pulso >= 5 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.pulso ?? '-'}</span>
                  <div className="w-full max-w-[32px] rounded-t" style={{ height: `${height}%` }}>
                    <div className={`w-full h-full rounded-t ${color}`} />
                  </div>
                  <span className="text-xs text-gray-400">#{d.numero}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats summary */}
      {trendData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{projectCheckins.length}</p>
            <p className="text-xs text-gray-500">Check-ins totales</p>
          </div>
          <div className="card p-4 text-center">
            <p className={`text-2xl font-bold ${getPulsoColor(trendData[trendData.length - 1]?.pulso ?? null)}`}>
              {trendData[trendData.length - 1]?.pulso ?? '-'}
            </p>
            <p className="text-xs text-gray-500">Último pulso</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {trendData.length > 0
                ? Math.round(trendData.reduce((sum, d) => sum + (d.pulso ?? 0), 0) / trendData.filter(d => d.pulso).length) || '-'
                : '-'}
            </p>
            <p className="text-xs text-gray-500">Pulso promedio</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(() => {
                const total = trendData.reduce((s, d) => s + d.compromisosTotales, 0);
                const done = trendData.reduce((s, d) => s + d.compromisosCumplidos, 0);
                return total > 0 ? `${Math.round((done / total) * 100)}%` : '-';
              })()}
            </p>
            <p className="text-xs text-gray-500">Cumplimiento</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en check-ins..."
          className="input pl-10"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredCheckins.map(ci => {
          const statusCfg = CHECKIN_STATUS_LABELS[ci.estado as keyof typeof CHECKIN_STATUS_LABELS];
          const emojiCfg = ci.emoji ? EMOJI_CONFIG[ci.emoji as keyof typeof EMOJI_CONFIG] : null;
          return (
            <div
              key={ci.id}
              onClick={() => navigate(`/checkins/${ci.id}`)}
              className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="text-center">
                  <span className="text-2xl">{emojiCfg?.emoji || '📋'}</span>
                  <div className={`text-lg font-bold mt-1 ${getPulsoColor(ci.pulsoScore)}`}>
                    {ci.pulsoScore ?? '-'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Check-in #{ci.numero}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg?.color || 'bg-gray-100 text-gray-600'}`}>
                      {statusCfg?.label || ci.estado}
                    </span>
                  </div>
                  {ci.periodo && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{ci.periodo}</p>
                  )}
                  {ci.resumenReunion && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{ci.resumenReunion}</p>
                  )}
                  {ci.palabraClave && (
                    <span className="inline-block mt-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                      "{ci.palabraClave}"
                    </span>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ci.createdAt).toLocaleDateString('es-AR')}
                    </span>
                    {ci.npsScore && <span>NPS: {ci.npsScore}</span>}
                    {ci.necesitaAyudaUrgente && (
                      <span className="text-red-500 font-medium">⚠️ Ayuda urgente</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredCheckins.length === 0 && (
          <div className="card p-12 text-center text-gray-500">
            {search ? 'No se encontraron resultados' : 'No hay check-ins para este proyecto'}
          </div>
        )}
      </div>
    </div>
  );
}
