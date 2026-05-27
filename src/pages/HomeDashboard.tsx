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

  // Map client id → name + logo + website. Each project card renders
  // the client's brand mark on the left: first the uploaded logo, then
  // the website favicon (via Google's s2 endpoint — same trick used by
  // /projects/list), then initials as the final fallback.
  const clientById = useMemo(() => {
    const map: Record<string, { name: string; logoUrl: string | null; website: string | null }> = {};
    clients.forEach(c => {
      map[c.id] = { name: c.name, logoUrl: c.logoUrl, website: c.website };
    });
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
      {/* Solid black panel with lime-green accents — high contrast, brand-forward. */}
      <div className="relative overflow-hidden rounded-2xl bg-black px-6 py-8 sm:px-10 sm:py-12 shadow-xl">
        {/* Subtle lime glow in the corners (no readability impact) */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-lime-400/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src="/wau-logo-white.png"
              alt="WAU"
              className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
            />
            <div className="hidden sm:block w-px h-12 bg-white/15" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-lime-400/90">
                {organization?.name || 'WAU Platform'}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-lime-400">
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/30">
            <Sparkles className="w-4 h-4 text-lime-400" />
            <span className="text-lime-300 font-medium">
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
                client={p.clientId ? clientById[p.clientId] : undefined}
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
                  client={p.clientId ? clientById[p.clientId] : undefined}
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
  client,
  progress,
  dim = false,
}: {
  project: Project;
  client?: { name: string; logoUrl: string | null; website: string | null };
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
        {/* Header: client logo (or fallback) + project info + status pill */}
        <div className="flex items-start gap-3 mb-3">
          <Link
            to={`/projects/${project.id}`}
            className="shrink-0"
            aria-label={`Abrir ${project.name}`}
          >
            <ClientAvatar
              name={client?.name}
              logoUrl={client?.logoUrl}
              website={client?.website}
            />
          </Link>

          <Link to={`/projects/${project.id}`} className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-[15px]">
              {project.name}
            </h3>
            {client?.name ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{client.name}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-400 italic">Sin cliente</p>
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

// ────────────────────────────────────────────────────────
// Client avatar — uses the uploaded logo when available; otherwise
// renders the client's initials on a coloured disc so every card still
// has a strong visual anchor on the left.
// ────────────────────────────────────────────────────────

function ClientAvatar({
  name,
  logoUrl,
  website,
}: {
  name?: string;
  logoUrl?: string | null;
  website?: string | null;
}) {
  // 1) Uploaded logo wins if available.
  if (logoUrl) {
    return (
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-100 border border-gray-200 dark:border-gray-300 shadow-sm overflow-hidden flex items-center justify-center">
        <img
          src={logoUrl}
          alt={name ? `Logo ${name}` : 'Logo cliente'}
          className="w-full h-full object-contain p-1"
          loading="lazy"
        />
      </div>
    );
  }

  // 2) Website favicon via Google's s2/favicons endpoint — same approach
  //    used in /projects/list. This gives us a brand mark automatically as
  //    long as the client has a `website` field set, no manual upload.
  const domain = (() => {
    if (!website) return null;
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      return new URL(url).hostname;
    } catch {
      return null;
    }
  })();

  if (domain) {
    return (
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-100 border border-gray-200 dark:border-gray-300 shadow-sm overflow-hidden flex items-center justify-center">
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={name ? `Logo ${name}` : 'Logo cliente'}
          className="w-9 h-9 object-contain"
          loading="lazy"
          onError={(e) => {
            // Fallback to initials if Google returns an empty/broken image
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 3) Initials fallback with deterministic gradient colour.
  const initials = (name || '?')
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const palette = [
    'from-primary-500 to-primary-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-orange-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-violet-600',
    'from-sky-500 to-cyan-600',
  ];
  const hash = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradient = palette[hash % palette.length];

  return (
    <div
      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm flex items-center justify-center font-bold text-sm`}
      aria-hidden="true"
    >
      {initials || <Building2 className="w-5 h-5" />}
    </div>
  );
}

