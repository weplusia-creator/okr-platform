import { Target, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useOKR } from '../context/OKRContext';
import { calculateOKRStats, getProgressColorClasses } from '../utils/helpers';

export function StatsCards() {
  const { filteredObjectives } = useOKR();
  const stats = calculateOKRStats(filteredObjectives);
  const progressColors = getProgressColorClasses(stats.averageProgress);

  const cards = [
    {
      title: 'Total OKRs',
      value: stats.total,
      icon: Target,
      color: 'text-primary-600 dark:text-primary-400',
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
    },
    {
      title: 'Completados',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-success-600 dark:text-success-400',
      bgColor: 'bg-success-100 dark:bg-success-900/30',
    },
    {
      title: 'En Progreso',
      value: stats.inProgress,
      icon: TrendingUp,
      color: 'text-primary-600 dark:text-primary-400',
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
    },
    {
      title: 'En Riesgo',
      value: stats.atRisk,
      icon: AlertTriangle,
      color: 'text-warning-600 dark:text-warning-400',
      bgColor: 'bg-warning-100 dark:bg-warning-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className="card p-4 animate-slide-up"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {card.title}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Average Progress Card */}
      <div className="card p-4 animate-slide-up col-span-2 lg:col-span-1">
        <div className="flex flex-col h-full justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Progreso Promedio</p>
            <span className={`text-2xl font-bold ${progressColors.text}`}>
              {stats.averageProgress}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColors.bar} rounded-full progress-bar`}
              style={{ width: `${stats.averageProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
