import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  BookOpen,
  Calendar,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ModuleStatus } from '../../types/projects';
import { MODULE_STATUS_CONFIG } from '../../types/projects';
import { todayLocalISO } from '../../utils/helpers';

interface MyModule {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string | null;
  status: ModuleStatus;
  sortOrder: number;
  dueDate: string | null;
}

interface ProjectGroup {
  projectId: string;
  projectName: string;
  modules: MyModule[];
  completedCount: number;
  totalCount: number;
}

export function MyModules() {
  const navigate = useNavigate();
  const { appUser } = useAuth();

  const [modules, setModules] = useState<MyModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all');

  useEffect(() => {
    if (!appUser?.id) return;
    let cancelled = false;
    const fetchModules = async () => {
      setLoading(true);
      try {
        const db = supabase as any;

        // Get projects where user is alumno
        const { data: participations, error: partError } = await db
          .from('project_participants')
          .select('project_id')
          .eq('user_id', appUser.id)
          .eq('role', 'alumno');

        if (partError) throw partError;
        if (!participations || participations.length === 0) {
          if (!cancelled) {
            setModules([]);
            setLoading(false);
          }
          return;
        }

        const projectIds = participations.map((p: any) => p.project_id);

        // Fetch modules for those projects
        const { data, error } = await db
          .from('project_modules')
          .select('*, projects!inner(name, product, client_id, clients(name))')
          .in('project_id', projectIds)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        if (cancelled) return;
        setModules(
          (data || []).map((m: any) => {
            const clientName = m.projects?.clients?.name || '';
            const product = m.projects?.product || '';
            const parts = [clientName, product].filter(Boolean);
            const displayName = parts.length > 0 ? parts.join(' | ') : (m.projects?.name || '');
            return {
            id: m.id,
            projectId: m.project_id,
            projectName: displayName,
            title: m.title,
            description: m.description,
            status: m.status as ModuleStatus,
            sortOrder: m.sort_order,
            dueDate: m.due_date,
          };})
        );
      } catch (err) {
        console.error('Error fetching my modules:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchModules();
    return () => { cancelled = true; };
  }, [appUser?.id]);

  const filteredModules = useMemo(() => {
    if (statusFilter === 'all') return modules;
    return modules.filter((m) => m.status === statusFilter);
  }, [modules, statusFilter]);

  const projectGroups = useMemo(() => {
    const groups: Record<string, ProjectGroup> = {};
    for (const m of filteredModules) {
      if (!groups[m.projectId]) {
        // Count from all modules (not filtered) for this project
        const allProjectModules = modules.filter((mod) => mod.projectId === m.projectId);
        groups[m.projectId] = {
          projectId: m.projectId,
          projectName: m.projectName,
          modules: [],
          completedCount: allProjectModules.filter((mod) => mod.status === 'completed').length,
          totalCount: allProjectModules.length,
        };
      }
      groups[m.projectId].modules.push(m);
    }
    return Object.values(groups);
  }, [filteredModules, modules]);

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const isOverdue = (date: string | null, status: ModuleStatus) => {
    if (!date || status === 'completed') return false;
    return date < todayLocalISO();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mis Módulos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {modules.length} módulos en {projectGroups.length} proyecto{projectGroups.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ModuleStatus | 'all')}
          className="select"
        >
          <option value="all">Todos los estados</option>
          {(Object.keys(MODULE_STATUS_CONFIG) as ModuleStatus[]).map((status) => (
            <option key={status} value={status}>
              {MODULE_STATUS_CONFIG[status].label}
            </option>
          ))}
        </select>
      </div>

      {/* Modules grouped by project */}
      {filteredModules.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay módulos
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {statusFilter !== 'all'
              ? 'No hay módulos con este estado'
              : 'No tienes módulos asignados en ningún proyecto'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {projectGroups.map((group) => (
            <div key={group.projectId}>
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-primary-600"
                  onClick={() => navigate(`/projects/${group.projectId}`)}
                >
                  {group.projectName}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {group.completedCount}/{group.totalCount} módulos completados
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${group.totalCount > 0 ? (group.completedCount / group.totalCount) * 100 : 0}%` }}
                />
              </div>

              <div className="space-y-2">
                {group.modules.map((mod) => {
                  const statusConfig = MODULE_STATUS_CONFIG[mod.status];
                  const overdue = isOverdue(mod.dueDate, mod.status);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => navigate(`/projects/${mod.projectId}`)}
                      className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            <span className="text-gray-400 mr-2">#{mod.sortOrder + 1}</span>
                            {mod.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`badge ${statusConfig.bgClass}`}>
                            {statusConfig.label}
                          </span>
                          {mod.dueDate && (
                            <span
                              className={`flex items-center gap-1 text-xs ${
                                overdue
                                  ? 'text-danger-600 font-medium'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              {formatDate(mod.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
