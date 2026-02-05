import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Handshake,
  Phone,
  Mail,
  FileText,
  Cake,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useOKR } from '../context/OKRContext';
import { useCRM } from '../context/CRMContext';
import { supabase } from '../lib/supabase';
import { PROJECT_STATUS_CONFIG } from '../types/projects';
import { ACTIVITY_TYPE_CONFIG } from '../types/crm';
import type { ProjectModule } from '../types/projects';

interface DashboardModule extends ProjectModule {
  projectName: string;
  clientName: string | null;
}

export function HomeDashboard() {
  const { appUser, organization, orgUsers, fetchOrgUsers } = useAuth();
  const { projects, loading: projLoading } = useProjects();
  const { objectives, loading: okrLoading } = useOKR();
  const { activities: crmActivities, deals, loading: crmLoading } = useCRM();

  const [allModules, setAllModules] = useState<DashboardModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [npsScores, setNpsScores] = useState<Record<string, { nps: number; total: number }>>({});

  // Fetch all modules for all projects (admin sees everything)
  const fetchAllModules = useCallback(async () => {
    if (projects.length === 0) { setLoadingModules(false); return; }
    setLoadingModules(true);
    try {
      const projectIds = projects.map(p => p.id);
      const { data, error } = await supabase
        .from('project_modules')
        .select('*')
        .in('project_id', projectIds)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

      setAllModules((data || []).map((m: any) => ({
        id: m.id,
        projectId: m.project_id,
        deliverableId: m.deliverable_id,
        title: m.title,
        description: m.description,
        startDate: m.start_date,
        dueDate: m.due_date,
        status: m.status,
        subtasks: m.subtasks || [],
        sortOrder: m.sort_order || 0,
        completedAt: m.completed_at,
        completedBy: m.completed_by,
        presentationUrl: m.presentation_url,
        taskUrl: m.task_url,
        videoUrl: m.video_url,
        supportMaterialUrl: m.support_material_url,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        projectName: projectMap[m.project_id]?.name || '',
        clientName: projectMap[m.project_id]?.clientName || null,
      })));
    } catch (err) {
      console.error('Error fetching all modules:', err);
    }
    setLoadingModules(false);
  }, [projects]);

  useEffect(() => { fetchAllModules(); }, [fetchAllModules]);

  // Fetch NPS scores for all projects
  const fetchNPSScores = useCallback(async () => {
    if (projects.length === 0) return;
    try {
      const projectIds = projects.map(p => p.id);
      const { data: surveys } = await supabase
        .from('nps_surveys')
        .select('id, project_id')
        .in('project_id', projectIds);

      if (!surveys || surveys.length === 0) return;

      const surveyIds = surveys.map(s => s.id);
      const { data: responses } = await supabase
        .from('nps_responses')
        .select('survey_id, score')
        .in('survey_id', surveyIds);

      if (!responses) return;

      // Map survey_id → project_id
      const surveyToProject: Record<string, string> = {};
      surveys.forEach(s => { surveyToProject[s.id] = s.project_id; });

      // Group scores by project
      const projectScores: Record<string, number[]> = {};
      responses.forEach(r => {
        const pid = surveyToProject[r.survey_id];
        if (pid) {
          if (!projectScores[pid]) projectScores[pid] = [];
          projectScores[pid].push(r.score);
        }
      });

      // Calculate NPS per project
      const result: Record<string, { nps: number; total: number }> = {};
      for (const [pid, scores] of Object.entries(projectScores)) {
        const total = scores.length;
        if (total === 0) continue;
        const promoters = scores.filter(s => s >= 9).length;
        const detractors = scores.filter(s => s <= 6).length;
        const nps = Math.round(((promoters - detractors) / total) * 100);
        result[pid] = { nps, total };
      }
      setNpsScores(result);
    } catch (err) {
      console.error('Error fetching NPS scores:', err);
    }
  }, [projects]);

  useEffect(() => { fetchNPSScores(); }, [fetchNPSScores]);

  // Stats
  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const pendingModules = allModules.filter(m => m.status === 'pending' || m.status === 'in_progress');
  const okrsInProgress = objectives.filter(o => o.status === 'in_progress').length;
  const okrsAtRisk = objectives.filter(o => o.status === 'at_risk').length;

  // Pending initiatives from OKRs
  const { initiatives } = useOKR();
  const pendingInitiatives = useMemo(() => {
    // Build KR → OKR title map
    const krMap: Record<string, string> = {};
    objectives.forEach(obj => {
      obj.keyResults.forEach(kr => { krMap[kr.id] = obj.title; });
    });
    return initiatives
      .filter(i => i.status !== 'done')
      .map(i => ({ ...i, okrTitle: krMap[i.keyResultId] || '' }))
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [initiatives, objectives]);

  // Pending CRM activities
  const pendingCRMActivities = useMemo(() => {
    const now = new Date();
    return crmActivities
      .filter(a => !a.isCompleted)
      .map(a => ({
        ...a,
        isOverdue: a.dueDate ? new Date(a.dueDate) < now : false,
        dealName: a.dealId ? deals.find(d => d.id === a.dealId)?.name : null,
      }))
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [crmActivities, deals]);

  const overdueCRMActivities = pendingCRMActivities.filter(a => a.isOverdue).length;

  // Calendar
  const calYear = calMonth.getFullYear();
  const calMon = calMonth.getMonth();
  const firstDay = new Date(calYear, calMon, 1).getDay();
  const daysInMonth = new Date(calYear, calMon + 1, 0).getDate();
  const monthLabel = calMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Events map: day number → array of events
  const eventsMap = useMemo(() => {
    const map: Record<number, { label: string; color: string; type: string }[]> = {};
    const addEvent = (date: string | null, label: string, color: string, type: string) => {
      if (!date) return;
      const d = new Date(date);
      if (d.getFullYear() === calYear && d.getMonth() === calMon) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push({ label, color, type });
      }
    };

    allModules.forEach(m => {
      if (m.status !== 'completed' && m.status !== 'skipped') {
        addEvent(m.dueDate, `${m.title} (${m.projectName})`, 'bg-blue-500', 'module');
      }
    });

    objectives.forEach(o => {
      if (o.status !== 'completed' && o.status !== 'cancelled') {
        addEvent(o.endDate, `OKR: ${o.title}`, 'bg-purple-500', 'okr');
      }
    });

    initiatives.filter(i => i.status !== 'done').forEach(i => {
      addEvent(i.dueDate, `Iniciativa: ${i.title}`, 'bg-orange-500', 'initiative');
    });

    // CRM Activities
    crmActivities.filter(a => !a.isCompleted).forEach(a => {
      addEvent(a.dueDate, `CRM: ${a.subject}`, 'bg-pink-500', 'crm');
    });

    return map;
  }, [allModules, objectives, initiatives, crmActivities, calYear, calMon]);

  // Project summaries
  const projectSummaries = useMemo(() => {
    return projects
      .filter(p => p.status !== 'cancelled')
      .slice(0, 8)
      .map(p => {
        const mods = allModules.filter(m => m.projectId === p.id);
        const completed = mods.filter(m => m.status === 'completed').length;
        const total = mods.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...p, completedModules: completed, totalModules: total, percent };
      });
  }, [projects, allModules]);

  // Fetch org users for birthdays
  useEffect(() => { fetchOrgUsers(); }, [fetchOrgUsers]);

  // Upcoming birthdays (next 30 days)
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    return orgUsers
      .filter(u => u.birthDate && u.status === 'active')
      .map(u => {
        const bd = new Date(u.birthDate! + 'T00:00:00');
        // This year's birthday
        let next = new Date(currentYear, bd.getMonth(), bd.getDate());
        // If already passed, check if it's today or use next year
        if (next < now && next.toDateString() !== now.toDateString()) {
          next = new Date(currentYear + 1, bd.getMonth(), bd.getDate());
        }
        const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...u, nextBirthday: next, daysUntil: diffDays < 0 ? 0 : diffDays };
      })
      .filter(u => u.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [orgUsers]);

  const loading = projLoading || okrLoading || crmLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const firstName = appUser?.fullName?.split(' ')[0] || 'usuario';
  const today = new Date();
  const todayStr = today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Hola {firstName}, qué lindo tenerte de vuelta
        </h1>
        <p className="text-gray-500 dark:text-gray-400 capitalize">{todayStr}{organization ? ` · ${organization.name}` : ''}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban className="w-4 h-4 text-primary-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Proyectos activos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeProjects}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-warning-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Iniciativas pendientes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingInitiatives.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Actividades CRM</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCRMActivities.length}</p>
            {overdueCRMActivities > 0 && (
              <span className="text-xs text-danger-600 font-medium">({overdueCRMActivities} vencidas)</span>
            )}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">OKRs en progreso</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{okrsInProgress}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-danger-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">OKRs en riesgo</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{okrsAtRisk}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Iniciativas pendientes + Actividades CRM */}
        <div className="lg:col-span-2 space-y-6">
          {/* Iniciativas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Iniciativas pendientes</h2>
              <Link to="/okrs/initiatives" className="text-sm text-primary-600 hover:underline">Ver tablero</Link>
            </div>
            {pendingInitiatives.length === 0 ? (
              <div className="card p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No hay iniciativas pendientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInitiatives.slice(0, 6).map(init => {
                  const isOverdue = init.dueDate && new Date(init.dueDate) < today;
                  const statusDot = init.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400';
                  return (
                    <Link
                      key={init.id}
                      to="/okrs/initiatives"
                      className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{init.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{init.okrTitle}</p>
                      </div>
                      {init.responsibleName && (
                        <span className="text-xs text-gray-400 flex-shrink-0 truncate max-w-[80px]">{init.responsibleName}</span>
                      )}
                      {init.dueDate && (
                        <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-danger-600 font-medium' : 'text-gray-400'}`}>
                          {new Date(init.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {pendingInitiatives.length > 6 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{pendingInitiatives.length - 6} más
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actividades CRM */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Handshake className="w-5 h-5 text-pink-500" />
                Actividades CRM
              </h2>
              <Link to="/crm/activities" className="text-sm text-primary-600 hover:underline">Ver todas</Link>
            </div>
            {pendingCRMActivities.length === 0 ? (
              <div className="card p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No hay actividades pendientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingCRMActivities.slice(0, 6).map(activity => {
                  const config = ACTIVITY_TYPE_CONFIG[activity.activityType];
                  const ActivityIcon = activity.activityType === 'llamada' ? Phone
                    : activity.activityType === 'email' ? Mail
                    : activity.activityType === 'reunion' ? Calendar
                    : FileText;
                  return (
                    <Link
                      key={activity.id}
                      to={activity.dealId ? `/crm/deals/${activity.dealId}` : `/crm/leads/${activity.leadId}`}
                      className={`card p-3 flex items-center gap-3 hover:shadow-md transition-shadow ${
                        activity.isOverdue ? 'border-danger-200 dark:border-danger-800 bg-danger-50/50 dark:bg-danger-900/10' : ''
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config?.color || '#6b7280'}20` }}
                      >
                        <ActivityIcon className="w-3.5 h-3.5" style={{ color: config?.color || '#6b7280' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.subject}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {activity.dealName || config?.label}
                        </p>
                      </div>
                      {activity.ownerName && (
                        <span className="text-xs text-gray-400 flex-shrink-0 truncate max-w-[80px]">{activity.ownerName}</span>
                      )}
                      {activity.dueDate && (
                        <span className={`text-xs flex-shrink-0 ${activity.isOverdue ? 'text-danger-600 font-medium' : 'text-gray-400'}`}>
                          {new Date(activity.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {pendingCRMActivities.length > 6 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{pendingCRMActivities.length - 6} más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendario */}
        <div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(new Date(calYear, calMon - 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{monthLabel}</h3>
              <button onClick={() => setCalMonth(new Date(calYear, calMon + 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0">
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`e-${i}`} className="h-9" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const events = eventsMap[day];
                const isToday = day === today.getDate() && calMon === today.getMonth() && calYear === today.getFullYear();
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`h-9 flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative
                      ${isToday ? 'bg-success-300 text-gray-900 font-bold' : ''}
                      ${isSelected ? 'ring-2 ring-primary-600' : ''}
                      ${!isToday && !isSelected ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    `}
                  >
                    {day}
                    {events && (
                      <div className="flex gap-0.5 absolute bottom-0.5">
                        {events.slice(0, 3).map((e, ei) => (
                          <div key={ei} className={`w-1 h-1 rounded-full ${e.color}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day events */}
            {selectedDay && eventsMap[selectedDay] && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {selectedDay}/{calMon + 1}/{calYear}
                </p>
                {eventsMap[selectedDay].map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${ev.color} flex-shrink-0`} />
                    <span className="text-gray-700 dark:text-gray-300 truncate">{ev.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cumpleaños */}
          {upcomingBirthdays.length > 0 && (
            <div className="card p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-500" />
                Cumpleaños
              </h3>
              <div className="space-y-2">
                {upcomingBirthdays.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D4FC59' }}>
                      <span className="text-xs font-bold" style={{ color: '#231F1F' }}>
                        {(u.fullName || u.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {u.fullName || u.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {u.nextBirthday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${
                      u.daysUntil === 0
                        ? 'text-pink-500'
                        : u.daysUntil <= 7
                          ? 'text-amber-500'
                          : 'text-gray-400'
                    }`}>
                      {u.daysUntil === 0 ? 'Hoy' : u.daysUntil === 1 ? 'Mañana' : `${u.daysUntil}d`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de proyectos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Proyectos</h2>
          <Link to="/projects/list" className="text-sm text-primary-600 hover:underline">Ver todos</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {projectSummaries.map(p => {
            const statusCfg = PROJECT_STATUS_CONFIG[p.status];
            const nps = npsScores[p.id];
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</h4>
                  <span className={`${statusCfg.bgClass} text-xs px-1.5 py-0.5 rounded-full flex-shrink-0`}>
                    {statusCfg.label}
                  </span>
                </div>
                {p.clientName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{p.clientName}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{p.completedModules}/{p.totalModules} módulos</span>
                  <div className="flex items-center gap-2">
                    {nps && (
                      <span className={`font-semibold ${
                        nps.nps >= 50 ? 'text-green-500' : nps.nps >= 0 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        NPS {nps.nps > 0 ? '+' : ''}{nps.nps}
                      </span>
                    )}
                    <span className="font-medium">{p.percent}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success-300 rounded-full transition-all"
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
