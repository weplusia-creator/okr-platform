import { useState } from 'react';
import { Pencil, CheckCircle, Calendar, Presentation, ListTodo, Video, FileText, ChevronDown, ChevronRight, Check, Square, Plus, Trash2, ExternalLink } from 'lucide-react';
import type { ProjectModule, ModuleSession } from '../../types/projects';
import { MODULE_STATUS_CONFIG } from '../../types/projects';
import { useProjects } from '../../context/ProjectContext';
import { SessionForm } from './SessionForm';
import { parseLocalDate } from '../../utils/helpers';

interface ModuleCardProps {
  module: ProjectModule;
  index: number;
  onEdit: () => void;
  onComplete: () => void;
  onDelete?: () => void;
  isActive: boolean;
}

const circleColorMap: Record<string, string> = {
  pending: 'bg-gray-300 dark:bg-gray-600',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  skipped: 'bg-yellow-500',
};

export function ModuleCard({ module, index, onEdit, onComplete, onDelete, isActive }: ModuleCardProps) {
  const { updateModule, completeModuleSession, deleteModuleSession } = useProjects();
  const statusConfig = MODULE_STATUS_CONFIG[module.status];
  const completedSubtasks = module.subtasks.filter((s) => s.checked).length;
  const totalSubtasks = module.subtasks.length;
  const subtaskPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const [expanded, setExpanded] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ModuleSession | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sessions = module.sessions || [];
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const totalSessions = sessions.length;

  const toggleSubtask = async (subtaskIndex: number) => {
    const newSubtasks = module.subtasks.map((s, i) =>
      i === subtaskIndex ? { ...s, checked: !s.checked } : s
    );
    await updateModule(module.id, { subtasks: newSubtasks });
  };

  const handleEditSession = (session: ModuleSession) => {
    setEditingSession(session);
    setSessionFormOpen(true);
  };

  const handleAddSession = () => {
    setEditingSession(undefined);
    setSessionFormOpen(true);
  };

  const handleCompleteSession = async (sessionId: string) => {
    await completeModuleSession(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('¿Eliminar esta sesión?')) {
      await deleteModuleSession(sessionId);
    }
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${circleColorMap[module.status]}`}
        >
          {index + 1}
        </div>
        {/* Vertical connector line */}
        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 shadow-sm overflow-hidden">
        {/* Header - clickable */}
        <div
          className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Center info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {module.title}
              </h4>
              <span className={`${statusConfig.bgClass} text-xs px-2 py-0.5 rounded-full flex-shrink-0`}>
                {statusConfig.label}
              </span>
            </div>

            {!expanded && module.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1 ml-6">
                {module.description}
              </p>
            )}

            {/* Sessions + Subtasks summary (collapsed) */}
            {!expanded && (totalSessions > 0 || totalSubtasks > 0) && (
              <div className="ml-6 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {totalSessions > 0 && (
                  <span>{completedSessions}/{totalSessions} sesiones</span>
                )}
                {totalSubtasks > 0 && (
                  <span>{completedSubtasks}/{totalSubtasks} subtareas</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Editar modulo"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {module.status !== 'completed' && (
              <button
                onClick={onComplete}
                className="p-1.5 rounded-lg text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Completar modulo"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-1 text-xs">
                  <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="text-red-600 font-medium hover:underline px-1">Sí</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-gray-500 hover:underline px-1">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Eliminar modulo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Description */}
            {module.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {module.description}
              </p>
            )}

            {/* Dates */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
              {module.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Inicio: {parseLocalDate(module.startDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
              {module.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Vencimiento: {parseLocalDate(module.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
              {module.status === 'completed' && module.completedAt && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completado: {new Date(module.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Module Links */}
            {(module.presentationUrl || module.taskUrl || module.videoUrl || module.supportMaterialUrl) && (
              <div className="flex flex-wrap gap-3">
                {module.presentationUrl && (
                  <a href={module.presentationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1.5 rounded-lg hover:underline">
                    <Presentation className="w-3.5 h-3.5" /> Presentación
                  </a>
                )}
                {module.taskUrl && (
                  <a href={module.taskUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1.5 rounded-lg hover:underline">
                    <ListTodo className="w-3.5 h-3.5" /> Tarea
                  </a>
                )}
                {module.videoUrl && (
                  <a href={module.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1.5 rounded-lg hover:underline">
                    <Video className="w-3.5 h-3.5" /> Video
                  </a>
                )}
                {module.supportMaterialUrl && (
                  <a href={module.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1.5 rounded-lg hover:underline">
                    <FileText className="w-3.5 h-3.5" /> Material de apoyo
                  </a>
                )}
              </div>
            )}

            {/* Sessions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Sesiones {totalSessions > 0 && `(${completedSessions}/${totalSessions})`}
                </h5>
                <button
                  onClick={handleAddSession}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              {totalSessions > 0 && (
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%` }}
                  />
                </div>
              )}

              {sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((session, si) => (
                    <div
                      key={session.id}
                      className={`border rounded-lg p-3 ${
                        session.status === 'completed'
                          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{si + 1}.</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {session.title}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              session.status === 'completed'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {session.status === 'completed' ? 'Completada' : 'Pendiente'}
                            </span>
                          </div>

                          {session.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {session.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {session.sessionDate && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {parseLocalDate(session.sessionDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}

                            {session.presentationUrl && (
                              <a href={session.presentationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded hover:underline">
                                <Presentation className="w-3 h-3" /> Presentación
                              </a>
                            )}
                            {session.videoUrl && (
                              <a href={session.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded hover:underline">
                                <Video className="w-3 h-3" /> Video
                              </a>
                            )}
                            {session.supportMaterialUrl && (
                              <a href={session.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded hover:underline">
                                <FileText className="w-3 h-3" /> Material
                              </a>
                            )}
                            {session.npsToken && (
                              <a href={`/nps/${session.npsToken}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded hover:underline">
                                <ExternalLink className="w-3 h-3" /> NPS
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Session actions */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleEditSession(session)}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Editar sesión"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {session.status !== 'completed' && (
                            <button
                              onClick={() => handleCompleteSession(session.id)}
                              className="p-1 rounded text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title="Completar sesión"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Eliminar sesión"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Sin sesiones. Agregá la primera.
                </p>
              )}
            </div>

            {/* Subtasks checklist */}
            {totalSubtasks > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Subtareas ({completedSubtasks}/{totalSubtasks})</h5>
                  <span className="text-xs text-gray-400">{subtaskPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${subtaskPercent}%` }} />
                </div>
                <div className="space-y-1">
                  {module.subtasks.map((subtask, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSubtask(i)}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {subtask.checked ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${subtask.checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {subtask.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Form Modal */}
      <SessionForm
        isOpen={sessionFormOpen}
        onClose={() => { setSessionFormOpen(false); setEditingSession(undefined); }}
        moduleId={module.id}
        projectId={module.projectId}
        session={editingSession}
        nextSortOrder={sessions.length}
      />
    </div>
  );
}
