import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Presentation,
  ListTodo,
  Video,
  FileText,
  CheckCircle2,
  Circle,
  Eye,
  Users,
  LayoutGrid,
  BookMarked,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { useBMC } from '../../context/BMCContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { PROJECT_STATUS_CONFIG, MODULE_STATUS_CONFIG } from '../../types/projects';
import type { AttendanceRecord } from '../../types/projects';

const circleColorMap: Record<string, string> = {
  pending: 'bg-gray-300 dark:bg-gray-600',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  skipped: 'bg-yellow-500',
};

export function ClientProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { appUser, isAdmin } = useAuth();
  const { projects, modules, fetchModules, attendanceSessions, fetchAttendanceSessions, fetchAttendanceRecords, participants, fetchParticipants, loading } = useProjects();
  const { canvases, fetchCanvases } = useBMC();
  const { playbooks, fetchPlaybooks, stages: allStages, fetchStages, scripts: allScripts, fetchScripts, questions: allQuestions, fetchQuestions, objections: allObjections, fetchObjections } = usePlaybook();

  const isPreview = isAdmin && appUser?.userType !== 'client';

  const project = useMemo(
    () => isPreview
      ? projects.find(p => p.id === projectId)
      : projects.find(p => p.id === projectId && p.clientId === appUser?.clientId),
    [projects, projectId, appUser?.clientId, isPreview],
  );

  useEffect(() => {
    if (projectId) {
      fetchModules(projectId);
      fetchAttendanceSessions(projectId);
      fetchParticipants(projectId);
      fetchCanvases(projectId);
      fetchPlaybooks();
    }
  }, [projectId, fetchModules, fetchAttendanceSessions, fetchParticipants, fetchCanvases, fetchPlaybooks]);

  const projectCanvases = useMemo(() => canvases.filter(c => c.projectId === projectId), [canvases, projectId]);
  const projectPlaybooks = useMemo(() => playbooks.filter(p => p.projectId === projectId && p.status === 'activo'), [playbooks, projectId]);

  // Load playbook details when there's an active playbook
  const activePlaybook = projectPlaybooks[0] || null;
  useEffect(() => {
    if (activePlaybook) {
      fetchStages(activePlaybook.id);
      fetchScripts(activePlaybook.id);
      fetchQuestions(activePlaybook.id);
      fetchObjections(activePlaybook.id);
    }
  }, [activePlaybook?.id, fetchStages, fetchScripts, fetchQuestions, fetchObjections]);

  // Load attendance records for all sessions
  const [sessionRecordsMap, setSessionRecordsMap] = useState<Record<string, AttendanceRecord[]>>({});

  useEffect(() => {
    const loadRecords = async () => {
      const map: Record<string, AttendanceRecord[]> = {};
      for (const s of attendanceSessions) {
        map[s.id] = await fetchAttendanceRecords(s.id);
      }
      setSessionRecordsMap(map);
    };
    if (attendanceSessions.length > 0) loadRecords();
  }, [attendanceSessions, fetchAttendanceRecords]);

  const projectModules = useMemo(
    () => modules
      .filter(m => m.projectId === projectId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [modules, projectId],
  );

  const completedModules = projectModules.filter(m => m.status === 'completed').length;
  const progressPercent = projectModules.length > 0
    ? Math.round((completedModules / projectModules.length) * 100)
    : 0;

  // Group attendance sessions by moduleId
  const sessionsByModule = useMemo(() => {
    const map: Record<string, typeof attendanceSessions> = {};
    for (const s of attendanceSessions) {
      if (s.moduleId) {
        if (!map[s.moduleId]) map[s.moduleId] = [];
        map[s.moduleId].push(s);
      }
    }
    return map;
  }, [attendanceSessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-500">Proyecto no encontrado</p>
        <Link to="/portal" className="text-primary-600 hover:underline mt-2 inline-block">
          Volver a mis proyectos
        </Link>
      </div>
    );
  }

  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  return (
    <div className="space-y-6">
      {isPreview && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>Vista previa — Así ve el cliente este proyecto.</span>
        </div>
      )}

      {/* Header */}
      <div>
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-3">
          <ArrowLeft className="w-4 h-4" /> Mis Proyectos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {[project.clientName, project.product].filter(Boolean).join(' — ') || project.name}
            </h1>
          </div>
          <span className={`${statusConfig.bgClass} text-sm px-3 py-1 rounded-full`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Info + Progress */}
      <div className="card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {project.startDate && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Inicio</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(project.startDate).toLocaleDateString('es-AR')}
              </p>
            </div>
          )}
          {project.endDate && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fin estimado</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(project.endDate).toLocaleDateString('es-AR')}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Módulos</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {completedModules}/{projectModules.length} completados
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Progreso</p>
            <p className="text-sm font-bold text-primary-600">{progressPercent}%</p>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Módulos</h2>
        {projectModules.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay módulos cargados aún.</p>
        ) : (
          <div className="space-y-0">
            {projectModules.map((mod, index) => {
              const modStatus = MODULE_STATUS_CONFIG[mod.status];
              const completedSubs = mod.subtasks.filter(s => s.checked).length;
              const totalSubs = mod.subtasks.length;
              const subPercent = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
              const modSessions = sessionsByModule[mod.id] || [];

              return (
                <div key={mod.id} className="relative flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${circleColorMap[mod.status]}`}>
                      {index + 1}
                    </div>
                    {index < projectModules.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{mod.title}</h4>
                      <span className={`${modStatus.bgClass} text-xs px-2 py-0.5 rounded-full`}>
                        {modStatus.label}
                      </span>
                    </div>

                    {mod.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{mod.description}</p>
                    )}

                    {/* Dates */}
                    {(mod.startDate || mod.dueDate) && (
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {mod.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Inicio: {new Date(mod.startDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {mod.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Vencimiento: {new Date(mod.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Subtasks progress */}
                    {totalSubs > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>{completedSubs}/{totalSubs} completados</span>
                          <span>{subPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${subPercent}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Subtasks list */}
                    {totalSubs > 0 && (
                      <div className="space-y-1 mb-3">
                        {mod.subtasks.map((sub, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            {sub.checked ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            )}
                            <span className={sub.checked ? 'line-through text-gray-400' : ''}>{sub.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Links */}
                    {(mod.presentationUrl || mod.taskUrl || mod.videoUrl || mod.supportMaterialUrl) && (
                      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                        {mod.presentationUrl && (
                          <a href={mod.presentationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline">
                            <Presentation className="w-3.5 h-3.5" /> Presentación
                          </a>
                        )}
                        {mod.taskUrl && (
                          <a href={mod.taskUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline">
                            <ListTodo className="w-3.5 h-3.5" /> Tarea
                          </a>
                        )}
                        {mod.videoUrl && (
                          <a href={mod.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline">
                            <Video className="w-3.5 h-3.5" /> Video
                          </a>
                        )}
                        {mod.supportMaterialUrl && (
                          <a href={mod.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline">
                            <FileText className="w-3.5 h-3.5" /> Material de apoyo
                          </a>
                        )}
                      </div>
                    )}

                    {/* Attendance per module */}
                    {modSessions.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
                        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                          <Users className="w-3.5 h-3.5" /> Asistencia ({modSessions.length} {modSessions.length === 1 ? 'sesión' : 'sesiones'})
                        </h5>
                        <div className="space-y-2">
                          {modSessions.map(session => {
                            const records = sessionRecordsMap[session.id] || [];
                            const presentCount = records.filter(r => r.present).length;
                            const totalCount = records.length;

                            return (
                              <div key={session.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {new Date(session.sessionDate + 'T12:00:00').toLocaleDateString('es-AR', {
                                      weekday: 'short', day: 'numeric', month: 'short',
                                    })}
                                  </span>
                                  {totalCount > 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {presentCount}/{totalCount} presentes
                                    </span>
                                  )}
                                </div>
                                {records.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {records.map(r => {
                                      const p = participants.find(pp => pp.id === r.participantId);
                                      const name = p?.userName || p?.userEmail || r.participantName || '—';
                                      return (
                                        <span
                                          key={r.id}
                                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                            r.present
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                          }`}
                                        >
                                          {name}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Completed date */}
                    {mod.status === 'completed' && mod.completedAt && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Completado el {new Date(mod.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BMC Section */}
      {projectCanvases.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" /> Business Model Canvas
          </h2>
          {projectCanvases.map(canvas => (
            <div key={canvas.id} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">{canvas.name}</h3>
                <Link
                  to={`/bmc/${canvas.id}/respond`}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                >
                  Ver / Responder →
                </Link>
              </div>
              {canvas.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{canvas.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Playbook Section */}
      {activePlaybook && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookMarked className="w-5 h-5" /> Playbook: {activePlaybook.name}
          </h2>
          <div className="space-y-4">
            {allStages
              .filter(s => s.playbookId === activePlaybook.id)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((stage, idx) => {
                const stageScripts = allScripts.filter(s => s.stageId === stage.id);
                const stageQuestions = allQuestions.filter(q => q.stageId === stage.id);
                return (
                  <div key={stage.id} className="card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h3>
                        {stage.objective && <p className="text-xs text-gray-500 dark:text-gray-400">{stage.objective}</p>}
                      </div>
                    </div>
                    {stage.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{stage.description}</p>
                    )}
                    {stageScripts.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Scripts</h4>
                        {stageScripts.map(sc => (
                          <div key={sc.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{sc.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{sc.scriptText}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {stageQuestions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Preguntas</h4>
                        <ul className="space-y-1">
                          {stageQuestions.map(q => (
                            <li key={q.id} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                              <span className="text-primary-500 mt-0.5">•</span>
                              <span>{q.question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Objections */}
            {allObjections.filter(o => o.playbookId === activePlaybook.id).length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Manejo de Objeciones</h3>
                <div className="space-y-3">
                  {allObjections.filter(o => o.playbookId === activePlaybook.id).map(obj => (
                    <div key={obj.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">"{obj.objection}"</p>
                      {Array.isArray(obj.responses) && obj.responses.map((r: any, i: number) => (
                        <p key={i} className="text-sm text-gray-600 dark:text-gray-400 ml-3">→ {typeof r === 'string' ? r : r.text || r.response}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
