import { useMemo, useRef } from 'react';
import { MODULE_STATUS_CONFIG, type ProjectModule, type ModuleStatus } from '../../types/projects';
import { toLocalISODate } from '../../utils/helpers';

interface GanttChartProps {
  modules: ProjectModule[];
  onModuleClick?: (mod: ProjectModule) => void;
}

const STATUS_BAR_COLORS: Record<ModuleStatus, string> = {
  pending: 'bg-gray-400 dark:bg-gray-500',
  in_progress: 'bg-blue-500 dark:bg-blue-400',
  completed: 'bg-green-500 dark:bg-green-400',
  skipped: 'bg-yellow-500 dark:bg-yellow-400',
};

export function GanttChart({ modules, onModuleClick }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { totalDays, months, rows, todayOffset } = useMemo(() => {
    // Determine overall date range
    const allDates: string[] = [];
    modules.forEach((m) => {
      if (m.startDate) allDates.push(m.startDate);
      if (m.dueDate) allDates.push(m.dueDate);
    });

    if (allDates.length === 0) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      const end = new Date(today);
      end.setDate(end.getDate() + 30);
      allDates.push(toLocalISODate(start), toLocalISODate(end));
    }

    allDates.sort();
    const rangeStart = new Date(allDates[0] + 'T00:00:00');
    const rangeEnd = new Date(allDates[allDates.length - 1] + 'T00:00:00');

    // Add padding
    rangeStart.setDate(rangeStart.getDate() - 3);
    rangeEnd.setDate(rangeEnd.getDate() + 7);

    const totalDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate month labels
    const months: { label: string; offset: number; width: number }[] = [];
    const cursor = new Date(rangeStart);
    cursor.setDate(1);
    if (cursor < rangeStart) cursor.setMonth(cursor.getMonth() + 1);

    while (cursor <= rangeEnd) {
      const offset = Math.max(0, Math.ceil((cursor.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
      const nextMonth = new Date(cursor);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endOffset = Math.min(totalDays, Math.ceil((nextMonth.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));

      months.push({
        label: cursor.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }),
        offset,
        width: endOffset - offset,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Today line
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOffset = Math.ceil((today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));

    // Build rows from modules sorted by sortOrder
    const sorted = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);

    type Row = {
      label: string;
      startOffset: number;
      width: number;
      color: string;
      module: ProjectModule;
    };

    const rows: Row[] = sorted.map((m) => {
      const mStart = m.startDate
        ? Math.max(0, Math.ceil((new Date(m.startDate + 'T00:00:00').getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      const mEnd = m.dueDate
        ? Math.max(mStart + 1, Math.ceil((new Date(m.dueDate + 'T00:00:00').getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)))
        : mStart + 3;

      return {
        label: `#${m.sortOrder + 1} ${m.title}`,
        startOffset: mStart,
        width: Math.max(1, mEnd - mStart),
        color: STATUS_BAR_COLORS[m.status],
        module: m,
      };
    });

    return {
      totalDays,
      months,
      rows,
      todayOffset,
    };
  }, [modules]);

  const dayWidth = 28;
  const chartWidth = totalDays * dayWidth;
  const labelWidth = 220;
  const rowHeight = 36;

  if (modules.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No hay módulos con fechas para mostrar en el Gantt</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
      <div style={{ minWidth: labelWidth + chartWidth }} className="relative">
        {/* Month header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
          <div
            className="flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700"
            style={{ width: labelWidth }}
          >
            Módulo
          </div>
          <div className="relative flex-1" style={{ width: chartWidth }}>
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center px-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700"
                style={{ left: m.offset * dayWidth, width: m.width * dayWidth }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            style={{ height: rowHeight }}
          >
            {/* Label */}
            <div
              className="flex-shrink-0 px-3 text-xs truncate border-r border-gray-200 dark:border-gray-700"
              style={{ width: labelWidth }}
            >
              <span
                className="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                onClick={() => onModuleClick?.(row.module)}
              >
                {row.label}
              </span>
            </div>

            {/* Chart area */}
            <div className="relative flex-1" style={{ width: chartWidth, height: rowHeight }}>
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 dark:bg-red-400 z-10 opacity-60"
                  style={{ left: todayOffset * dayWidth }}
                />
              )}

              {/* Bar */}
              {row.width > 0 && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-md ${row.color} cursor-pointer hover:opacity-80 transition-opacity shadow-sm`}
                  style={{
                    left: row.startOffset * dayWidth,
                    width: Math.max(row.width * dayWidth, dayWidth),
                  }}
                  onClick={() => onModuleClick?.(row.module)}
                  title={`${row.label} (${MODULE_STATUS_CONFIG[row.module.status].label})`}
                >
                  {row.width * dayWidth > 60 && (
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-medium truncate">
                      {row.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {Object.entries(MODULE_STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${STATUS_BAR_COLORS[status as ModuleStatus]}`} />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-3 bg-red-500" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Hoy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
