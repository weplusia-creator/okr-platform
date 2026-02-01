import { CheckSquare, Package, FileText, UserPlus, Activity } from 'lucide-react';
import type { ProjectActivityLog } from '../../types/projects';

interface ActivityTimelineProps {
  activityLog: ProjectActivityLog[];
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} dias`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) !== 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getEntityIcon(entityType: string) {
  switch (entityType) {
    case 'task':
      return <CheckSquare className="w-4 h-4" />;
    case 'deliverable':
      return <Package className="w-4 h-4" />;
    case 'document':
      return <FileText className="w-4 h-4" />;
    case 'participant':
      return <UserPlus className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
}

function getEntityColor(entityType: string) {
  switch (entityType) {
    case 'task':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
    case 'deliverable':
      return 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400';
    case 'document':
      return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400';
    case 'participant':
      return 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}

function getActionText(action: string, details: Record<string, any> | null): string {
  const title = details?.title || '';
  switch (action) {
    case 'created':
      return `creo "${title}"`;
    case 'updated':
      return `actualizo "${title}"`;
    case 'status_changed':
      return `cambio el estado de "${title}" a ${details?.to || ''}`;
    case 'deleted':
      return `elimino "${title}"`;
    case 'time_logged':
      return `registro ${details?.hours || 0}h en "${title}"`;
    case 'comment_added':
      return `comento en "${title}"`;
    case 'document_added':
      return `agrego el documento "${title}"`;
    default:
      return action;
  }
}

export function ActivityTimeline({ activityLog }: ActivityTimelineProps) {
  if (activityLog.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay actividad registrada</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-4">
        {activityLog.map((entry) => (
          <div key={entry.id} className="relative flex gap-4 pl-2">
            {/* Dot */}
            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${getEntityColor(entry.entityType)}`}>
              {getEntityIcon(entry.entityType)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-white">
                  {entry.userName || 'Usuario'}
                </span>{' '}
                {getActionText(entry.action, entry.details)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {getRelativeTime(entry.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
