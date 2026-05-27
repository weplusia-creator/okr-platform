import { useState, useMemo, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  User,
} from 'lucide-react';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { StatusBadge } from '../components/StatusBadge';
import { KeyResultItem } from '../components/KeyResultItem';
import { ObjectiveForm } from '../components/ObjectiveForm';
import { calculateObjectiveProgress, formatDate } from '../utils/helpers';

/**
 * Full-page detail view for an Objective.
 *
 * Reached via /okrs/objectives/:id. Shows everything that used to be
 * crammed into the list-card: pacing analysis, KRs with their own
 * progress, initiative counts, owner, full date range, delete /
 * edit / add-KR controls.
 */
export function ObjectiveDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { objectives, initiatives, deleteObjective, addKeyResult } = useOKR();
  const { isAdmin } = useAuth();
  const { clients } = useFinance();

  const objective = useMemo(
    () => objectives.find(o => o.id === id),
    [objectives, id],
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddKR, setShowAddKR] = useState(false);
  const [newKRTitle, setNewKRTitle] = useState('');

  if (!objective) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Objetivo no encontrado. Puede haber sido eliminado.
        </p>
        <Link to="/okrs" className="btn-primary inline-flex">
          Volver al hub
        </Link>
      </div>
    );
  }

  const progress = calculateObjectiveProgress(objective);
  const timeProgress = calcTimeProgress(objective.startDate, objective.endDate);
  const delta = progress - timeProgress;

  const pacing =
    objective.status === 'completed' ? { label: 'Completado',                  tone: 'emerald', Icon: CheckCircle2 }
    : objective.status === 'cancelled' ? { label: 'Cancelado',                tone: 'gray',    Icon: Clock }
    : delta >= 5   ? { label: `Adelantado +${Math.round(delta)} pts`,         tone: 'emerald', Icon: TrendingUp }
    : delta >= -10 ? { label: 'En tiempo',                                    tone: 'primary', Icon: Clock }
                   : { label: `Atrasado ${Math.round(delta)} pts`,            tone: 'rose',    Icon: TrendingDown };

  const tone = TONE[pacing.tone];

  // Initiatives bound to KRs of this objective.
  const objInitiatives = useMemo(() => {
    const krIds = new Set(objective.keyResults.map(kr => kr.id));
    return initiatives.filter(i => krIds.has(i.keyResultId));
  }, [initiatives, objective.keyResults]);

  const initiativeStats = useMemo(() => ({
    done: objInitiatives.filter(i => i.status === 'done').length,
    total: objInitiatives.length,
  }), [objInitiatives]);

  const client = useMemo(
    () => objective.clientId ? clients.find(c => c.id === objective.clientId) : null,
    [clients, objective.clientId],
  );

  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(objective.endDate).getTime() - Date.now()) / 86_400_000,
  ));

  const ownerInitials = (objective.owner || '?')
    .split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const handleDelete = () => {
    deleteObjective(objective.id);
    navigate(client ? `/okrs/clients/${client.id}` : '/okrs');
  };

  const handleAddKR = (e: FormEvent) => {
    e.preventDefault();
    if (newKRTitle.trim()) {
      addKeyResult(objective.id, { title: newKRTitle.trim(), progress: 0 });
      setNewKRTitle('');
      setShowAddKR(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb ─── */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/okrs" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">OKRs</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        {client ? (
          <>
            <Link to={`/okrs/clients/${client.id}`} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              {client.name}
            </Link>
            <span className="text-gray-300 dark:text-gray-600">/</span>
          </>
        ) : (
          <>
            <Link to="/okrs/internal" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Internos
            </Link>
            <span className="text-gray-300 dark:text-gray-600">/</span>
          </>
        )}
        <span className="text-gray-700 dark:text-gray-200 truncate">{objective.title}</span>
      </div>

      <Link
        to={client ? `/okrs/clients/${client.id}` : '/okrs/internal'}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la lista
      </Link>

      {/* ─── Hero ─── */}
      <header className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 overflow-hidden">
        <div className={`h-1 ${tone.bar}`} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {objective.quarter} · {objective.year}
              </span>
              <StatusBadge status={objective.status} size="sm" />
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${tone.chip}`}>
                <pacing.Icon className="w-3 h-3" />
                {pacing.label}
              </span>
              {delta < -10 && objective.status !== 'completed' && objective.status !== 'cancelled' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  Necesita atención
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-300 dark:hover:bg-primary-900/30 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg text-gray-600 hover:text-danger-600 hover:bg-danger-50 dark:text-gray-300 dark:hover:bg-danger-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            {objective.title}
          </h1>
          {objective.description && (
            <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              {objective.description}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-4 flex items-center gap-x-5 gap-y-2 flex-wrap text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                {ownerInitials}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{objective.owner}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(objective.startDate)} → {formatDate(objective.endDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              {objective.keyResults.length} {objective.keyResults.length === 1 ? 'Key Result' : 'Key Results'}
            </span>
            {initiativeStats.total > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <ListTodo className="w-4 h-4" />
                {initiativeStats.done}/{initiativeStats.total} iniciativas
              </span>
            )}
          </div>
        </div>

        {/* ─── Pacing chart ─── */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Stat label="Avance real" value={`${progress}%`} highlight />
            <Stat label="Esperado hoy" value={`${timeProgress}%`} />
            <Stat label="Tiempo restante" value={`${daysRemaining} días`} />
          </div>
          <div className="relative h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-visible">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${tone.bar} transition-all duration-700`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-0.5 bg-gray-500 dark:bg-gray-400 rounded-full"
              style={{ left: `calc(${Math.min(100, timeProgress)}% - 1px)` }}
            />
            <div
              className="absolute -top-5 text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap"
              style={{ left: `calc(${Math.min(100, timeProgress)}% - 14px)` }}
            >
              hoy
            </div>
          </div>
        </div>
      </header>

      {/* ─── Key Results ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Key Results</h2>
          <button
            onClick={() => setShowAddKR(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar KR
          </button>
        </div>

        {objective.keyResults.length === 0 && !showAddKR ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Este objetivo todavía no tiene Key Results.
            </p>
            <button onClick={() => setShowAddKR(true)} className="btn-primary btn-sm inline-flex">
              <Plus className="w-4 h-4" />
              Crear el primer KR
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {objective.keyResults.map(kr => (
              <KeyResultItem key={kr.id} keyResult={kr} objectiveId={objective.id} />
            ))}
            {showAddKR && (
              <form onSubmit={handleAddKR} className="flex items-center gap-2 mt-2">
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
            )}
          </div>
        )}
      </section>

      <ObjectiveForm isOpen={showEditModal} onClose={() => setShowEditModal(false)} objective={objective} />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-backdrop animate-fade-in" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl animate-scale-in max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Eliminar Objetivo</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que querés eliminar "{objective.title}"? Se borran también todos los KRs.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary btn-sm">Cancelar</button>
              <button onClick={handleDelete} className="btn-danger btn-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums leading-none ${highlight ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
        {value}
      </p>
    </div>
  );
}

function calcTimeProgress(startDate: string, endDate: string): number {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

const TONE: Record<string, { chip: string; bar: string }> = {
  emerald: { chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', bar: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
  primary: { chip: 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border-primary-500/30', bar: 'bg-gradient-to-r from-primary-500 to-primary-600' },
  rose:    { chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',             bar: 'bg-gradient-to-r from-rose-500 to-rose-600' },
  gray:    { chip: 'bg-gray-200/60 text-gray-700 dark:text-gray-300 border-gray-300/40 dark:bg-gray-700/50 dark:border-gray-700', bar: 'bg-gradient-to-r from-gray-400 to-gray-500' },
};
