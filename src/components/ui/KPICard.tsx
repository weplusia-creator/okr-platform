import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type KPITone =
  | 'green' | 'blue' | 'pink' | 'yellow'
  | 'purple' | 'indigo' | 'red' | 'orange' | 'neutral';

export interface KPIDelta {
  /** Signed percentage change. 0 = flat. */
  pct: number;
  /** Optional context, e.g. "vs mes pasado". */
  label?: string;
  /** When true, a *negative* change is shown in green (e.g. expenses going down). */
  invert?: boolean;
}

export interface KPICardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: KPITone;
  to?: string;
  delta?: KPIDelta;
  /** Sparkline data (at least 2 numeric points). */
  series?: number[];
  /** Small caption below the value when no delta is present. */
  hint?: string;
  /** Override the value text color (e.g. red/green for balance). */
  valueClassName?: string;
}

const TONE_BG: Record<KPITone, string> = {
  green: 'bg-green-100 dark:bg-green-900/30',
  blue: 'bg-blue-100 dark:bg-blue-900/30',
  pink: 'bg-pink-100 dark:bg-pink-900/30',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
  purple: 'bg-purple-100 dark:bg-purple-900/30',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
  red: 'bg-red-100 dark:bg-red-900/30',
  orange: 'bg-orange-100 dark:bg-orange-900/30',
  neutral: 'bg-gray-100 dark:bg-gray-700/40',
};

const TONE_ICON: Record<KPITone, string> = {
  green: 'text-green-600 dark:text-green-400',
  blue: 'text-blue-600 dark:text-blue-400',
  pink: 'text-pink-600 dark:text-pink-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  purple: 'text-purple-600 dark:text-purple-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  neutral: 'text-gray-600 dark:text-gray-300',
};

const TONE_STROKE: Record<KPITone, string> = {
  green: '#10B981',
  blue: '#3B82F6',
  pink: '#EC4899',
  yellow: '#F59E0B',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  red: '#EF4444',
  orange: '#F97316',
  neutral: '#6B7280',
};

function formatDeltaPct(pct: number): string {
  const abs = Math.abs(pct);
  if (!isFinite(abs)) return '∞%';
  if (abs >= 1000) return `${Math.round(abs / 100) / 10}k%`;
  if (abs >= 100) return `${Math.round(abs)}%`;
  if (abs >= 10) return `${Math.round(abs)}%`;
  return `${abs.toFixed(1)}%`;
}

export function KPICard({
  label, value, icon, tone = 'neutral', to,
  delta, series, hint, valueClassName,
}: KPICardProps) {
  const sparkData =
    series && series.length > 1 ? series.map((v, i) => ({ i, v })) : null;

  const hasDelta = !!delta && isFinite(delta.pct);
  const isFlat = hasDelta && Math.abs(delta!.pct) < 0.05;
  const isUp = hasDelta && !isFlat && delta!.pct > 0;

  let deltaColor = '';
  let TrendIcon: typeof TrendingUp | null = null;
  if (hasDelta) {
    if (isFlat) {
      deltaColor = 'text-gray-500 dark:text-gray-400';
      TrendIcon = Minus;
    } else {
      const upIsGood = !delta!.invert;
      const isGood = isUp ? upIsGood : !upIsGood;
      deltaColor = isGood
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400';
      TrendIcon = isUp ? TrendingUp : TrendingDown;
    }
  }

  const inner = (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
        <div className={`p-1 sm:p-1.5 rounded-lg ${TONE_BG[tone]}`}>
          <span className={TONE_ICON[tone]}>{icon}</span>
        </div>
        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 min-w-0">
        <p className={`text-sm sm:text-lg font-bold truncate min-w-0 ${valueClassName ?? 'text-gray-900 dark:text-white'}`}>
          {value}
        </p>
        {sparkData && (
          <div className="w-12 h-6 sm:w-16 sm:h-7 shrink-0 opacity-90">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={TONE_STROKE[tone]}
                  strokeWidth={1.75}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {(hasDelta || hint) && (
        <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] min-h-[14px]">
          {hasDelta && TrendIcon && (
            <span className={`inline-flex items-center gap-0.5 font-medium ${deltaColor}`}>
              <TrendIcon className="w-3 h-3" />
              {formatDeltaPct(delta!.pct)}
            </span>
          )}
          {hasDelta && delta!.label && (
            <span className="text-gray-400 dark:text-gray-500 truncate">{delta!.label}</span>
          )}
          {!hasDelta && hint && (
            <span className="text-gray-400 dark:text-gray-500 truncate">{hint}</span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="card p-3 sm:p-4 hover:shadow-md transition-shadow flex"
      >
        {inner}
      </Link>
    );
  }
  return <div className="card p-3 sm:p-4 flex">{inner}</div>;
}
