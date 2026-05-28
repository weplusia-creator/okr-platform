import { useState, useMemo, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Calendar, User, Trash2, X, Filter, Plus, MessageCircle, AlertTriangle, Tag } from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { TaskDetail } from './TaskDetail';
import type { Task, TaskStatus } from '../../types';
import { parseLocalDate } from '../../utils/helpers';

import { toast } from '../../components/ui/toast';
function avatarColor(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const hue = h % 360;
  const light = 35 + (Math.floor(h / 360) % 20);
  return `hsl(${hue}, 70%, ${light}%)`;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'Pendiente', color: 'border-gray-300 dark:border-gray-600' },
  { id: 'in_progress', label: 'En progreso', color: 'border-blue-400' },
  { id: 'done', label: 'Terminada', color: 'border-green-400' },
];

export function TaskBoard() {
  const {
    tasks, updateTask, deleteTask, addTask,
    taskComments, fetchTaskComments,
    labels,
    taskLabels, fetchTaskLabels,
    taskAssignees, fetchAssignees,
  } = useTask();
  const { orgUsers } = useAuth();

  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // New task form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newSaving, setNewSaving] = useState(false);

  // Prefetch labels and assignees for all tasks
  useEffect(() => {
    for (const t of tasks) {
      if (!taskLabels[t.id]) fetchTaskLabels(t.id);
      if (!taskAssignees[t.id]) fetchAssignees(t.id);
      if (!taskComments[t.id]) fetchTaskComments(t.id);
    }
  }, [tasks, taskLabels, taskAssignees, taskComments, fetchTaskLabels, fetchAssignees, fetchTaskComments]);

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    setNewSaving(true);
    try {
      await addTask({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        responsibleId: newResponsible || null,
        dueDate: newDueDate || null,
      });
      setNewTitle('');
      setNewDescription('');
      setNewResponsible('');
      setNewDueDate('');
      setShowNewForm(false);
    } catch (err: any) {
      toast.error('Error al crear tarea: ' + (err?.message || 'Error desconocido'));
    } finally {
      setNewSaving(false);
    }
  };

  // Filter
  const todayStr = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterResponsible && t.responsibleId !== filterResponsible) return false;
      if (filterText && !t.title.toLowerCase().includes(filterText.toLowerCase())) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterDateFrom && (!t.dueDate || t.dueDate < filterDateFrom)) return false;
      if (filterDateTo && (!t.dueDate || t.dueDate > filterDateTo)) return false;
      if (filterLabel) {
        const tl = taskLabels[t.id] || [];
        if (!tl.some(l => l.id === filterLabel)) return false;
      }
      if (filterOverdue) {
        if (!t.dueDate || t.dueDate >= todayStr || t.status === 'done') return false;
      }
      return true;
    });
  }, [tasks, filterResponsible, filterText, filterStatus, filterDateFrom, filterDateTo, filterLabel, filterOverdue, taskLabels, todayStr]);

  const columnData = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    filtered.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [filtered]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TaskStatus;
    const id = result.draggableId;
    if (newStatus !== result.source.droppableId) {
      try {
        await updateTask(id, { status: newStatus });
      } catch (err: any) {
        // updateTask now throws on failure — surface it instead of silently
        // leaving the card in the new column while the DB still has the old.
        toast.error('No se pudo mover la tarea: ' + (err?.message || 'Error desconocido'));
      }
    }
  }, [updateTask]);

  const activeUsers = orgUsers.filter(u => u.status === 'active' && u.userType !== 'client');
  const today = new Date();
  const hasFilters = filterResponsible || filterText || filterStatus || filterDateFrom || filterDateTo || filterLabel || filterOverdue;

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tareas</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Actions + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Nueva tarea
        </button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <Filter className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Buscar..."
          className="input text-sm py-1.5 w-40"
        />
        <select
          value={filterResponsible}
          onChange={e => setFilterResponsible(e.target.value)}
          className="select text-sm py-1.5 w-auto"
        >
          <option value="">Responsable</option>
          {activeUsers.map(u => (
            <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}
          className="select text-sm py-1.5 w-auto"
        >
          <option value="">Estado</option>
          {COLUMNS.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select
          value={filterLabel}
          onChange={e => setFilterLabel(e.target.value)}
          className="select text-sm py-1.5 w-auto"
        >
          <option value="">Etiqueta</option>
          {labels.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <button
          onClick={() => setFilterOverdue(!filterOverdue)}
          className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-red-300 hover:text-red-500'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Vencidas
        </button>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input text-xs py-1 w-auto" />
          <span>—</span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input text-xs py-1 w-auto" />
        </div>
        {hasFilters && (
          <button onClick={() => { setFilterResponsible(''); setFilterText(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterLabel(''); setFilterOverdue(false); }} className="text-xs text-gray-500 hover:text-primary-600">
            Limpiar
          </button>
        )}
      </div>

      {/* New task form */}
      {showNewForm && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nueva tarea</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="label">Título *</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Título de la tarea"
                className="input"
                autoFocus
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Descripción opcional..."
                className="input"
                rows={2}
              />
            </div>
            <div>
              <label className="label">Responsable</label>
              <select value={newResponsible} onChange={e => setNewResponsible(e.target.value)} className="select">
                <option value="">Sin asignar</option>
                {activeUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha de vencimiento</label>
              <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewForm(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleCreateTask}
              disabled={!newTitle.trim() || newSaving}
              className="btn-primary"
            >
              Crear tarea
            </button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(col => (
            <div key={col.id} className={`rounded-lg border-t-4 ${col.color} bg-gray-50 dark:bg-gray-800/50 p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {col.label}
                </h3>
                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {columnData[col.id].length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[100px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
                  >
                    {columnData[col.id].map((task, index) => {
                      const isOverdue = task.dueDate && new Date(task.dueDate) < today && task.status !== 'done';
                      const tLabels = taskLabels[task.id] || [];
                      const tAssignees = taskAssignees[task.id] || [];
                      const comments = taskComments[task.id] || [];
                      const responsibleUser = task.responsibleId ? orgUsers.find(u => u.id === task.responsibleId) : null;
                      const responsibleName = responsibleUser?.fullName || responsibleUser?.email || task.responsibleName;

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-300' : 'hover:shadow-md'} transition-shadow`}
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              {/* Labels */}
                              {tLabels.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {tLabels.map(l => (
                                    <span key={l.id} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: l.color }}>
                                      {l.name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{task.title}</p>

                              {task.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {task.dueDate && (
                                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger-600 font-medium' : ''}`}>
                                      <Calendar className="w-3 h-3" />
                                      {parseLocalDate(task.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                  {comments.length > 0 && (
                                    <span className="flex items-center gap-0.5 text-gray-400">
                                      <MessageCircle className="w-3 h-3" />
                                      {comments.length}
                                    </span>
                                  )}
                                </div>

                                {/* Responsible + Assignee avatars */}
                                <div className="flex items-center gap-1.5">
                                {responsibleName && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: avatarColor(task.responsibleId || task.id) }}>
                                      {responsibleName.charAt(0)}
                                    </span>
                                    <span className="hidden sm:inline truncate max-w-[80px]">{responsibleName}</span>
                                  </span>
                                )}
                                {tAssignees.length > 0 && (
                                  <div className="flex -space-x-1.5">
                                    {tAssignees.slice(0, 3).map(a => (
                                      <span
                                        key={a.id}
                                        title={a.userName || 'Usuario'}
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white dark:border-gray-800"
                                        style={{ backgroundColor: avatarColor(a.userId) }}
                                      >
                                        {(a.userName || '?').charAt(0)}
                                      </span>
                                    ))}
                                    {tAssignees.length > 3 && (
                                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800">
                                        +{tAssignees.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Eliminar tarea</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button onClick={async () => {
                const id = confirmDelete;
                setConfirmDelete(null);
                try { await deleteTask(id); }
                catch (err: any) { toast.error('No se pudo eliminar: ' + (err?.message || 'Error desconocido')); }
              }} className="btn-danger">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}
