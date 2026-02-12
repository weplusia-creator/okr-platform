import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  QrCode,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Star,
  Loader2,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useProjects } from '../../context/ProjectContext';
import type { NPSResponse } from '../../types/projects';

interface Props {
  projectId: string;
}

export function NPSSection({ projectId }: Props) {
  const {
    modules,
    fetchModules,
    npsSurveys,
    fetchNPSSurveys,
    createNPSSurvey,
    deleteNPSSurvey,
    toggleNPSSurveyActive,
    fetchNPSResponses,
  } = useProjects();
  const [qrSurveyId, setQrSurveyId] = useState<string | null>(null);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, NPSResponse[]>>({});
  const [loadingResponses, setLoadingResponses] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const didSyncRef = useRef<string | null>(null);

  // Only consider active modules (not skipped)
  const activeModules = useMemo(
    () => modules.filter(m => m.projectId === projectId && m.status !== 'skipped'),
    [modules, projectId],
  );
  const activeModuleTitles = useMemo(
    () => new Set(activeModules.map(m => m.title)),
    [activeModules],
  );

  // Load modules and surveys, auto-create missing NPS only once per projectId
  useEffect(() => {
    if (didSyncRef.current === projectId) return;
    didSyncRef.current = projectId;

    const sync = async () => {
      setSyncing(true);
      await fetchModules(projectId);
      await fetchNPSSurveys(projectId);
      setSyncing(false);
    };
    sync();
  }, [projectId, fetchModules, fetchNPSSurveys]);

  const handleToggleExpand = useCallback(async (surveyId: string) => {
    if (expandedSurvey === surveyId) {
      setExpandedSurvey(null);
      return;
    }
    setExpandedSurvey(surveyId);
    if (!responses[surveyId]) {
      setLoadingResponses(surveyId);
      const data = await fetchNPSResponses(surveyId);
      setResponses(prev => ({ ...prev, [surveyId]: data }));
      setLoadingResponses(null);
    }
  }, [expandedSurvey, responses, fetchNPSResponses]);

  const refreshResponses = useCallback(async (surveyId: string) => {
    setLoadingResponses(surveyId);
    const data = await fetchNPSResponses(surveyId);
    setResponses(prev => ({ ...prev, [surveyId]: data }));
    setLoadingResponses(null);
  }, [fetchNPSResponses]);

  const getSurveyUrl = (token: string) => {
    return `${window.location.origin}/nps/${token}`;
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getSurveyUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNPSStats = (surveyResponses: NPSResponse[]) => {
    if (surveyResponses.length === 0) return { avg: 0, promoters: 0, passives: 0, detractors: 0, nps: 0 };
    const avg = surveyResponses.reduce((sum, r) => sum + r.score, 0) / surveyResponses.length;
    const promoters = surveyResponses.filter(r => r.score >= 9).length;
    const passives = surveyResponses.filter(r => r.score >= 7 && r.score <= 8).length;
    const detractors = surveyResponses.filter(r => r.score <= 6).length;
    const nps = Math.round(((promoters - detractors) / surveyResponses.length) * 100);
    return { avg, promoters, passives, detractors, nps };
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (score >= 7) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Encuestas NPS
        </h3>
      </div>

      {npsSurveys.filter(s => activeModuleTitles.has(s.sessionTitle)).length === 0 ? (
        <div className="card p-12 text-center">
          <Star className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay encuestas NPS
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Las encuestas NPS se crean automáticamente al agregar módulos al proyecto
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {npsSurveys.filter(s => activeModuleTitles.has(s.sessionTitle)).map(survey => {
            const surveyResponses = responses[survey.id] || [];
            const stats = getNPSStats(surveyResponses);
            const isExpanded = expandedSurvey === survey.id;

            return (
              <div key={survey.id} className="card overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {survey.sessionTitle}
                      </h4>
                      <span className={`badge ${survey.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {survey.isActive ? 'Activa' : 'Cerrada'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(survey.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {responses[survey.id] && ` · ${surveyResponses.length} respuestas`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQrSurveyId(qrSurveyId === survey.id ? null : survey.id)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Ver QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleNPSSurveyActive(survey.id, !survey.isActive)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title={survey.isActive ? 'Cerrar encuesta' : 'Reactivar encuesta'}
                    >
                      {survey.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggleExpand(survey.id)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Ver resultados"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {deleteConfirm === survey.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { deleteNPSSurvey(survey.id); setDeleteConfirm(null); }}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(survey.id)}
                        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Modal inline */}
                {qrSurveyId === survey.id && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="bg-white p-4 rounded-lg">
                        <QRCode value={getSurveyUrl(survey.token)} size={180} />
                      </div>
                      <div className="flex-1 space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Compartí este QR o link con los participantes para que respondan la encuesta.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={getSurveyUrl(survey.token)}
                            className="input text-sm flex-1"
                          />
                          <button
                            onClick={() => handleCopyLink(survey.token)}
                            className="btn-secondary shrink-0"
                          >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {loadingResponses === survey.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                      </div>
                    ) : surveyResponses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>No hay respuestas aún</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avg.toFixed(1)}</p>
                            <p className="text-xs text-gray-500">Promedio</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                            <p className={`text-2xl font-bold ${stats.nps >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.nps}</p>
                            <p className="text-xs text-gray-500">NPS Score</p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{stats.promoters}</p>
                            <p className="text-xs text-gray-500">Promotores (9-10)</p>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-yellow-600">{stats.passives}</p>
                            <p className="text-xs text-gray-500">Pasivos (7-8)</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">{stats.detractors}</p>
                            <p className="text-xs text-gray-500">Detractores (1-6)</p>
                          </div>
                        </div>

                        {/* Refresh button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => refreshResponses(survey.id)}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Actualizar respuestas
                          </button>
                        </div>

                        {/* Response list */}
                        <div className="space-y-2">
                          {surveyResponses.map(r => (
                            <div key={r.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900 dark:text-white">{r.respondentName}</span>
                                <span className={`px-2 py-0.5 rounded-full text-sm font-bold ${getScoreColor(r.score)}`}>
                                  {r.score}/10
                                </span>
                              </div>
                              {r.liked && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  <span className="font-medium text-green-600">Lo que gustó:</span> {r.liked}
                                </p>
                              )}
                              {r.improvement && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium text-yellow-600">Mejora:</span> {r.improvement}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(r.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
