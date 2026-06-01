import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, CheckCircle2, Circle, Plus, ListChecks, Target, Phone,
  AlertTriangle, Calendar, ArrowRight, Sparkles, Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTask } from '../../context/TaskContext';
import { useCRM } from '../../context/CRMContext';
import { useOKR } from '../../context/OKRContext';
import { toast } from '../../components/ui/toast';
import type { ActivityType } from '../../types/crm';

// ---- types --------------------------------------------------------------

type ItemSource = 'task' | 'activity' | 'initiative';

interface DiaItem {
  id: string;
  source: ItemSource;
  title: string;
  subtitle?: string;
  dueDate: string | null;
  href?: string;
  isPrivate?: boolean;
  // Action: marca como done en su contexto correspondiente
  complete: () => Promise<void>;
  sortKey: number;
}

type Bucket = 'vencidos' | 'hoy' | 'semana' | 'despues' | 'sin_fecha';
const BUCKET_LABEL: Record<Bucket, string> = {
  vencidos: 'Vencidos',
  hoy: 'Hoy',
  semana: 'Esta semana',
  despues: 'Mas adelante',
  sin_fecha: 'Sin fecha',
};

const SOURCE_LABEL: Record<ItemSource, string> = {
  task: 'Tarea',
  activity: 'CRM',
  initiative: 'OKR',
};

const SOURCE_ICON = {
  task: ListChecks,
  activity: Phone,
  initiative: Target,
} as const;

const SOURCE_TONE = {
  task: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  activity: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  initiative: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
} as const;

// ---- helpers ------------------------------------------------------------

function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketFor(dueDate: string | null): Bucket {
  if (!dueDate) return 'sin_fecha';
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const hoy = todayLocal();
  const days = Math.round((due.getTime() - hoy.getTime()) / 86_400_000);
  if (days < 0) return 'vencidos';
  if (days === 0) return 'hoy';
  if (days <= 7) return 'semana';
  return 'despues';
}

function dueLabel(dueDate: string | null): string {
  if (!dueDate) return '';
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const hoy = todayLocal();
  const days = Math.round((due.getTime() - hoy.getTime()) / 86_400_000);
  if (days < 0) return `vencida hace ${Math.abs(days)}d`;
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days <= 7) return `en ${days}d`;
  return due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  llamada: 'Llamada',
  email: 'Email',
  reunion: 'Reunion',
  tarea: 'Tarea',
  nota: 'Nota',
};

// ---- component ----------------------------------------------------------

