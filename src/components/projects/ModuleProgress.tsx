import type { ProjectModule } from '../../types/projects';

interface ModuleProgressProps {
  modules: ProjectModule[];
}

export function ModuleProgress({ modules }: ModuleProgressProps) {
  const total = modules.length;
  const completed = modules.filter((m) => m.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sorted = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);
  const nextModule = sorted.find((m) => m.status === 'pending' || m.status === 'in_progress');

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {completed} de {total} modulos completados
        </span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {percent}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {nextModule && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Proximo: {nextModule.title}
        </p>
      )}
    </div>
  );
}
