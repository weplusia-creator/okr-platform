import { useState } from 'react';
import { Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import type { KeyResult } from '../types';
import { ProgressBar } from './ProgressBar';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';

interface KeyResultItemProps {
  keyResult: KeyResult;
  objectiveId: string;
}

export function KeyResultItem({ keyResult, objectiveId }: KeyResultItemProps) {
  const { updateKeyResult, deleteKeyResult } = useOKR();
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProgress, setEditedProgress] = useState(keyResult.progress);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
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
      </div>

      {/* Delete confirmation */}
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
              ¿Estás seguro de que quieres eliminar este Key Result? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary btn-sm"
              >
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
