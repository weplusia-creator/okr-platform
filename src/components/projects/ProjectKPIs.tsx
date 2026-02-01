import { useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  BarChart3,
  Percent,
} from 'lucide-react';
import type {
  Project,
  ProjectModule,
  ProjectDeliverable,
  ProjectParticipant,
} from '../../types/projects';

export interface ProjectKPIsProps {
  project: Project;
  modules: ProjectModule[];
  deliverables: ProjectDeliverable[];
  participants: ProjectParticipant[];
}

interface KPICardData {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

export function ProjectKPIs({ project, modules, deliverables: _deliverables, participants }: ProjectKPIsProps) {
  const kpis = useMemo(() => {
    const totalModules = modules.length;
    const completedModules = modules.filter((m) => m.status === 'completed').length;
    const progressPercent = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

    // Days
    const startDate = project.startDate ? new Date(project.startDate + 'T00:00:00') : null;
    const endDate = project.estimatedEndDate ? new Date(project.estimatedEndDate + 'T00:00:00') : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysTotal = 0;
    let daysElapsed = 0;
    let daysRemaining = 0;

    if (startDate && endDate) {
      daysTotal = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Overdue
    const todayStr = today.toISOString().split('T')[0];
    const overdueModules = modules.filter(
      (m) => m.dueDate && m.dueDate < todayStr && m.status !== 'completed'
    ).length;

    // SPI
    const timeProgress = daysTotal > 0 ? Math.min(daysElapsed / daysTotal, 1) : 0;
    const moduleProgress = totalModules > 0 ? completedModules / totalModules : 0;
    const spi = timeProgress > 0 ? moduleProgress / timeProgress : 0;

    return {
      progressPercent,
      totalModules,
      completedModules,
      daysRemaining,
      daysTotal,
      daysElapsed,
      overdueModules,
      spi,
    };
  }, [project, modules, participants]);

  const cards: KPICardData[] = [
    {
      label: 'Avance General',
      value: `${Math.round(kpis.progressPercent)}%`,
      subtitle: `${kpis.completedModules} / ${kpis.totalModules} modulos`,
      icon: <Percent className="w-5 h-5" />,
      color: kpis.progressPercent >= 75 ? 'green' : kpis.progressPercent >= 40 ? 'yellow' : 'red',
    },
    {
      label: 'Dias Restantes',
      value: `${kpis.daysRemaining}`,
      subtitle: `${kpis.daysElapsed} / ${kpis.daysTotal} dias totales`,
      icon: <Calendar className="w-5 h-5" />,
      color: kpis.daysRemaining > 7 ? 'blue' : kpis.daysRemaining > 0 ? 'yellow' : 'red',
    },
    {
      label: 'Modulos Atrasados',
      value: `${kpis.overdueModules}`,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: kpis.overdueModules === 0 ? 'green' : kpis.overdueModules <= 3 ? 'yellow' : 'red',
    },
    {
      label: 'SPI',
      value: kpis.spi.toFixed(2),
      subtitle: kpis.spi >= 1 ? 'Adelantado' : kpis.spi >= 0.8 ? 'En tiempo' : 'Atrasado',
      icon: <BarChart3 className="w-5 h-5" />,
      color: kpis.spi >= 1 ? 'green' : kpis.spi >= 0.8 ? 'yellow' : 'red',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      icon: 'text-green-500 dark:text-green-400',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: 'text-yellow-500 dark:text-yellow-400',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-500 dark:text-red-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      icon: 'text-blue-500 dark:text-blue-400',
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-400',
      icon: 'text-gray-500 dark:text-gray-400',
    },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const colors = colorClasses[card.color];
        return (
          <div
            key={card.label}
            className={`${colors.bg} rounded-xl p-4 border border-transparent`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
              <span className={colors.icon}>{card.icon}</span>
            </div>
            <p className={`text-xl font-bold ${colors.text}`}>{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
