import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Check,
  Circle,
  CircleDashed,
  CircleDot,
  Edit2,
  MessageCircle,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { Initiative, InitiativeStatus } from '../types';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';
import { parseLocalDate } from '../utils/helpers';

interface InitiativeRowProps {
  initiative: Initiative;
}

const STATUS_ORDER: InitiativeStatus[] = ['todo', 'in_progress', 'done'];
const STATUS_ICON: Record<InitiativeStatus, typeof Circle> = {
  todo: CircleDashed,
  in_progress: CircleDot,
  done: Check,
};
const STATUS_LABEL: Record<InitiativeStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  done: 'Hecho',
};
const STATUS_COLOR: Record<InitiativeStatus, string> = {
  todo: 'text-gray-400',
  in_progress: 'text-blue-500',
  done: 'text-green-500',
};

export function InitiativeRow({ initiative }: InitiativeRowProps) {
  const {
    updateInitiative,
    deleteInitiative,
    initiativeComments,
    fetchComments,
    addComment,
    deleteComment,
  } = useOKR();
  const { orgUsers, appUser, isAdmin } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(initiative.title);
  const [editResponsible, setEditResponsible] = useState(initiative.responsibleId || '');
  const [editDueDate, setEditDueDate] = useState(initiative.dueDate || '');
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const comments = initiativeComments[initiative.id] || [];
  const respUser = initiative.responsibleId
    ? orgUsers.find(u => u.id === initiative.responsibleId)
    : null;
  const respName = respUser?.fullName || respUser?.email || initiative.responsibleName;
  const isOverdue =
    initiative.dueDate &&
    new Date(initiative.dueDate) < new Date() &&
    initiative.status !== 'done';

  const activeUsers = useMemo(
    () => orgUsers.filter(u => u.status === 'active' && u.userType !== 'client'),
    [orgUsers],
  );

  useEffect(() => {
    if (showComments && !initiativeComments[initiative.id]) {
      fetchComments(initiative.id);
    }
  }, [showComments, initiative.id, initiativeComments, fetchComments]);

  const cycleStatus = () => {
    const idx = STATUS_ORDER.indexOf(initiative.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    updateInitiative(initiative.id, { status: next });
  };

  const startEdit = () => {
    setEditTitle(initiative.title);
    setEditResponsible(initiative.responsibleId || '');
    setEditDueDate(initiative.dueDate || '');
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!editTitle.trim()) return;
    updateInitiative(initiative.id, {
      title: editTitle.trim(),
      responsibleId: editResponsible || null,
      dueDate: editDueDate || null,
    });
    setIsEditing(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText('');
    await addComment(initiative.id, text);
  };

  const StatusIcon = STATUS_ICON[initiative.status];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
      {isEditing ? (
        <div className="p-3 space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="input text-sm"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={editResponsible}
              onChange={e => setEditResponsible(e.target.value)}
              className="select text-xs py-1.5"
            >
              <option value="">Sin asignar</option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
              ))}
            </select>
            <input
              type="date"
              value={editDueDate}
              onChange={e => setEditDueDate(e.target.value)}
              className="input text-xs py-1.5"
            />
          </div>
          <div className="flex justify-end gap-1">
            <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
              Cancelar
            </button>
            <button
              onClick={saveEdit}
              disabled={!editTitle.trim()}
              className="text-xs bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2.5">
          <div className="flex items-start gap-2">
            <button
              onClick={cycleStatus}
              className={`flex-shrink-0 mt-0.5 ${STATUS_COLOR[initiative.status]} hover:opacity-70 transition-opacity`}
              title={`Estado: ${STATUS_LABEL[initiative.status]} (click para cambiar)`}
            >
              <StatusIcon className="w-4 h-4" strokeWidth={initiative.status === 'done' ? 3 : 2} />
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${initiative.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>
                {initiative.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                {respName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{respName}</span>
                  </span>
                )}
                {initiative.dueDate && (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger-600 font-medium' : ''}`}>
                    <Calendar className="w-3 h-3" />
                    {parseLocalDate(initiative.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setShowComments(s => !s)}
                className={`p-1.5 rounded-md transition-colors ${showComments || comments.length > 0 ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30' : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                title="Comentarios"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {comments.length > 0 && (
                  <span className="ml-1 text-[10px] font-semibold">{comments.length}</span>
                )}
              </button>
              <button
                onClick={startEdit}
                className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Editar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {showComments && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              {comments.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c.id} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {c.userName || 'Usuario'}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {c.userId === appUser?.id && (
                            <button
                              onClick={() => deleteComment(c.id, initiative.id)}
                              className="text-gray-300 hover:text-danger-500"
                              title="Eliminar comentario"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Sin comentarios todavía.</p>
              )}
              <div className="flex gap-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                  placeholder="Escribir comentario..."
                  className="input text-xs py-1 flex-1"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="p-1.5 text-primary-600 hover:text-primary-700 disabled:text-gray-300"
                  title="Enviar"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-backdrop animate-fade-in" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl animate-scale-in max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar iniciativa
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Eliminar "{initiative.title}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary btn-sm">
                Cancelar
              </button>
              <button
                onClick={() => { deleteInitiative(initiative.id); setConfirmDelete(false); }}
                className="btn-danger btn-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
