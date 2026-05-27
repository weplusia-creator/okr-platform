import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Layers,
  ListChecks,
  MessageSquare,
  Smile,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useFinance } from '../context/FinanceContext';
import { PROJECT_STATUS_CONFIG } from '../types/projects';
import type { Project } from '../types/projects';

// Status buckets — only `in_progress` and `approved` count as "active" for
// the default view. Everything else lives behind the toggle.
const ACTIVE_STATUSES: ReadonlyArray<Project['status']> = ['in_progress', 'approved'];

type Shortcut = {
  key: string;
  label: string;
  tab: string;
  Icon: typeof Layers;
  /** Tailwind classes for the icon's circular background. */
  accent: string;
  /** Tailwind ring color shown on hover for an extra accent. */
  ring: string;
};

const SHORTCUTS: Shortcut[] = [
  { key: 'modules',      label: 'Módulos',    tab: 'modules',      Icon: Layers,        accent: 'bg-gradient-to-br from-primary-500 to-primary-600',  ring: 'group-hover:ring-primary-400/40' },
  { key: 'deliverables', label: 'Tareas',     tab: 'deliverables', Icon: ListChecks,    accent: 'bg-gradient-to-br from-emerald-500 to-emerald-600', ring: 'group-hover:ring-emerald-400/40' },
  { key: 'novedades',    label: 'Novedades',  tab: 'novedades',    Icon: MessageSquare, accent: 'bg-gradient-to-br from-amber-500 to-orange-500',     ring: 'group-hover:ring-amber-400/40' },
  { key: 'nps',          label: 'NPS',        tab: 'nps',          Icon: Smile,         accent: 'bg-gradient-to-br from-pink-500 to-rose-500',        ring: 'group-hover:ring-pink-400/40' },
];

export function HomeDashboard() {
  const { appUser, organization } = useAuth();
  const { projects, modules, loading: projectsLoading } = useProjects();
  const { clients } = useFinance();
  const [showArchived, setShowArchived] = useState(false);

  const clientById = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [clients]);

  const modulesByProject = useMemo(() => {
    const acc: Record<string, { total: number; completed: number }> = {};
    modules.forEach(m => {
      if (!acc[m.projectId]) acc[m.projectId] = { total: 0, completed: 0 };
      acc[m.projectId].total += 1;
      if (m.status === 'completed') acc[m.projectId].completed += 1;
    });
    return acc;
  }, [modules]);

  const activeProjects = useMemo(
    () => projects.filter(p => ACTIVE_STATUSES.includes(p.status))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );
  const archivedProjects = useMemo(
    () => projects.filter(p => !ACTIVE_STATUSES.includes(p.status))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );

  const firstName = appUser?.fullName?.split(' ')[0] || '';

  // Time-of-day greeting feels more alive than a static "Hola".
  const hour = new Date().getHours();
  const greeting =
    hour < 6  ? 'Buenas noches'
    : hour < 13 ? 'Buenos días'
    : hour < 20 ? 'Buenas tardes'
    : 'Buenas noches';

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-gradient-to-br from-primary-50 via-white to-amber-50 dark:from-primary-950/40 dark:via-gray-900 dark:to-amber-950/30 px-6 py-8 sm:px-8 sm:py-10">
        {/* Decorative blurred blobs */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-primary-300/30 dark:bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-amber-300/30 dark:bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <picture>
              <source srcSet="/wau-logo-white.png" media="(prefers-color-scheme: dark)" />
              <img
                src="/wau-logo-black.png"
                alt="WAU"
                className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
              />
            </picture>
            <div className="hidden sm:block w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-xs uppercase tracking-wider text-primary-700 dark:text-primary-400 font-medium">
                {organization?.name || 'WAU Platform'}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-gray-600 dark:text-gray-300">
              {activeProjects.length} {activeProjects.length === 1 ? 'proyecto activo' : 'proyectos activos'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Active projects ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                Tus proyectos
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Atajos directos a cada sección
              </p>
            </div>
          </div>
          <Link
            to="/projects/list"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {projectsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
          </div>
        ) : activeProjects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                clientName={p.clientId ? clientById[p.clientId] : undefined}
                progress={modulesByProject[p.id]}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Archived projects toggle ─────────────────────── */}
      {archivedProjects.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowArchived(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {showArchived ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {showArchived ? 'Ocultar' : 'Ver'} proyectos archivados
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({archivedProjects.length})
            </span>
          </button>

          {showArchived && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {archivedProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  clientName={p.clientId ? clientById[p.clientId] : undefined}
                  progress={modulesByProject[p.id]}
                  dim
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/40 p-12 text-center">
      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/10">
        <Briefcase className="w-7 h-7 text-primary-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        Todavía no hay proyectos activos
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
        Cuando aprobes una propuesta o muevas un proyecto a "en curso", lo vas a ver acá con todos los accesos directos.
      </p>
      <Link
        to="/projects/new"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium shadow-sm transition-colors"
      >
        Crear proyecto
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Project card
// ────────────────────────────────────────────────────────

function ProjectCard({
  project,
  clientName,
  progress,
  dim = false,
}: {
  project: Project;
  clientName?: string;
  progress?: { total: number; completed: number };
  dim?: boolean;
}) {
  const status = PROJECT_STATUS_CONFIG[project.status];
  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className={
        'group relative rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/60 ' +
        'shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ' +
        (dim ? 'opacity-60 hover:opacity-90' : '')
      }
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: status.color, opacity: 0.85 }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <Link to={`/projects/${project.id}`} className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-[15px]">
              {project.name}
            </h3>
            {clientName ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{clientName}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-400 italic">Sin cliente</p>
            )}
          </Link>
          <span
            className={`shrink-0 text-[10px] uppercase font-bold px-2 py-1 rounded-full ${status.bgClass}`}
            style={{ color: status.color }}
            title={status.label}
          >
            {status.label}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completed} de {total} módulos
            </span>
            <span className="font-bold text-gray-900 dark:text-white tabular-nums">
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Shortcut grid */}
        <div className="grid grid-cols-4 gap-2">
          {SHORTCUTS.map(s => (
            <Link
              key={s.key}
              to={`/projects/${project.id}?tab=${s.tab}`}
              className="group/shortcut flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              title={s.label}
            >
              <span
                className={
                  `flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-sm ` +
                  `${s.accent} ring-2 ring-transparent ${s.ring} ` +
                  `group-hover/shortcut:scale-110 group-hover/shortcut:shadow-md transition-all duration-200`
                }
              >
                <s.Icon className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate w-full text-center group-hover/shortcut:text-gray-900 dark:group-hover/shortcut:text-white transition-colors">
                {s.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Footer micro-info */}
        {project.estimatedEndDate && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Entrega est.
            </span>
            <span className="font-medium tabular-nums">
              {new Date(project.estimatedEndDate).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
