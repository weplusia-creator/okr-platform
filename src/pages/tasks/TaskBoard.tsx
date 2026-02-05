import { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Calendar, User, Trash2, X, Edit2, Check, Filter, Plus, MessageCircle, Send } from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import type { Task, TaskStatus } from '../../types';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'Pendiente', color: 'border-gray-300 dark:border-gray-600' },
  { id: 'in_progress', label: 'En progreso', color: 'border-blue-400' },
  { id: 'done', label: 'Terminada', color: 'border-green-400' },
];

export function TaskBoard() {
  const { tasks, updateTask, deleteTask, addTask, taskComments, fetchTaskComments, addTaskComment, deleteTaskComment } = useTask();
  const { orgUsers, appUser } = useAuth();

  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterText, setFilterText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Comments
  const [commentsOpenId, setCommentsOpenId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // New task form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newSaving, setNewSaving] = useState(false);

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    setNewSaving(true);
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
    setNewSaving(false);
  };

  // Filter
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterResponsible && t.responsibleId !== filterResponsible) return false;
      if (filterText && !t.title.toLowerCase().includes(filterText.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterResponsible, filterText]);

  const columnData = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    filtered.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [filtered]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TaskStatus;
    const id = result.draggableId;
    if (newStatus !== result.source.droppableId) {
      updateTask(id, { status: newStatus });
    }
  }, [updateTask]);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditResponsible(task.responsibleId || '');
    setEditDueDate(task.dueDate || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    await updateTask(editingId, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      responsibleId: editResponsible || null,
      dueDate: editDueDate || null,
    });
    setEditingId(null);
  };

  const toggleComments = (taskId: string) => {
    if (commentsOpenId === taskId) {
      setCommentsOpenId(null);
    } else {
      setCommentsOpenId(taskId);
      if (!taskComments[taskId]) {
        fetchTaskComments(taskId);
      }
    }
    setCommentText('');
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentText.trim()) return;
    await addTaskComment(taskId, commentText.trim());
    setCommentText('');
  };

  const activeUsers = orgUsers.filter(u => u.status === 'active' && u.userType !== 'client');
  const today = new Date();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión</h1>
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
        <select
          value={filterResponsible}
          onChange={e => setFilterResponsible(e.target.value)}
          className="select text-sm py-1.5 w-auto"
        >
          <option value="">Todos los responsables</option>
          {activeUsers.map(u => (
            <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
          ))}
        </select>
        <input
          type="text"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Buscar tarea..."
          className="input text-sm py-1.5 w-48"
        />
        {(filterResponsible || filterText) && (
          <button onClick={() => { setFilterResponsible(''); setFilterText(''); }} className="text-xs text-gray-500 hover:text-primary-600">
            Limpiar filtros
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
                      const isEditingThis = editingId === task.id;
                      const responsibleUser = task.responsibleId ? orgUsers.find(u => u.id === task.responsibleId) : null;
                      const responsibleName = responsibleUser?.fullName || responsibleUser?.email || task.responsibleName;
                      const isCommentsOpen = commentsOpenId === task.id;
                      const comments = taskComments[task.id] || [];

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-300' : 'hover:shadow-md'} transition-shadow`}
                            >
                              {isEditingThis ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="input text-xs py-1.5"
                                    autoFocus
                                  />
                                  <textarea
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                    className="input text-xs py-1.5"
                                    rows={2}
                                    placeholder="Descripción..."
                                  />
                                  <select value={editResponsible} onChange={e => setEditResponsible(e.target.value)} className="select text-xs py-1.5">
                                    <option value="">Sin responsable</option>
                                    {activeUsers.map(u => (
                                      <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                                    ))}
                                  </select>
                                  <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="input text-xs py-1.5" />
                                  <div className="flex justify-end gap-1">
                                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                                    <button onClick={saveEdit} className="p-1 text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                                    <div className="flex gap-0.5 flex-shrink-0">
                                      <button onClick={() => toggleComments(task.id)} className={`p-1 ${isCommentsOpen ? 'text-primary-500' : 'text-gray-300 hover:text-primary-500'}`}>
                                        <MessageCircle className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => startEdit(task)} className="p-1 text-gray-300 hover:text-primary-500"><Edit2 className="w-3 h-3" /></button>
                                      <button onClick={() => setConfirmDelete(task.id)} className="p-1 text-gray-300 hover:text-danger-500"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    {responsibleName && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {responsibleName}
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger-600 font-medium' : ''}`}>
                                        <Calendar className="w-3 h-3" />
                                        {new Date(task.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                      </span>
                                    )}
                                    {comments.length > 0 && !isCommentsOpen && (
                                      <span className="flex items-center gap-1 text-gray-400">
                                        <MessageCircle className="w-3 h-3" />
                                        {comments.length}
                                      </span>
                                    )}
                                  </div>

                                  {/* Comments section */}
                                  {isCommentsOpen && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                      {comments.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                          {comments.map(c => (
                                            <div key={c.id} className="text-xs">
                                              <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{c.userName || 'Usuario'}</span>
                                                <div className="flex items-center gap-1">
                                                  <span className="text-gray-400">
                                                    {new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                  </span>
                                                  {c.userId === appUser?.id && (
                                                    <button onClick={() => deleteTaskComment(c.id, task.id)} className="text-gray-300 hover:text-danger-500">
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                              <p className="text-gray-600 dark:text-gray-400 mt-0.5">{c.text}</p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-400">Sin comentarios</p>
                                      )}
                                      <div className="flex gap-1">
                                        <input
                                          type="text"
                                          value={commentText}
                                          onChange={e => setCommentText(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(task.id); }}
                                          placeholder="Escribir comentario..."
                                          className="input text-xs py-1 flex-1"
                                        />
                                        <button
                                          onClick={() => handleAddComment(task.id)}
                                          disabled={!commentText.trim()}
                                          className="p-1.5 text-primary-500 hover:text-primary-600 disabled:text-gray-300"
                                        >
                                          <Send className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
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
            <p className="text-gray-600 dark:text-gray-400 mb-4">¿Estás seguro? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => { deleteTask(confirmDelete); setConfirmDelete(null); }} className="btn-danger">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
