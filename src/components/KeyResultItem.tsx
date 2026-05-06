import { useState, useMemo } from 'react';
import { Trash2, Edit2, Check, X, GripVertical, Plus, ChevronDown, ChevronRight, ListTodo, MessageCircle } from 'lucide-react';
import type { KeyResult } from '../types';
import { ProgressBar } from './ProgressBar';
import { InitiativeRow } from './InitiativeRow';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';

interface KeyResultItemProps {
  keyResult: KeyResult;
  objectiveId: string;
}

export function KeyResultItem({ keyResult, objectiveId }: KeyResultItemProps) {
  const { updateKeyResult, deleteKeyResult, initiatives, addInitiative, initiativeComments } = useOKR();
  const { isAdmin, orgUsers } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProgress, setEditedProgress] = useState(keyResult.progress);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInitiatives, setShowInitiatives] = useState(true);

  const [showInitForm, setShowInitForm] = useState(false);
  const [initTitle, setInitTitle] = useState('');
  const [initResponsible, setInitResponsible] = useState('');
  const [initDueDate, setInitDueDate] = useState('');
  const [initSaving, setInitSaving] = useState(false);

  const krInitiatives = useMemo(
    () => initiatives.filter(i => i.keyResultId === keyResult.id),
    [initiatives, keyResult.id],
  );

  const totalComments = useMemo(
    () => krInitiatives.reduce((sum, i) => sum + (initiativeComments[i.id]?.length || 0), 0),
    [krInitiatives, initiativeComments],
  );

  const doneCount = krInitiatives.filter(i => i.status === 'done').length;

  const activeUsers = useMemo(
    () => orgUsers.filter(u => u.status === 'active' && u.userType !== 'client'),
    [orgUsers],
  );

  const handleSaveProgress = () => {
    updateKeyResult(objectiveId, keyResult.id, { progress: editedProgress });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProgress(keyResult.progress);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteKeyResult(objectiveId, keyResult.id);
    setShowDeleteConfirm(false);
  };

  const handleAddInitiative = async () => {
    if (!initTitle.trim()) return;
    setInitSaving(true);
    await addInitiative(keyResult.id, {
      title: initTitle.trim(),
      responsibleId: initResponsible || null,
      dueDate: initDueDate || null,
    });
    setInitTitle('');
    setInitResponsible('');
    setInitDueDate('');
    setShowInitForm(false);
    setInitSaving(false);
    setShowInitiatives(true);
  };

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="group flex items-start gap-3 p-3">
        <div className="flex-shrink-0 mt-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {keyResult.title}
            </p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                    title="Editar progreso"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {keyResult.targetValue !== undefined && keyResult.currentValue !== undefined && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {keyResult.currentValue} / {keyResult.targetValue} {keyResult.unit}
            </p>
          )}

          {isEditing ? (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={editedProgress}
                onChange={(e) => setEditedProgress(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
                {editedProgress}%
              </span>
              <button
                onClick={handleSaveProgress}
                className="p-1.5 rounded-md text-success-600 hover:bg-success-50 dark:hover:bg-success-900/30 transition-colors"
                title="Guardar"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <ProgressBar progress={keyResult.progress} size="sm" />
          )}

          {/* Counts row */}
          {(krInitiatives.length > 0 || totalComments > 0) && (
            <button
              onClick={() => setShowInitiatives(s => !s)}
              className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {showInitiatives ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span className="flex items-center gap-1">
                <ListTodo className="w-3 h-3" />
                {doneCount}/{krInitiatives.length} iniciativas
              </span>
              {totalComments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {totalComments}
                </span>
              )}
            </button>
          )}

          {/* Initiatives list */}
          {showInitiatives && krInitiatives.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {krInitiatives.map(init => (
                <InitiativeRow key={init.id} initiative={init} />
              ))}
            </div>
          )}

          {/* Add initiative button / form */}
          {showInitForm ? (
            <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-2">
              <input
                type="text"
                value={initTitle}
                onChange={e => setInitTitle(e.target.value)}
                placeholder="Título de la iniciativa"
                className="input text-sm py-1.5"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddInitiative(); } }}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={initResponsible}
                  onChange={e => setInitResponsible(e.target.value)}
                  className="select text-xs py-1.5"
                >
                  <option value="">Sin asignar</option>
                  {activeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={initDueDate}
                  onChange={e => setInitDueDate(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => { setShowInitForm(false); setInitTitle(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddInitiative}
                  disabled={!initTitle.trim() || initSaving}
                  className="text-xs bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {initSaving ? 'Creando...' : 'Crear iniciativa'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInitForm(true)}
              className="mt-2 w-full py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Iniciativa
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="modal-backdrop animate-fade-in"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl animate-scale-in max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Key Result
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Eliminar este Key Result y todas sus iniciativas? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary btn-sm">
                Cancelar
              </button>
              <button onClick={handleDelete} className="btn-danger btn-sm">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
