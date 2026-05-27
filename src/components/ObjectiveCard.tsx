import { useState, useMemo, useEffect, type FormEvent } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  Target,
  ListTodo,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { Objective } from '../types';
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

/**
 * Returns the % of time elapsed inside the objective's window today.
 * Used to compute "expected progress" so we can show on-track / behind /
 * ahead pacing — the same pattern Lattice / Mooncamp use.
 */
function calcTimeProgress(startDate: string, endDate: string): number {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export function ObjectiveCard({ objective, defaultExpanded }: ObjectiveCardProps) {
  const { deleteObjective, addKeyResult, initiatives } = useOKR();
  const { isAdmin } = useAuth();

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
  const timeProgress = calcTimeProgress(objective.startDate, objective.endDate);

  // Pacing: how the actual progress compares to where it should be.
  // delta = +20 means "ahead by 20 percentage points", -10 means "10 behind".
  const pacingDelta = progress - timeProgress;
  const pacing: { label: string; tone: string; Icon: typeof TrendingUp } =
    objective.status === 'completed' ? { label: 'Completado', tone: 'emerald', Icon: CheckCircle2 }
    : objective.status === 'cancelled' ? { label: 'Cancelado', tone: 'gray', Icon: Clock }
    : pacingDelta >= 5  ? { label: `Adelantado +${Math.round(pacingDelta)}pts`, tone: 'emerald', Icon: TrendingUp }
    : pacingDelta >= -10 ? { label: 'En tiempo',                                 tone: 'primary', Icon: Clock }
                          : { label: `Atrasado ${Math.round(pacingDelta)}pts`,   tone: 'rose',    Icon: TrendingDown };

  const toneClasses: Record<string, { chip: string; bar: string; dot: string }> = {
    emerald: { chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
               bar:  'bg-gradient-to-r from-emerald-500 to-emerald-600',
               dot:  'bg-emerald-500' },
    primary: { chip: 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border-primary-500/30',
               bar:  'bg-gradient-to-r from-primary-500 to-primary-600',
               dot:  'bg-primary-500' },
    rose:    { chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
               bar:  'bg-gradient-to-r from-rose-500 to-rose-600',
               dot:  'bg-rose-500' },
    gray:    { chip: 'bg-gray-200/60 text-gray-700 dark:text-gray-300 border-gray-300/40 dark:bg-gray-700/50 dark:border-gray-700',
               bar:  'bg-gradient-to-r from-gray-400 to-gray-500',
               dot:  'bg-gray-400' },
  };
  const tone = toneClasses[pacing.tone];

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

  // Days remaining in the window (for the footer).
  const daysRemaining = Math.max(0, Math.ceil((new Date(objective.endDate).getTime() - Date.now()) / 86_400_000));

  // Owner initials for the avatar.
  const ownerInitials = (objective.owner || '?')
    .split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">

        {/* ─── Top accent bar (matches pacing) ─── */}
        <div className={`h-1 w-full ${tone.bar}`} />

        {/* ─── Header ─── */}
        <header className="p-5 pb-3">
          <div className="flex items-start gap-3 mb-2">
            {/* Quarter pill */}
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {objective.quarter} · {objective.year}
            </span>

            {/* Status */}
            <StatusBadge status={objective.status} size="sm" />

            {/* Pacing chip */}
            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${tone.chip}`}>
              <pacing.Icon className="w-3 h-3" />
              {pacing.label}
            </span>

            <div className="flex-1" />

            {/* Owner avatar */}
            <div
              className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
              title={objective.owner}
            >
              {ownerInitials}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                title="Editar objetivo"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
                  title="Eliminar objetivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
            {objective.title}
          </h3>

          {objective.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {objective.description}
            </p>
          )}
        </header>

        {/* ─── Pacing chart: real progress vs expected ─── */}
        <section className="px-5 pb-3">
          <div className="grid grid-cols-3 gap-4 mb-2 text-xs">
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Avance real</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums leading-none mt-0.5">{progress}%</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Esperado</p>
              <p className="text-lg font-bold text-gray-500 dark:text-gray-400 tabular-nums leading-none mt-0.5">{timeProgress}%</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Tiempo restante</p>
              <p className="text-lg font-bold text-gray-700 dark:text-gray-300 tabular-nums leading-none mt-0.5">
                {daysRemaining}<span className="text-xs text-gray-400 font-normal ml-1">días</span>
              </p>
            </div>
          </div>

          {/* The bar itself: actual progress fill + a dashed marker where time-elapsed % sits. */}
          <div className="relative h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-visible">
            {/* Actual progress */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${tone.bar} transition-all duration-500`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
            {/* Expected marker (dashed vertical line) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5 bg-gray-500 dark:bg-gray-400 rounded-full"
              style={{ left: `calc(${Math.min(100, timeProgress)}% - 1px)` }}
              title={`Punto esperado: ${timeProgress}%`}
            />
            <div
              className="absolute -top-5 text-[9px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap"
              style={{ left: `calc(${Math.min(100, timeProgress)}% - 14px)` }}
            >
              hoy
            </div>
          </div>
        </section>

        {/* ─── Meta strip ─── */}
        <div className="px-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Target className="w-3.5 h-3.5" />
            {objective.keyResults.length} {objective.keyResults.length === 1 ? 'KR' : 'KRs'}
          </span>
          {initiativeStats.total > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListTodo className="w-3.5 h-3.5" />
              {initiativeStats.done}/{initiativeStats.total} iniciativas
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(objective.startDate)} → {formatDate(objective.endDate)}
          </span>
          {pacingDelta < -10 && objective.status !== 'completed' && objective.status !== 'cancelled' && (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Necesita atención
            </span>
          )}
        </div>

        {/* ─── Expand toggle ─── */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 transition-colors"
        >
          {isExpanded ? (<><ChevronUp className="w-4 h-4" />Ocultar detalle</>) : (<><ChevronDown className="w-4 h-4" />Ver Key Results e iniciativas</>)}
        </button>

        {/* ─── Key Results ─── */}
        {isExpanded && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/20">
            <div className="pt-4 space-y-2">
              {objective.keyResults.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  No hay Key Results definidos para este objetivo.
                </p>
              ) : (
                objective.keyResults.map((kr) => (
                  <KeyResultItem key={kr.id} keyResult={kr} objectiveId={objective.id} />
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
                  <button type="submit" className="btn-primary btn-sm">Agregar</button>
                  <button
                    type="button"
                    onClick={() => { setShowAddKR(false); setNewKRTitle(''); }}
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
      </article>

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
    </>
  );
}
