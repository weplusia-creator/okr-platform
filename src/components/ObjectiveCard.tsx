import { Link } from 'react-router-dom';
import { ChevronRight, Clock, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import type { Objective } from '../types';
import { StatusBadge } from './StatusBadge';
import { calculateObjectiveProgress } from '../utils/helpers';

interface ObjectiveCardProps {
  objective: Objective;
  /** Optional kept for backwards compatibility — ignored in this compact card. */
  defaultExpanded?: boolean;
}

/**
 * Compact list-row for an Objective. The whole card is a link to
 * /okrs/objectives/:id where the deep view lives.
 *
 * Pacing logic mirrors the detail page: we compare actual progress to
 * the % of the time window already elapsed.
 */
export function ObjectiveCard({ objective }: ObjectiveCardProps) {
  const progress = calculateObjectiveProgress(objective);
  // Find this objective's area (if any) so we can render a colored chip
  const { areas } = useOKR();
  const area = areas.find(a => a.id === objective.areaId);
  const timeProgress = calcTimeProgress(objective.startDate, objective.endDate);
  const delta = progress - timeProgress;

  // Pacing label + colour (matches the detail page).
  const pacing =
    objective.status === 'completed' ? { label: 'Completado', tone: 'emerald', Icon: CheckCircle2 }
    : objective.status === 'cancelled' ? { label: 'Cancelado',  tone: 'gray',    Icon: Clock }
    : delta >= 5   ? { label: `+${Math.round(delta)} pts`, tone: 'emerald', Icon: TrendingUp }
    : delta >= -10 ? { label: 'En tiempo',                 tone: 'primary', Icon: Clock }
                   : { label: `${Math.round(delta)} pts`,  tone: 'rose',    Icon: TrendingDown };

  const tone = TONE[pacing.tone];

  return (
    <Link
      to={`/okrs/objectives/${objective.id}`}
      className="group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm transition-all overflow-hidden"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Status accent strip on the left edge */}
        <span className={`shrink-0 w-1 h-10 rounded-full ${tone.bar}`} />

        {/* Title + meta row */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {objective.quarter} · {objective.year}
            </span>
            <StatusBadge status={objective.status} size="sm" />
            {area && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md text-white shadow-sm"
                style={{ backgroundColor: area.color }}
                title={`Área: ${area.name}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                {area.name}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {objective.title}
          </h3>
        </div>

        {/* Progress + pacing column */}
        <div className="shrink-0 flex items-center gap-4">
          {/* Progress bar */}
          <div className="hidden sm:flex flex-col items-end w-40">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-bold text-gray-900 dark:text-white tabular-nums">{progress}%</span>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="tabular-nums">{timeProgress}%</span>
            </div>
            <div className="relative w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${tone.bar} transition-all duration-500`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-gray-500 dark:bg-gray-400 rounded-full"
                style={{ left: `calc(${Math.min(100, timeProgress)}% - 1px)` }}
              />
            </div>
          </div>

          {/* Pacing chip */}
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border ${tone.chip}`}>
            <pacing.Icon className="w-3 h-3" />
            {pacing.label}
          </span>

          {/* Chevron */}
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* KR count strip (very compact, mobile-friendly) */}
      <div className="sm:hidden px-4 pb-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="font-bold text-gray-900 dark:text-white tabular-nums">{progress}%</span>
        <span>·</span>
        <span>{objective.keyResults.length} KRs</span>
      </div>
    </Link>
  );
}

// ─── Helpers ────────────────────────────────────────────

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
  emerald: { chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', bar: 'bg-emerald-500' },
  primary: { chip: 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border-primary-500/30', bar: 'bg-primary-500' },
  rose:    { chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',             bar: 'bg-rose-500' },
  gray:    { chip: 'bg-gray-200/60 text-gray-700 dark:text-gray-300 border-gray-300/40 dark:bg-gray-700/50 dark:border-gray-700', bar: 'bg-gray-400' },
};
