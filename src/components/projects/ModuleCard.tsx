import { Pencil, CheckCircle, Calendar } from 'lucide-react';
import type { ProjectModule } from '../../types/projects';
import { MODULE_STATUS_CONFIG } from '../../types/projects';

interface ModuleCardProps {
  module: ProjectModule;
  index: number;
  onEdit: () => void;
  onComplete: () => void;
  isActive: boolean;
}

const circleColorMap: Record<string, string> = {
  pending: 'bg-gray-300 dark:bg-gray-600',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  skipped: 'bg-yellow-500',
};

export function ModuleCard({ module, index, onEdit, onComplete, isActive }: ModuleCardProps) {
  const statusConfig = MODULE_STATUS_CONFIG[module.status];
  const completedSubtasks = module.subtasks.filter((s) => s.checked).length;
  const totalSubtasks = module.subtasks.length;
  const subtaskPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${circleColorMap[module.status]}`}
        >
          {index + 1}
        </div>
        {/* Vertical connector line */}
        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          {/* Center info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {module.title}
              </h4>
              <span className={`${statusConfig.bgClass} text-xs px-2 py-0.5 rounded-full flex-shrink-0`}>
                {statusConfig.label}
              </span>
            </div>

            {module.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                {module.description}
              </p>
            )}

            {/* Subtasks progress */}
            {totalSubtasks > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{completedSubtasks}/{totalSubtasks} completados</span>
                  <span>{subtaskPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${subtaskPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Completed date */}
            {module.status === 'completed' && module.completedAt && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Calendar className="w-3 h-3" />
                Completado el {new Date(module.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Editar modulo"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {(isActive || module.status === 'in_progress') && module.status !== 'completed' && (
              <button
                onClick={onComplete}
                className="p-1.5 rounded-lg text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Completar modulo"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
