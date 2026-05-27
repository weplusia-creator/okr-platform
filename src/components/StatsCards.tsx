import { useMemo } from 'react';
import { Target, CheckCircle2, Activity, AlertTriangle, Layers } from 'lucide-react';
import { useOKR } from '../context/OKRContext';
import { calculateOKRStats } from '../utils/helpers';

/**
 * Top metrics panel for the OKR Dashboard.
 *
 * Layout: a big circular progress ring on the left summarising the
 * average progress, plus a grid of 4 mini-stat tiles on the right.
 * The ring uses an SVG stroke-dashoffset trick (no extra dependency)
 * and the colour ramps with progress.
 */
export function StatsCards() {
  const { filteredObjectives, initiatives } = useOKR();
  const stats = calculateOKRStats(filteredObjectives);

  // Initiatives belonging to the visible objectives.
  const initiativesScope = useMemo(() => {
    const krIds = new Set<string>();
    filteredObjectives.forEach(o => o.keyResults.forEach(kr => krIds.add(kr.id)));
    const inScope = initiatives.filter(i => krIds.has(i.keyResultId));
    return {
      total: inScope.length,
      done: inScope.filter(i => i.status === 'done').length,
    };
  }, [filteredObjectives, initiatives]);

  const totalKRs = useMemo(
    () => filteredObjectives.reduce((acc, o) => acc + o.keyResults.length, 0),
    [filteredObjectives],
  );

  // Colour ramp for the ring.
  const progressColor =
    stats.averageProgress >= 75 ? '#10b981' :       // emerald
    stats.averageProgress >= 50 ? '#22c55e' :       // green
    stats.averageProgress >= 25 ? '#f59e0b' :       // amber
                                  '#ef4444';        // red

  // SVG circle math
  const radius = 52;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.max(0, Math.min(100, stats.averageProgress)) / 100) * circumference;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-6">

        {/* ─── Progress ring ─── */}
        <div className="flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              {/* Background track */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                strokeWidth={stroke}
                className="stroke-gray-100 dark:stroke-gray-800"
              />
              {/* Foreground */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                strokeWidth={stroke}
                stroke={progressColor}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {stats.averageProgress}<span className="text-lg">%</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">
                Promedio
              </span>
            </div>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
              Progreso global
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-[180px] mt-1">
              {stats.total === 0
                ? 'Todavía no hay objetivos en este filtro.'
                : `Promedio ponderado de ${stats.total} ${stats.total === 1 ? 'objetivo' : 'objetivos'} en pantalla.`}
            </p>
          </div>
        </div>

        {/* ─── Metric tiles ─── */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Tile
            label="Objetivos"
            value={stats.total}
            Icon={Target}
            tint="bg-primary-500/10 text-primary-600 dark:text-primary-400"
          />
          <Tile
            label="Key Results"
            value={totalKRs}
            Icon={Layers}
            tint="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <Tile
            label="En progreso"
            value={stats.inProgress}
            Icon={Activity}
            tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <Tile
            label="Completados"
            value={stats.completed}
            Icon={CheckCircle2}
            tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            sublabel={stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : undefined}
          />
          <Tile
            label="En riesgo"
            value={stats.atRisk}
            Icon={AlertTriangle}
            tint="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            sublabel={initiativesScope.total > 0 ? `${initiativesScope.done}/${initiativesScope.total} iniciativas` : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  Icon,
  tint,
  sublabel,
}: {
  label: string;
  value: number;
  Icon: typeof Target;
  tint: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${tint}`}>
          <Icon className="w-4 h-4" />
        </span>
        {sublabel && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {sublabel}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </p>
    </div>
  );
}