export function MiDia() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { tasks, fetchTasks, addTask, updateTask } = useTask();
  const { activities, fetchActivities, completeActivity } = useCRM();
  const { initiatives, fetchInitiatives, updateInitiative } = useOKR();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPrivate, setNewTaskPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchActivities();
    fetchInitiatives();
  }, [fetchTasks, fetchActivities, fetchInitiatives]);

  const myItems = useMemo<DiaItem[]>(() => {
    if (!appUser?.id) return [];

    const out: DiaItem[] = [];

    // -- Tasks asignadas a mi (no done) --
    for (const t of tasks) {
      if (t.responsibleId !== appUser.id) continue;
      if (t.status === 'done' && !showCompleted) continue;
      out.push({
        id: `task:${t.id}`,
        source: 'task',
        title: t.title,
        subtitle: t.description || undefined,
        dueDate: t.dueDate,
        href: `/tareas`,
        isPrivate: t.isPrivate,
        complete: async () => { await updateTask(t.id, { status: 'done' }); },
        sortKey: t.dueDate ? new Date(t.dueDate).getTime() : Number.MAX_SAFE_INTEGER,
      });
    }

    // -- CRM Activities owned by me (no completadas) --
    for (const a of activities) {
      if (a.ownerId !== appUser.id) continue;
      if (a.isCompleted && !showCompleted) continue;
      const link = a.leadId
        ? `/crm/leads/${a.leadId}`
        : a.dealId ? `/crm/deals/${a.dealId}` : '/crm/activities';
      out.push({
        id: `activity:${a.id}`,
        source: 'activity',
        title: a.subject,
        subtitle: ACTIVITY_TYPE_LABEL[a.activityType] || undefined,
        dueDate: a.dueDate,
        href: link,
        complete: async () => { await completeActivity(a.id); },
        sortKey: a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER,
      });
    }

    // -- OKR Initiatives donde soy responsable (no done) --
    for (const i of initiatives) {
      if (i.responsibleId !== appUser.id) continue;
      if (i.status === 'done' && !showCompleted) continue;
      out.push({
        id: `initiative:${i.id}`,
        source: 'initiative',
        title: i.title,
        subtitle: i.description || undefined,
        dueDate: i.dueDate,
        href: `/okrs/initiatives`,
        complete: async () => { await updateInitiative(i.id, { status: 'done' }); },
        sortKey: i.dueDate ? new Date(i.dueDate).getTime() : Number.MAX_SAFE_INTEGER,
      });
    }

    return out.sort((a, b) => a.sortKey - b.sortKey);
  }, [appUser?.id, tasks, activities, initiatives, showCompleted,
      updateTask, completeActivity, updateInitiative]);

  // Group by bucket, preserving order
  const grouped = useMemo(() => {
    const map: Record<Bucket, DiaItem[]> = {
      vencidos: [], hoy: [], semana: [], despues: [], sin_fecha: [],
    };
    for (const item of myItems) {
      map[bucketFor(item.dueDate)].push(item);
    }
    return map;
  }, [myItems]);

  const totals = {
    total: myItems.length,
    vencidos: grouped.vencidos.length,
    hoy: grouped.hoy.length,
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !appUser?.id) return;
    setCreating(true);
    try {
      const created = await addTask({
        title,
        responsibleId: appUser.id,
        dueDate: null,
        isPrivate: newTaskPrivate,
      });
      if (created) {
        setNewTaskTitle('');
        setNewTaskPrivate(false);
        toast.success(newTaskPrivate ? 'Tarea privada agregada (solo vos la ves)' : 'Tarea agregada a tu día');
      } else {
        toast.error('No se pudo crear la tarea');
      }
    } catch (err: any) {
      toast.error('Error: ' + (err?.message || 'Desconocido'));
    } finally {
      setCreating(false);
    }
  };

  const handleComplete = async (item: DiaItem) => {
    try {
      await item.complete();
      toast.success(`✓ ${item.title.slice(0, 60)}`);
    } catch (err: any) {
      toast.error('No se pudo marcar como completada: ' + (err?.message || 'error'));
    }
  };

  const todayStr = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sun className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" />
          Mi día
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
          {todayStr} · {totals.total} pendiente{totals.total === 1 ? '' : 's'}
          {totals.vencidos > 0 && (
            <> · <span className="text-[#FF4632] font-medium">{totals.vencidos} vencid{totals.vencidos === 1 ? 'a' : 'as'}</span></>
          )}
        </p>
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="card p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Agregar tarea a tu día... (Enter para guardar)"
            disabled={creating}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white"
          />
          {newTaskTitle.trim() && (
            <>
              <label
                title="Solo vos podes ver esta tarea (el resto del equipo no la ve en /tareas)"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer select-none text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={newTaskPrivate}
                  onChange={(e) => setNewTaskPrivate(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-[#3100E2] focus:ring-[#3100E2]"
                />
                <Lock className="w-3 h-3" />
                Privada
              </label>
              <button
                type="submit"
                disabled={creating}
                className="px-3 py-1 rounded-md text-xs font-semibold bg-[#3100E2] text-white hover:bg-[#2300a3] transition-colors disabled:opacity-50"
              >
                {creating ? 'Agregando...' : 'Agregar'}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Toggle show completed */}
      <div className="flex items-center justify-end gap-2 -mt-1">
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-[#3100E2] focus:ring-[#3100E2]"
          />
          Mostrar completadas
        </label>
      </div>

      {/* Buckets */}
      {totals.total === 0 ? (
        <div className="card p-10 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">Nada pendiente hoy 🎉</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Disfrutá del aire o agregá la próxima tarea acá arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {(['vencidos', 'hoy', 'semana', 'despues', 'sin_fecha'] as Bucket[]).map((bucket) => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            return (
              <BucketSection
                key={bucket}
                bucket={bucket}
                items={items}
                onComplete={handleComplete}
                onOpen={(href) => navigate(href)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- subcomponents ------------------------------------------------------

function BucketSection({
  bucket, items, onComplete, onOpen,
}: {
  bucket: Bucket;
  items: DiaItem[];
  onComplete: (item: DiaItem) => void;
  onOpen: (href: string) => void;
}) {
  const headerTone =
    bucket === 'vencidos' ? 'text-[#FF4632]' :
    bucket === 'hoy' ? 'text-amber-600 dark:text-amber-400' :
    'text-gray-500 dark:text-gray-400';
  const Icon =
    bucket === 'vencidos' ? AlertTriangle :
    bucket === 'hoy' ? Sun :
    Calendar;

  return (
    <div>
      <h2 className={`flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold mb-2 ${headerTone}`}>
        <Icon className="w-3.5 h-3.5" />
        {BUCKET_LABEL[bucket]}
        <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500 normal-case font-normal">
          ({items.length})
        </span>
      </h2>
      <div className="card divide-y divide-gray-100 dark:divide-[#443f40]">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onComplete={() => onComplete(item)}
            onOpen={() => item.href && onOpen(item.href)}
          />
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  item, onComplete, onOpen,
}: {
  item: DiaItem;
  onComplete: () => void;
  onOpen: () => void;
}) {
  const SourceIcon = SOURCE_ICON[item.source];
  const due = item.dueDate ? dueLabel(item.dueDate) : '';
  const isOverdue = item.dueDate && bucketFor(item.dueDate) === 'vencidos';

  return (
    <div className="flex items-start gap-3 px-3 sm:px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#363233]/60 transition-colors group">
      <button
        type="button"
        onClick={onComplete}
        className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
        aria-label="Marcar como completada"
        title="Marcar como completada"
      >
        <Circle className="w-5 h-5 group-hover:hidden" />
        <CheckCircle2 className="w-5 h-5 hidden group-hover:block" />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${SOURCE_TONE[item.source]}`}>
            <SourceIcon className="w-2.5 h-2.5" />
            {SOURCE_LABEL[item.source]}
          </span>
          {item.isPrivate && (
            <span title="Privada — solo vos la ves" className="inline-flex items-center text-gray-400 dark:text-gray-500">
              <Lock className="w-3 h-3" />
            </span>
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </span>
        </div>
        {item.subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 ml-0.5">
            {item.subtitle}
          </p>
        )}
      </button>
      <div className="flex items-center gap-1 shrink-0">
        {due && (
          <span className={`text-[11px] ${isOverdue ? 'text-[#FF4632] font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
            {due}
          </span>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
