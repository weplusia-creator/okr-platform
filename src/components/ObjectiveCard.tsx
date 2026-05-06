import { useState, useMemo, useEffect, type FormEvent } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  User,
  Target,
  ListTodo,
} from 'lucide-react';
import type { Objective } from '../types';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';
import { KeyResultItem } from './KeyResultItem';
import { ObjectiveForm } from './ObjectiveForm';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';
import { calculateObjectiveProgress, formatDate } from '../utils/helpers';

interface ObjectiveCardProps {
  objective: Objective;
  defaultExpanded?: boolean;
}

export function ObjectiveCard({ objective, defaultExpanded }: ObjectiveCardProps) {
  const { deleteObjective, addKeyResult, initiatives } = useOKR();
  const { isAdmin } = useAuth();

  // Default-expand only when there are few KRs to keep things scannable.
  const initialExpanded =
    defaultExpanded !== undefined
      ? defaultExpanded
      : objective.keyResults.length > 0 && objective.keyResults.length <= 3;
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  useEffect(() => {
    if (defaultExpanded !== undefined) setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddKR, setShowAddKR] = useState(false);
  const [newKRTitle, setNewKRTitle] = useState('');

  const progress = calculateObjectiveProgress(objective);

  const objInitiatives = useMemo(() => {
    const krIds = new Set(objective.keyResults.map(kr => kr.id));
    return initiatives.filter(i => krIds.has(i.keyResultId));
  }, [initiatives, objective.keyResults]);

  const initiativeStats = useMemo(() => {
    const done = objInitiatives.filter(i => i.status === 'done').length;
    return { done, total: objInitiatives.length };
  }, [objInitiatives]);

  const handleDelete = () => {
    deleteObjective(objective.id);
    setShowDeleteConfirm(false);
  };

  const handleAddKeyResult = (e: FormEvent) => {
    e.preventDefault();
    if (newKRTitle.trim()) {
      addKeyResult(objective.id, { title: newKRTitle.trim(), progress: 0 });
      setNewKRTitle('');
      setShowAddKR(false);
    }
  };

  return (
    <>
      <div className="card-hover animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {objective.quarter} {objective.year}
                </span>
                <StatusBadge status={objective.status} size="sm" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {objective.title}
              </h3>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                title="Editar objetivo"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
                  title="Eliminar objetivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {objective.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
              {objective.description}
            </p>
          )}

          {/* Progress */}
          <div className="mb-4">
            <ProgressBar progress={progress} size="md" />
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{objective.owner}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(objective.startDate)} - {formatDate(objective.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>{objective.keyResults.length} KR</span>
            </div>
            {initiativeStats.total > 0 && (
              <div className="flex items-center gap-1.5">
                <ListTodo className="w-4 h-4" />
                <span>
                  {initiativeStats.done}/{initiativeStats.total} iniciativas
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-3 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar detalle
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver Key Results e iniciativas
            </>
          )}
        </button>

        {/* Key Results */}
        {isExpanded && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="pt-4 space-y-2">
              {objective.keyResults.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  No hay Key Results definidos para este objetivo.
                </p>
              ) : (
                objective.keyResults.map((kr) => (
                  <KeyResultItem
                    key={kr.id}
                    keyResult={kr}
                    objectiveId={objective.id}
                  />
                ))
              )}

              {showAddKR ? (
                <form onSubmit={handleAddKeyResult} className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={newKRTitle}
                    onChange={(e) => setNewKRTitle(e.target.value)}
                    placeholder="Título del nuevo Key Result"
                    className="input text-sm flex-1"
                    autoFocus
                  />
                  <button type="submit" className="btn-primary btn-sm">
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddKR(false);
                      setNewKRTitle('');
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddKR(true)}
                  className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Key Result
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ObjectiveForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        objective={objective}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="modal-backdrop animate-fade-in"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl animate-scale-in max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Objetivo
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que quieres eliminar "{objective.title}"? Esta acción
              eliminará también todos los Key Results asociados y no se puede deshacer.
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
    </>
  );
}
