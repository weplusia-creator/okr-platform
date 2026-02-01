import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { PROJECT_STATUS_CONFIG, getProjectDisplayName } from '../../types/projects';
import type { ProjectStatus } from '../../types/projects';

const STATUS_BAR_COLORS: Record<ProjectStatus, string> = {
  proposal: 'bg-gray-400',
  approved: 'bg-primary-400',
  in_progress: 'bg-primary-500',
  paused: 'bg-warning-400',
  completed: 'bg-success-500',
  cancelled: 'bg-danger-400',
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return getMonthKey(d);
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function daysInMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function GanttView() {
  const navigate = useNavigate();
  const { projects, loading } = useProjects();

  const now = new Date();
  const currentMonth = getMonthKey(now);

  // View shows N months starting from startMonth
  const [startMonth, setStartMonth] = useState(currentMonth);
  const monthsToShow = 6;

  const visibleMonths = useMemo(() => {
    const months: string[] = [];
    for (let i = 0; i < monthsToShow; i++) {
      months.push(addMonths(startMonth, i));
    }
    return months;
  }, [startMonth]);

  const endMonth = visibleMonths[visibleMonths.length - 1];

  // Filter projects that overlap with visible range
  const visibleProjects = useMemo(() => {
    const rangeStart = `${visibleMonths[0]}-01`;
    const [ey, em] = endMonth.split('-').map(Number);
    const rangeEnd = `${endMonth}-${new Date(ey, em, 0).getDate()}`;

    return projects
      .filter((p) => {
        if (!p.startDate) return false;
        const pStart = p.startDate;
        const pEnd = p.estimatedEndDate || p.startDate;
        // Project overlaps if it starts before range end AND ends after range start
        return pStart <= rangeEnd && pEnd >= rangeStart;
      })
      .sort((a, b) => (a.clientName || a.name).localeCompare(b.clientName || b.name));
  }, [projects, visibleMonths, endMonth]);

  // Total days across visible months
  const { totalDays, monthOffsets } = useMemo(() => {
    let total = 0;
    const offsets: { month: string; offset: number; days: number }[] = [];
    for (const m of visibleMonths) {
      const days = daysInMonth(m);
      offsets.push({ month: m, offset: total, days });
      total += days;
    }
    return { totalDays: total, monthOffsets: offsets };
  }, [visibleMonths]);

  // Today offset
  const todayOffset = useMemo(() => {
    const todayMonth = getMonthKey(now);
    const mo = monthOffsets.find((m) => m.month === todayMonth);
    if (!mo) return null;
    return mo.offset + now.getDate() - 1;
  }, [monthOffsets]);

  const getBarPosition = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate + 'T00:00:00');
    const end = endDate ? new Date(endDate + 'T00:00:00') : new Date(start.getTime() + 60 * 24 * 60 * 60 * 1000);

    const rangeStartDate = new Date(`${visibleMonths[0]}-01T00:00:00`);
    const [ey, em] = endMonth.split('-').map(Number);
    const rangeEndDate = new Date(ey, em, 0);

    const clampedStart = start < rangeStartDate ? rangeStartDate : start;
    const clampedEnd = end > rangeEndDate ? rangeEndDate : end;

    const startDayOffset = Math.max(0, Math.floor((clampedStart.getTime() - rangeStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    const endDayOffset = Math.max(startDayOffset + 1, Math.ceil((clampedEnd.getTime() - rangeStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return {
      left: `${(startDayOffset / totalDays) * 100}%`,
      width: `${((endDayOffset - startDayOffset) / totalDays) * 100}%`,
    };
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vista Gantt</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {visibleProjects.length} proyectos en este período
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStartMonth(addMonths(startMonth, -monthsToShow))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Período anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setStartMonth(addMonths(startMonth, -1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[180px] text-center">
            {monthLabel(visibleMonths[0])} — {monthLabel(endMonth)}
          </span>
          <button
            onClick={() => setStartMonth(addMonths(startMonth, 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setStartMonth(addMonths(startMonth, monthsToShow))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Período siguiente"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setStartMonth(currentMonth)}
            className="text-xs text-primary-600 hover:underline ml-1"
          >
            Hoy
          </button>
        </div>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarRange className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay proyectos en este período
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Navegá a otro período o asigná fechas a tus proyectos
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full table-fixed border-collapse">
            {/* Column widths: project label + one per month */}
            <colgroup>
              <col style={{ width: 210 }} />
              {monthOffsets.map((m) => (
                <col key={m.month} />
              ))}
            </colgroup>

            {/* Month header */}
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                  Proyecto
                </th>
                {monthOffsets.map((m) => {
                  const isCurrentMonth = m.month === currentMonth;
                  return (
                    <th
                      key={m.month}
                      className={`text-center py-2 text-xs font-medium border-r border-gray-200 dark:border-gray-700 ${
                        isCurrentMonth
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {monthLabel(m.month)}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visibleProjects.map((project) => {
                const barColor = STATUS_BAR_COLORS[project.status];
                const statusConfig = PROJECT_STATUS_CONFIG[project.status];

                return (
                  <tr
                    key={project.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {/* Label */}
                    <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {getProjectDisplayName(project)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${statusConfig.bgClass} text-[10px] px-1.5 py-0 shrink-0`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </td>

                    {/* Month cells with bar spanning across */}
                    {monthOffsets.map((m, mi) => {
                      const isCurrentMonth = m.month === currentMonth;
                      const pStart = new Date(project.startDate + 'T00:00:00');
                      const pEnd = project.estimatedEndDate
                        ? new Date(project.estimatedEndDate + 'T00:00:00')
                        : new Date(pStart.getTime() + 60 * 24 * 60 * 60 * 1000);

                      const [my, mm] = m.month.split('-').map(Number);
                      const cellStart = new Date(my, mm - 1, 1);
                      const cellEnd = new Date(my, mm, 0); // last day

                      // Does bar overlap this cell?
                      const overlaps = pStart <= cellEnd && pEnd >= cellStart;

                      if (!overlaps) {
                        return (
                          <td key={m.month} className={`p-0 border-r border-gray-100 dark:border-gray-800 ${isCurrentMonth ? 'bg-primary-50/20 dark:bg-primary-900/5' : ''}`}>
                            <div className="relative overflow-hidden" style={{ height: 48 }}>
                              {isCurrentMonth && todayOffset != null && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-danger-500" style={{ left: `${((now.getDate() - 1) / m.days) * 100}%` }} />
                              )}
                            </div>
                          </td>
                        );
                      }

                      const barStartInCell = pStart > cellStart ? pStart : cellStart;
                      const barEndInCell = pEnd < cellEnd ? pEnd : cellEnd;
                      const leftDay = (barStartInCell.getTime() - cellStart.getTime()) / (1000 * 60 * 60 * 24);
                      const rightDay = (barEndInCell.getTime() - cellStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
                      const leftPct = Math.max(0, (leftDay / m.days) * 100);
                      const widthPct = Math.min(((rightDay - leftDay) / m.days) * 100, 100 - leftPct);

                      return (
                        <td key={m.month} className={`p-0 border-r border-gray-100 dark:border-gray-800 ${isCurrentMonth ? 'bg-primary-50/20 dark:bg-primary-900/5' : ''}`}>
                          <div className="relative overflow-hidden" style={{ height: 48 }}>
                            {isCurrentMonth && todayOffset != null && (
                              <div className="absolute top-0 bottom-0 w-0.5 bg-danger-500 z-10" style={{ left: `${((now.getDate() - 1) / m.days) * 100}%` }} />
                            )}
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 h-7 ${barColor} opacity-90 z-[5] ${
                                pStart >= cellStart && pEnd <= cellEnd ? 'rounded-md' :
                                pStart >= cellStart ? 'rounded-l-md' :
                                pEnd <= cellEnd ? 'rounded-r-md' : ''
                              }`}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              title={`${getProjectDisplayName(project)}: ${formatDate(project.startDate)} — ${formatDate(project.estimatedEndDate)}`}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {(Object.entries(STATUS_BAR_COLORS) as [ProjectStatus, string][]).map(([status, colorClass]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${colorClass}`} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {PROJECT_STATUS_CONFIG[status].label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-3 bg-danger-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Hoy</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
