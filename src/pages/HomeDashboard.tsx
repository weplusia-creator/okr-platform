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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useFinance } from '../context/FinanceContext';
import { PROJECT_STATUS_CONFIG } from '../types/projects';
import type { Project } from '../types/projects';

// Status buckets — only `in_progress` and `approved` count as "active" for
// the default view. Everything else lives behind the toggle.
const ACTIVE_STATUSES: ReadonlyArray<Project['status']> = ['in_progress', 'approved'];

// Each shortcut lands on the project detail with a ?tab= query so the
// user opens directly on the relevant section.
type Shortcut = {
  key: string;
  label: string;
  tab: string;
  Icon: typeof Layers;
  accent: string; // tailwind classes for the icon background
};
const SHORTCUTS: Shortcut[] = [
  { key: 'modules',      label: 'Módulos',      tab: 'modules',      Icon: Layers,        accent: 'bg-primary-500/10  text-primary-600  dark:text-primary-400' },
  { key: 'deliverables', label: 'Tareas',       tab: 'deliverables', Icon: ListChecks,    accent: 'bg-emerald-500/10  text-emerald-600  dark:text-emerald-400' },
  { key: 'novedades',    label: 'Novedades',    tab: 'novedades',    Icon: MessageSquare, accent: 'bg-amber-500/10    text-amber-600    dark:text-amber-400' },
  { key: 'nps',          label: 'NPS',          tab: 'nps',          Icon: Smile,         accent: 'bg-pink-500/10     text-pink-600     dark:text-pink-400' },
];

export function HomeDashboard() {
  const { appUser } = useAuth();
  const { projects, modules, loading: projectsLoading } = useProjects();
  const { clients } = useFinance();
  const [showArchived, setShowArchived] = useState(false);

  // Resolve client name once per render so cards don't each re-scan the array.
  const clientById = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [clients]);

  // Group modules by project for cheap progress lookup.
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

  return (
    <div className="space-y-8">
      {/* ── Greeting (compact) ───────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {firstName ? `Hola, ${firstName}` : 'Hola'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Estos son tus proyectos activos. Tocá un atajo para entrar directo a la sección.
        </p>
      </div>

      {/* ── Active projects ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white">
            <Briefcase className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Proyectos activos
            <span className="text-sm font-normal text-gray-400">({activeProjects.length})</span>
          </h2>
          <Link
            to="/projects/list"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Ver todos →
          </Link>
        </div>

        {projectsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
            <Briefcase className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              No tenés proyectos activos. Cuando aprobes una propuesta o pongas un proyecto en curso, va a aparecer acá.
            </p>
            <Link to="/projects/new" className="btn-primary btn-sm inline-flex">
              Crear proyecto
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {showArchived ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {showArchived ? 'Ocultar' : 'Ver'} proyectos archivados ({archivedProjects.length})
          </button>

          {showArchived && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
  const pct = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div
      className={
        'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 hover:shadow-md transition-shadow ' +
        (dim ? 'opacity-70' : '')
      }
    >
      {/* Header: name + status pill */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          to={`/projects/${project.id}`}
          className="flex-1 min-w-0 group"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {project.name}
          </h3>
          {clientName && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{clientName}</span>
            </p>
          )}
        </Link>
        <span
          className={`shrink-0 text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${status.bgClass}`}
          style={{ color: status.color }}
          title={status.label}
        >
          {status.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {progress?.completed ?? 0} de {progress?.total ?? 0} módulos
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Shortcut grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {SHORTCUTS.map(s => (
          <Link
            key={s.key}
            to={`/projects/${project.id}?tab=${s.tab}`}
            className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            title={s.label}
          >
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${s.accent}`}>
              <s.Icon className="w-4 h-4" />
            </span>
            <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full text-center">
              {s.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Footer micro-info */}
      {project.estimatedEndDate && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          Entrega est.: {new Date(project.estimatedEndDate).toLocaleDateString('es-AR')}
        </div>
      )}
    </div>
  );
}
