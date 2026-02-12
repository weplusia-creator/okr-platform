import { useState, useEffect } from 'react';
import {
  X, Check, Trash2, Plus, Link as LinkIcon, Send, Tag, Users, Paperclip,
  MessageCircle, ExternalLink, Save,
} from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import type { Task, TaskStatus } from '../../types';

function avatarColor(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const hue = h % 360;
  const light = 35 + (Math.floor(h / 360) % 20);
  return `hsl(${hue}, 70%, ${light}%)`;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Terminada' },
];

const LABEL_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1',
];

interface Props {
  task: Task;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: Props) {
  const {
    updateTask, deleteTask,
    taskComments, fetchTaskComments, addTaskComment, deleteTaskComment,
    labels, addLabel,
    taskLabels, fetchTaskLabels, assignLabel, removeLabel,
    taskAttachments, fetchAttachments, addAttachment, deleteAttachment,
    taskAssignees, fetchAssignees, addAssignee, removeAssignee,
  } = useTask();
  const { orgUsers, appUser } = useAuth();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [responsibleId, setResponsibleId] = useState(task.responsibleId || '');
  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  // Label creation
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  // Attachment creation
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');

  // Assignee
  const [showAssigneeSelect, setShowAssigneeSelect] = useState(false);

  const activeUsers = orgUsers.filter(u => u.status === 'active' && u.userType !== 'client');
  const currentLabels = taskLabels[task.id] || [];
  const currentAttachments = taskAttachments[task.id] || [];
  const currentAssignees = taskAssignees[task.id] || [];
  const comments = taskComments[task.id] || [];

  useEffect(() => {
    fetchTaskComments(task.id);
    fetchTaskLabels(task.id);
    fetchAttachments(task.id);
    fetchAssignees(task.id);
  }, [task.id, fetchTaskComments, fetchTaskLabels, fetchAttachments, fetchAssignees]);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setDueDate(task.dueDate || '');
    setResponsibleId(task.responsibleId || '');
  }, [task]);

  const handleSave = async () => {
    await updateTask(task.id, {
      title: title.trim() || task.title,
      description: description.trim() || null,
      status,
      dueDate: dueDate || null,
      responsibleId: responsibleId || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveAndClose = async () => {
    await handleSave();
    onClose();
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addTaskComment(task.id, commentText.trim());
    setCommentText('');
  };

  const handleCreateLabel = async () => {
    const name = newLabelName.trim();
    if (!name) { alert('Nombre vacío'); return; }
    try {
      const label = await addLabel(name, newLabelColor);
      if (label) {
        await assignLabel(task.id, label.id);
        setNewLabelName('');
        setShowLabelForm(false);
      } else {
        alert('No se pudo crear la etiqueta (label es null). Puede que falte organización.');
      }
    } catch (err: any) {
      alert('Error al crear etiqueta: ' + (err?.message || 'Error desconocido'));
    }
  };

  const handleAddAttachment = async () => {
    if (!attachName.trim() || !attachUrl.trim()) return;
    await addAttachment(task.id, { type: 'link', name: attachName.trim(), url: attachUrl.trim() });
    setAttachName('');
    setAttachUrl('');
    setShowAttachForm(false);
  };

  const assignedUserIds = new Set(currentAssignees.map(a => a.userId));
  const availableUsers = activeUsers.filter(u => !assignedUserIds.has(u.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-[5vh] overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-1 -ml-1 focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + Date + Responsible row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Estado</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="select text-sm py-1.5"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Responsable</label>
              <select
                value={responsibleId}
                onChange={e => setResponsibleId(e.target.value)}
                className="select text-sm py-1.5"
              >
                <option value="">Sin asignar</option>
                {activeUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Agregar descripción..."
              className="input text-sm"
              rows={3}
            />
          </div>

          {/* Additional assignees (multi) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Responsables adicionales</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentAssignees.map(a => (
                <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: avatarColor(a.userId) }}>
                    {(a.userName || '?').charAt(0)}
                  </span>
                  {a.userName || 'Usuario'}
                  <button onClick={() => removeAssignee(a.id, task.id)} className="text-blue-400 hover:text-red-500 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {showAssigneeSelect ? (
                <div className="flex items-center gap-1">
                  <select
                    autoFocus
                    onChange={e => { if (e.target.value) { addAssignee(task.id, e.target.value); setShowAssigneeSelect(false); } }}
                    className="select text-xs py-1"
                    defaultValue=""
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowAssigneeSelect(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAssigneeSelect(true)} className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 rounded-full text-xs hover:border-primary-400 hover:text-primary-600">
                  <Plus className="w-3 h-3" /> Agregar
                </button>
              )}
            </div>
          </div>

          {/* Labels */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Etiquetas</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentLabels.map(l => (
                <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: l.color }}>
                  {l.name}
                  <button onClick={() => removeLabel(task.id, l.id)} className="opacity-70 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {labels.filter(l => !currentLabels.some(cl => cl.id === l.id)).length > 0 && (
                <select
                  value=""
                  onChange={async e => {
                    const val = e.target.value;
                    if (!val) return;
                    try {
                      await assignLabel(task.id, val);
                    } catch (err: any) {
                      alert('Error al asignar etiqueta: ' + (err?.message || 'Error'));
                    }
                  }}
                  className="text-xs border border-dashed border-gray-300 dark:border-gray-600 rounded-full px-2 py-0.5 bg-transparent text-gray-500 cursor-pointer"
                >
                  <option value="" disabled>+ Etiqueta</option>
                  {labels.filter(l => !currentLabels.some(cl => cl.id === l.id)).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}

              {showLabelForm ? (
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    placeholder="Nombre..."
                    className="input text-xs py-0.5 px-2 w-24"
                    autoFocus
                  />
                  <div className="flex gap-0.5">
                    {LABEL_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewLabelColor(c)}
                        className={`w-4 h-4 rounded-full border-2 ${newLabelColor === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button onClick={handleCreateLabel} disabled={!newLabelName.trim()} className="text-green-600 hover:text-green-700 disabled:text-gray-300">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowLabelForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowLabelForm(true)} className="text-xs text-gray-400 hover:text-primary-600">
                  + Nueva
                </button>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Adjuntos</span>
            </div>
            {currentAttachments.length > 0 && (
              <div className="space-y-1 mb-2">
                {currentAttachments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate flex-1">
                      {a.name}
                    </a>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={() => deleteAttachment(a.id, task.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showAttachForm ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={attachName}
                    onChange={e => setAttachName(e.target.value)}
                    placeholder="Nombre del link"
                    className="input text-xs py-1.5"
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="url"
                    value={attachUrl}
                    onChange={e => setAttachUrl(e.target.value)}
                    placeholder="https://..."
                    className="input text-xs py-1.5"
                  />
                </div>
                <button onClick={handleAddAttachment} disabled={!attachName.trim() || !attachUrl.trim()} className="btn-primary text-xs py-1.5 px-3">
                  Agregar
                </button>
                <button onClick={() => { setShowAttachForm(false); setAttachName(''); setAttachUrl(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAttachForm(true)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                <Plus className="w-3 h-3" /> Agregar link
              </button>
            )}
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Comentarios ({comments.length})</span>
            </div>
            {comments.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                {comments.map(c => (
                  <div key={c.id} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{c.userName || 'Usuario'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">
                          {new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {c.userId === appUser?.id && (
                          <button onClick={() => deleteTaskComment(c.id, task.id)} className="text-gray-300 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                placeholder="Escribir comentario..."
                className="input text-xs py-1.5 flex-1"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="p-2 text-primary-500 hover:text-primary-600 disabled:text-gray-300"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button onClick={handleSave} className={`btn-primary text-sm flex items-center gap-2 ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                {saved ? <><Check className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> Guardar</>}
              </button>
              <button onClick={handleSaveAndClose} className="btn-secondary text-sm">
                Guardar y cerrar
              </button>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Eliminar?</span>
                <button onClick={handleDelete} className="btn-danger text-xs py-1 px-3">Sí, eliminar</button>
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-xs py-1 px-3">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
