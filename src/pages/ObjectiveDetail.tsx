import { useState, useMemo, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  Target,
  ListTodo,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
} from 'recharts';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { StatusBadge } from '../components/StatusBadge';
import { KeyResultItem } from '../components/KeyResultItem';
import { ObjectiveForm } from '../components/ObjectiveForm';
import { calculateObjectiveProgress, formatDate } from '../utils/helpers';

/**
 * Full-page detail for an Objective with proper analytical charts.
 *
 * Layout:
 *   1) Hero: title + meta + KPI cards
 *   2) Two-column charts row:
 *        a) Circular gauge (actual vs expected)
 *        b) Horizontal bar chart of KR progress (real fill + expected line)
 *   3) Timeline strip: start ─── today ─── end with progress markers
 *   4) Key Results full-width list with their initiatives
 */
export function ObjectiveDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { objectives, initiatives, deleteObjective, addKeyResult, areas } = useOKR();
  const { isAdmin, appUser } = useAuth();
  const { clients } = useFinance();

  // Client users live under /portal/* so we send them back there
  // instead of the admin-only /okrs/clients/:id route.
  const isClientUser = appUser?.userType === 'client';
  const listBackPath = isClientUser
    ? '/portal/okrs'
    : (objectives.find(o => o.id === id)?.clientId
        ? `/okrs/clients/${objectives.find(o => o.id === id)?.clientId}`
        : '/okrs/internal');

  const objective = useMemo(() => objectives.find(o => o.id === id), [objectives, id]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddKR, setShowAddKR] = useState(false);
  const [newKRTitle, setNewKRTitle] = useState('');

  // NOTE: Todos los hooks deben ejecutarse en cada render (reglas de hooks de React).
  // Estos useMemo estaban ANTES debajo del `if (!objective) return`, lo que rompía la
  // página ("rendered more hooks than during the previous render") cada vez que el
  // objetivo todavía estaba cargando. Ahora corren siempre y se protegen internamente
  // cuando el objetivo aún no existe.
  const objInitiatives = useMemo(() => {
    if (!objective) return [];
    const krIds = new Set(objective.keyResults.map(kr => kr.id));
    return initiatives.filter(i => krIds.has(i.keyResultId));
  }, [initiatives, objective]);

  const initiativeStats = useMemo(() => ({
    done: objInitiatives.filter(i => i.status === 'done').length,
    inProgress: objInitiatives.filter(i => i.status === 'in_progress').length,
    todo: objInitiatives.filter(i => i.status === 'todo').length,
    total: objInitiatives.length,
  }), [objInitiatives]);

  const client = useMemo(
    () => objective?.clientId ? clients.find(c => c.id === objective.clientId) : null,
    [clients, objective],
  );

  // Data for the KR breakdown chart.
  const krChartData = useMemo(() => {
    if (!objective) return [];
    const tp = calcTimeProgress(objective.startDate, objective.endDate);
    return objective.keyResults.map((kr, idx) => ({
      name: `KR${idx + 1}`,
      fullName: kr.title,
      progress: kr.progress || 0,
      expected: tp,
      remaining: Math.max(0, 100 - (kr.progress || 0)),
    }));
  }, [objective]);

  // Initiative status pie data.
  const initiativePieData = useMemo(() => [
    { name: 'Hechas',       value: initiativeStats.done,       color: '#10b981' },
    { name: 'En progreso',  value: initiativeStats.inProgress, color: '#f59e0b' },
    { name: 'Por hacer',    value: initiativeStats.todo,       color: '#94a3b8' },
  ].filter(d => d.value > 0), [initiativeStats]);

  if (!objective) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Objetivo no encontrado.
        </p>
        <Link to="/okrs" className="btn-primary inline-flex">Volver al hub</Link>
      </div>
    );
  }

  const progress = calculateObjectiveProgress(objective);
  const timeProgress = calcTimeProgress(objective.startDate, objective.endDate);
  const delta = progress - timeProgress;

  const pacing =
    objective.status === 'completed' ? { label: 'Completado',           tone: 'emerald', Icon: CheckCircle2 }
    : objective.status === 'cancelled' ? { label: 'Cancelado',         tone: 'gray',    Icon: Clock }
    : delta >= 5   ? { label: `Adelantado +${Math.round(delta)} pts`,  tone: 'emerald', Icon: TrendingUp }
    : delta >= -10 ? { label: 'En tiempo',                             tone: 'primary', Icon: Clock }
                   : { label: `Atrasado ${Math.round(delta)} pts`,     tone: 'rose',    Icon: TrendingDown };

  const tone = TONE[pacing.tone];

  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(objective.endDate).getTime() - Date.now()) / 86_400_000,
  ));
  const totalDays = Math.max(1, Math.ceil(
    (new Date(objective.endDate).getTime() - new Date(objective.startDate).getTime()) / 86_400_000,
  ));
  const daysElapsed = totalDays - daysRemaining;

  const ownerInitials = (objective.owner || '?')
    .split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const handleDelete = () => {
    deleteObjective(objective.id);
    navigate(isClientUser ? '/portal/okrs' : (client ? `/okrs/clients/${client.id}` : '/okrs'));
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
        <Link
          to={isClientUser ? '/portal/okrs' : '/okrs'}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {isClientUser ? 'Mis OKRs' : 'OKRs'}
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-gray-700 dark:text-gray-200 truncate">{objective.title}</span>
      </div>

      <Link
        to={listBackPath}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la lista
      </Link>

      {/* ═══════════════════════════════════════════════════
         1) HERO
         ═══════════════════════════════════════════════════ */}
      <header className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 overflow-hidden">
        <div className={`h-1 ${tone.bar}`} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {objective.quarter} · {objective.year}
              </span>
              <StatusBadge status={objective.status} size="sm" />
              {(() => {
                const area = areas.find(a => a.id === objective.areaId);
                return area ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md text-white shadow-sm"
                    style={{ backgroundColor: area.color }}
                    title={`Área: ${area.name}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    {area.name}
                  </span>
                ) : null;
              })()}
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

          {/* KPI cards row */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="Avance real" value={`${progress}%`} tint="emerald" highlight />
            <KPICard label="Esperado hoy" value={`${timeProgress}%`} tint="primary" />
            <KPICard label="Día actual" value={`${daysElapsed} / ${totalDays}`} sublabel={`${daysRemaining} restantes`} tint="amber" />
            <KPICard label="Iniciativas" value={`${initiativeStats.done}/${initiativeStats.total}`} sublabel="hechas" tint="rose" />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
         2) CHARTS ROW — Gauge + KR breakdown + Pie
         ═══════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ─── 2a) Gauge ─── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Real vs esperado</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">El objetivo debería estar al {timeProgress}% hoy.</p>
          <div className="relative w-44 h-44 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              {/* Track */}
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-gray-100 dark:stroke-gray-800" />
              {/* Expected (faded) */}
              <circle
                cx="60" cy="60" r="52" fill="none" strokeWidth="10"
                stroke="currentColor"
                className="text-gray-300 dark:text-gray-600 opacity-70"
                strokeDasharray={`${(Math.min(100, timeProgress) / 100) * (2 * Math.PI * 52)} 999`}
              />
              {/* Actual */}
              <circle
                cx="60" cy="60" r="52" fill="none" strokeWidth="10"
                stroke={tone.hex}
                strokeLinecap="round"
                strokeDasharray={`${(Math.min(100, progress) / 100) * (2 * Math.PI * 52)} 999`}
                style={{ transition: 'stroke-dasharray 700ms ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{progress}%</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">Avance real</span>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tone.hex }} />
              Real {progress}%
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              Esperado {timeProgress}%
            </span>
          </div>
        </div>

        {/* ─── 2b) KR breakdown bar chart ─── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Avance por Key Result</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            La línea punteada marca dónde debería estar cada KR hoy ({timeProgress}%).
          </p>
          {krChartData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-gray-400">
              Sin Key Results todavía
            </div>
          ) : (
            <div className="w-full" style={{ height: Math.max(180, 40 + krChartData.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={krChartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-gray-100 dark:stroke-gray-800" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={40} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={((val: number, _name: any, props: any) => [`${val}%`, props?.payload?.fullName?.slice(0, 60)]) as any}
                    labelFormatter={() => ''}
                  />
                  <ReferenceLine x={timeProgress} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'hoy', position: 'top', fill: '#6b7280', fontSize: 10 }} />
                  <Bar dataKey="progress" radius={[0, 6, 6, 0]}>
                    {krChartData.map((d, i) => (
                      <Cell key={i} fill={d.progress >= timeProgress - 5 ? '#10b981' : d.progress >= timeProgress - 15 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         3) TIMELINE + Initiative pie
         ═══════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ─── Timeline (2/3) ─── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Línea de tiempo</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            {formatDate(objective.startDate)} → {formatDate(objective.endDate)} ({totalDays} días)
          </p>
          <div className="relative h-2 rounded-full bg-gray-100 dark:bg-gray-800 mx-1 mt-12 mb-12">
            {/* progress fill */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${tone.bar} transition-all duration-700`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
            {/* today marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${Math.min(100, timeProgress)}%` }}
            >
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 -mt-7">Hoy</span>
              <span className="w-3 h-3 rounded-full bg-gray-700 dark:bg-gray-300 border-2 border-white dark:border-gray-900 shadow-sm mt-1" />
            </div>
            {/* start/end labels */}
            <div className="absolute -bottom-7 left-0 text-[10px] text-gray-400">Inicio</div>
            <div className="absolute -bottom-7 right-0 text-[10px] text-gray-400">Fin</div>
            <div className="absolute -top-7 left-0 text-[10px] text-gray-500 dark:text-gray-400">
              {formatDate(objective.startDate)}
            </div>
            <div className="absolute -top-7 right-0 text-[10px] text-gray-500 dark:text-gray-400">
              {formatDate(objective.endDate)}
            </div>
          </div>
        </div>

        {/* ─── Initiative pie (1/3) ─── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Iniciativas</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {initiativeStats.total} en total
          </p>
          {initiativePieData.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <ListTodo className="w-7 h-7 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">Todavía no hay iniciativas</p>
            </div>
          ) : (
            <>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={initiativePieData}
                      dataKey="value"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={2}
                    >
                      {initiativePieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={((v: number, n: any) => [`${v}`, n]) as any}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                {initiativePieData.map((d) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         4) KEY RESULTS LIST
         ═══════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Key Results</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Resultados clave del objetivo · {objective.keyResults.length} {objective.keyResults.length === 1 ? 'KR' : 'KRs'}
            </p>
          </div>
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

function KPICard({
  label, value, sublabel, tint, highlight,
}: {
  label: string; value: string; sublabel?: string; tint: 'emerald' | 'primary' | 'amber' | 'rose'; highlight?: boolean;
}) {
  const tints: Record<typeof tint, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    primary: 'bg-primary-500/10 text-primary-700 dark:text-primary-300',
    amber:   'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose:    'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl p-3 ${highlight ? tints[tint] : 'bg-gray-50 dark:bg-gray-800/50'}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums leading-none ${highlight ? '' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sublabel && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sublabel}</p>}
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

const TONE: Record<string, { chip: string; bar: string; hex: string }> = {
  emerald: { chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', bar: 'bg-gradient-to-r from-emerald-500 to-emerald-600', hex: '#10b981' },
  primary: { chip: 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border-primary-500/30', bar: 'bg-gradient-to-r from-primary-500 to-primary-600', hex: '#0ea5e9' },
  rose:    { chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',             bar: 'bg-gradient-to-r from-rose-500 to-rose-600',       hex: '#ef4444' },
  gray:    { chip: 'bg-gray-200/60 text-gray-700 dark:text-gray-300 border-gray-300/40 dark:bg-gray-700/50 dark:border-gray-700', bar: 'bg-gradient-to-r from-gray-400 to-gray-500', hex: '#9ca3af' },
};
