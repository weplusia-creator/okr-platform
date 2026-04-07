import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Calendar, Clock, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { PROJECT_STATUS_CONFIG } from '../../types/projects';
import { supabase } from '../../lib/supabase';
import { parseLocalDate } from '../../utils/helpers';

export function ClientPortal() {
  const { appUser, isAdmin } = useAuth();
  const { projects, loading } = useProjects();
  const [participantProjectIds, setParticipantProjectIds] = useState<string[]>([]);

  const isPreview = isAdmin && appUser?.userType !== 'client';

  // Fetch project IDs where the user is a participant
  useEffect(() => {
    if (!appUser?.id || isPreview) return;
    supabase
      .from('project_participants')
      .select('project_id')
      .eq('user_id', appUser.id)
      .then(({ data }) => {
        setParticipantProjectIds((data || []).map(r => r.project_id));
      });
  }, [appUser?.id, isPreview]);

  const clientProjects = useMemo(
    () => {
      if (isPreview) return projects;
      return projects.filter(p =>
        (appUser?.clientId && p.clientId === appUser.clientId) ||
        participantProjectIds.includes(p.id)
      );
    },
    [projects, appUser?.clientId, isPreview, participantProjectIds],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Proyectos</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {clientProjects.length} proyecto{clientProjects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isPreview && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>Vista previa — Así ven los usuarios de tipo cliente su portal. Se muestran todos los proyectos como ejemplo.</span>
        </div>
      )}

      {clientProjects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay proyectos asignados
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Cuando te asignen un proyecto, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clientProjects.map(project => {
            const statusConfig = PROJECT_STATUS_CONFIG[project.status];
            return (
              <Link
                key={project.id}
                to={`/portal/${project.id}`}
                className="card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {[project.clientName, project.product].filter(Boolean).join(' — ') || project.name}
                  </h3>
                  <span className={`${statusConfig.bgClass} text-xs px-2 py-0.5 rounded-full flex-shrink-0`}>
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {project.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Inicio: {parseLocalDate(project.startDate).toLocaleDateString('es-AR')}
                    </span>
                  )}
                  {project.endDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Fin: {parseLocalDate(project.endDate).toLocaleDateString('es-AR')}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
