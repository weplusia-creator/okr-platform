import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, Calendar, CheckSquare, FileText,
  Filter, CheckCircle2, Circle, Clock, AlertTriangle,
  User,
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { ACTIVITY_TYPE_CONFIG } from '../../types/crm';
import type { ActivityType } from '../../types/crm';

import { toast } from '../../components/ui/toast';
type FilterStatus = 'all' | 'pending' | 'completed' | 'overdue';

const ActivityIcon: Record<ActivityType, React.ElementType> = {
  llamada: Phone,
  email: Mail,
  reunion: Calendar,
  tarea: CheckSquare,
  nota: FileText,
};

export function ActivityList() {
  const { activities, completeActivity, getOverdueActivities } = useCRM();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterType, setFilterType] = useState<ActivityType | ''>('');

  const overdueIds = useMemo(() => {
    return new Set(getOverdueActivities().map(a => a.id));
  }, [getOverdueActivities]);

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      // Status filter
      if (filterStatus === 'pending' && a.isCompleted) return false;
      if (filterStatus === 'completed' && !a.isCompleted) return false;
      if (filterStatus === 'overdue' && !overdueIds.has(a.id)) return false;

      // Type filter
      if (filterType && a.activityType !== filterType) return false;

      return true;
    });
  }, [activities, filterStatus, filterType, overdueIds]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (dateOnly.getTime() === today.getTime()) return 'Hoy';
    if (dateOnly.getTime() === today.getTime() + 86400000) return 'Manana';
    if (dateOnly.getTime() === today.getTime() - 86400000) return 'Ayer';

    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  const handleComplete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { await completeActivity(id); }
    catch (err: any) { toast.error('No se pudo completar la actividad: ' + (err?.message || 'Error desconocido')); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Actividades</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {activities.filter(a => !a.isCompleted).length} pendientes
          {overdueIds.size > 0 && (
            <span className="text-red-500 ml-2">
              ({overdueIds.size} vencidas)
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Filter className="w-4 h-4 text-gray-400" />

          <div className="flex gap-2">
            {(['all', 'pending', 'completed', 'overdue'] as FilterStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filterStatus === status
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' && 'Todas'}
                {status === 'pending' && 'Pendientes'}
                {status === 'completed' && 'Completadas'}
                {status === 'overdue' && 'Vencidas'}
              </button>
            ))}
          </div>

          <select
            className="select max-w-[180px]"
            value={filterType}
            onChange={e => setFilterType(e.target.value as ActivityType | '')}
          >
            <option value="">Todos los tipos</option>
            {(Object.keys(ACTIVITY_TYPE_CONFIG) as ActivityType[]).map(type => (
              <option key={type} value={type}>
                {ACTIVITY_TYPE_CONFIG[type].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity list */}
      {filteredActivities.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {filterStatus === 'overdue'
              ? 'No hay actividades vencidas'
              : filterStatus === 'completed'
              ? 'No hay actividades completadas'
              : 'No hay actividades pendientes'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map(activity => {
            const Icon = ActivityIcon[activity.activityType];
            const config = ACTIVITY_TYPE_CONFIG[activity.activityType];
            const isOverdue = overdueIds.has(activity.id);

            return (
              <div
                key={activity.id}
                className={`card p-4 transition-all ${
                  activity.isCompleted
                    ? 'opacity-60'
                    : isOverdue
                    ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Complete toggle */}
                  <button
                    onClick={(e) => !activity.isCompleted && handleComplete(activity.id, e)}
                    className={`mt-0.5 ${activity.isCompleted ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                    disabled={activity.isCompleted}
                  >
                    {activity.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                      {isOverdue && !activity.isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" />
                          Vencida
                        </span>
                      )}
                    </div>

                    <h3 className={`text-sm font-medium text-gray-900 dark:text-white ${activity.isCompleted ? 'line-through' : ''}`}>
                      {activity.subject}
                    </h3>

                    {activity.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {activity.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {activity.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(activity.dueDate)}
                        </span>
                      )}
                      {activity.ownerName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {activity.ownerName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Link to entity */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.dealId && (
                      <Link
                        to={`/crm/deals/${activity.dealId}`}
                        className="text-primary-600 hover:underline"
                      >
                        Ver deal →
                      </Link>
                    )}
                    {activity.leadId && (
                      <Link
                        to={`/crm/leads/${activity.leadId}`}
                        className="text-primary-600 hover:underline"
                      >
                        Ver lead →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
