import type { Objective, OKRStats, Quarter } from '../types';

export function calculateObjectiveProgress(objective: Objective): number {
  if (objective.keyResults.length === 0) return 0;
  const total = objective.keyResults.reduce((sum, kr) => sum + kr.progress, 0);
  return Math.round(total / objective.keyResults.length);
}

export function getProgressColor(progress: number): 'success' | 'warning' | 'danger' {
  if (progress >= 70) return 'success';
  if (progress >= 40) return 'warning';
  return 'danger';
}

export function getProgressColorClasses(progress: number): {
  bg: string;
  text: string;
  bar: string;
} {
  if (progress >= 70) {
    return {
      bg: 'bg-success-100 dark:bg-success-900/30',
      text: 'text-success-700 dark:text-success-400',
      bar: 'bg-success-500',
    };
  }
  if (progress >= 40) {
    return {
      bg: 'bg-warning-100 dark:bg-warning-900/30',
      text: 'text-warning-700 dark:text-warning-400',
      bar: 'bg-warning-500',
    };
  }
  return {
    bg: 'bg-danger-100 dark:bg-danger-900/30',
    text: 'text-danger-700 dark:text-danger-400',
    bar: 'bg-danger-500',
  };
}

export function calculateOKRStats(objectives: Objective[]): OKRStats {
  const stats: OKRStats = {
    total: objectives.length,
    completed: 0,
    inProgress: 0,
    atRisk: 0,
    cancelled: 0,
    averageProgress: 0,
  };

  if (objectives.length === 0) return stats;

  let totalProgress = 0;

  objectives.forEach((obj) => {
    const progress = calculateObjectiveProgress(obj);
    totalProgress += progress;

    switch (obj.status) {
      case 'completed':
        stats.completed++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'at_risk':
        stats.atRisk++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
    }
  });

  stats.averageProgress = Math.round(totalProgress / objectives.length);

  return stats;
}

export function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Returns YYYY-MM-DD for a Date in LOCAL time.
 * Use this instead of `date.toISOString().split('T')[0]`, which returns
 * the UTC date and shifts forward/backward across timezones.
 */
export function toLocalISODate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Today's date as YYYY-MM-DD in LOCAL time. */
export function todayLocalISO(): string {
  return toLocalISODate(new Date());
}

/**
 * Parse a date string. If input is a date-only string (YYYY-MM-DD),
 * parses it as LOCAL midnight to avoid the UTC-shift bug where
 * `new Date('2026-03-31')` shows the previous day in GMT-3.
 * Full ISO timestamps (with time) are parsed normally.
 */
export function parseLocalDate(dateString: string): Date {
  // Date-only YYYY-MM-DD: force local-midnight parse
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  return new Date(dateString);
}

export function formatDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getQuarterDateRange(quarter: Quarter, year: number): { start: string; end: string } {
  const ranges: Record<Quarter, { startMonth: number; endMonth: number }> = {
    Q1: { startMonth: 0, endMonth: 2 },
    Q2: { startMonth: 3, endMonth: 5 },
    Q3: { startMonth: 6, endMonth: 8 },
    Q4: { startMonth: 9, endMonth: 11 },
  };

  const { startMonth, endMonth } = ranges[quarter];
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0);

  return {
    start: toLocalISODate(start),
    end: toLocalISODate(end),
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
