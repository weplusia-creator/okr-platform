import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { onTabResumed } from '../../lib/supabase';
import {
  ArrowLeft,
  BarChart3,
  Package,
  BookOpen,
  GanttChart,
  Users,
  FileText,
  DollarSign,
  Activity,
  Plus,
  Pencil,
  Trash2,
  LayoutList,
  Kanban,
  ClipboardList,
  ClipboardCheck,
  Star,
  LayoutGrid,
  BookMarked,
  MoreHorizontal,
  CalendarClock,
  Loader2,
  Megaphone,
  Pin,
  Send,
  Check,
  X,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useBMC } from '../../context/BMCContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { parseLocalDate } from '../../utils/helpers';
import { useCheckin } from '../../context/CheckinContext';
import {
  ProjectKPIs,
  DeliverableCard,
  DeliverableForm,
  KanbanBoard,
  GanttChart as GanttChartComponent,
  TeamSection,
  DocumentsSection,
  FinanceSection,
  ActivityTimeline,
  AlumniOnboardingForm,
  AttendanceSection,
  NPSSection,
} from '../../components/projects';
import { ModuleCard } from '../../components/projects/ModuleCard';
import { ModuleForm } from '../../components/projects/ModuleForm';
import { ModuleProgress } from '../../components/projects/ModuleProgress';
import type {
  ProjectModule,
  ProjectDeliverable,
  AlumniProfile,
} from '../../types/projects';
import {
  PROJECT_STATUS_CONFIG,
  getProjectDisplayName,
} from '../../types/projects';
import { todayLocalISO } from '../../utils/helpers';

type TabKey = 'summary' | 'novedades' | 'deliverables' | 'modules' | 'gantt' | 'team' | 'attendance' | 'nps' | 'documents' | 'finance' | 'activity' | 'onboarding' | 'bmc' | 'playbook' | 'checkins';

const PRIMARY_TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'summary', label: 'Resumen', icon: BarChart3 },
  { key: 'novedades', label: 'Novedades', icon: Megaphone },
  { key: 'modules', label: 'Módulos', icon: BookOpen },
  { key: 'deliverables', label: 'Entregables', icon: Package },
  { key: 'gantt', label: 'Gantt', icon: GanttChart },
  { key: 'team', label: 'Equipo', icon: Users },
];

const SECONDARY_TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'checkins', label: 'Check-ins', icon: ClipboardCheck },
  { key: 'bmc', label: 'BMC', icon: LayoutGrid },
  { key: 'playbook', label: 'Playbook', icon: BookMarked },
  { key: 'attendance', label: 'Asistencia', icon: ClipboardCheck },
  { key: 'nps', label: 'NPS', icon: Star },
  { key: 'documents', label: 'Documentos', icon: FileText },
  { key: 'finance', label: 'Finanzas', icon: DollarSign },
  { key: 'activity', label: 'Actividad', icon: Activity },
];

const ALUMNO_TABS: TabKey[] = ['novedades', 'deliverables', 'modules', 'gantt', 'team', 'attendance', 'documents', 'onboarding'];

function formatNovedadDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const {
    currentProject,
    participants,
    deliverables,
    modules,
    documents,
    activityLog,
    loading,
    getProject,
    fetchParticipants,
    fetchDeliverables,
    fetchModules,
    fetchDocuments,
    fetchActivityLog,
    deleteProject,
    completeModule,
    deleteModule,
    alumniProfile,
    fetchAlumniProfile,
    fetchAllAlumniProfiles,
    rescheduleModulesWeekly,
    novedades,
    fetchNovedades,
    addNovedad,
    updateNovedad,
    deleteNovedad,
    togglePinNovedad,
  } = useProjects();

  const [editingNovedadId, setEditingNovedadId] = useState<string | null>(null);
  const [editingNovedadContent, setEditingNovedadContent] = useState('');

  const { canvases, fetchCanvases } = useBMC();
  const { playbooks, fetchPlaybooks } = usePlaybook();
  const { checkins, configs, fetchCheckins, fetchConfigs } = useCheckin();

  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModule, setEditingModule] = useState<ProjectModule | null>(null);
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<ProjectDeliverable | null>(null);
  const [deliverableViewMode, setDeliverableViewMode] = useState<'list' | 'kanban'>('list');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [, setAlumniProfileChecked] = useState(false);
  const [allAlumniProfiles, setAllAlumniProfiles] = useState<AlumniProfile[]>([]);
  const [editingAlumniProfile, setEditingAlumniProfile] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [novedadContent, setNovedadContent] = useState('');
  const [postingNovedad, setPostingNovedad] = useState(false);

  // Determine current user's role in this project
  const currentParticipant = useMemo(() => {
    if (!appUser) return null;
    return participants.find(p => p.userId === appUser.id) ?? null;
  }, [participants, appUser]);

  const isAlumno = currentParticipant?.role === 'alumno';
  const isAdminOrConsultor = currentParticipant?.role === 'admin' || currentParticipant?.role === 'consultor';
  const showOnboardingTab = isAlumno || isAdminOrConsultor;

  // BMC & Playbook linked to this project
  const projectCanvases = useMemo(() => canvases.filter(c => c.projectId === id), [canvases, id]);
  const projectPlaybooks = useMemo(() => playbooks.filter(p => p.projectId === id && p.status === 'activo'), [playbooks, id]);
  const projectCheckins = useMemo(() => checkins.filter(c => c.proyectoId === id).sort((a, b) => b.numero - a.numero), [checkins, id]);
  const projectConfig = useMemo(() => configs.find(c => c.proyectoId === id), [configs, id]);
  const hasBMC = projectCanvases.length > 0;
  const hasPlaybook = projectPlaybooks.length > 0;

  // Default tab for alumnos
  useEffect(() => {
    if (isAlumno && activeTab === 'summary') {
      setActiveTab('modules');
    }
  }, [isAlumno, activeTab]);

  const { primaryTabs, secondaryTabs } = useMemo(() => {
    let primary = [...PRIMARY_TABS];
    let secondary = [...SECONDARY_TABS];
    if (showOnboardingTab) {
      secondary = [...secondary, { key: 'onboarding' as TabKey, label: 'Onboarding', icon: ClipboardList }];
    }
    if (isAlumno) {
      primary = primary.filter(t => ALUMNO_TABS.includes(t.key));
      secondary = secondary.filter(t => ALUMNO_TABS.includes(t.key));
    }
    return { primaryTabs: primary, secondaryTabs: secondary };
  }, [showOnboardingTab, isAlumno]);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSecondaryActive = secondaryTabs.some(t => t.key === activeTab);

  // Load project data. The cancelled flag prevents fetches from a stale id
  // (e.g. fast navigation between projects) from updating state belonging to
  // the new project's view.
  const loadProjectData = useCallback((projectId: string) => {
    console.log('[ProjectDetail] Loading project:', projectId);
    getProject(projectId).then(result => {
      if (!result) {
        console.error('[ProjectDetail] getProject returned null');
        setLoadError(true);
      }
    }).catch(e => {
      console.error('[ProjectDetail] getProject error:', e);
      setLoadError(true);
    });
    fetchParticipants(projectId).catch(e => console.error('[ProjectDetail] fetchParticipants error:', e));
    fetchDeliverables(projectId).catch(e => console.error('[ProjectDetail] fetchDeliverables error:', e));
    fetchModules(projectId).catch(e => console.error('[ProjectDetail] fetchModules error:', e));
    fetchDocuments(projectId).catch(e => console.error('[ProjectDetail] fetchDocuments error:', e));
    fetchActivityLog(projectId).catch(e => console.error('[ProjectDetail] fetchActivityLog error:', e));
    fetchNovedades(projectId).catch(e => console.error('[ProjectDetail] fetchNovedades error:', e));
    fetchCanvases(projectId).catch(e => console.error('[ProjectDetail] fetchCanvases error:', e));
    fetchPlaybooks().catch(e => console.error('[ProjectDetail] fetchPlaybooks error:', e));
    fetchCheckins(projectId).catch(e => console.error('[ProjectDetail] fetchCheckins error:', e));
    fetchConfigs().catch(e => console.error('[ProjectDetail] fetchConfigs error:', e));
  }, [getProject, fetchParticipants, fetchDeliverables, fetchModules, fetchDocuments, fetchActivityLog,
      fetchNovedades, fetchCanvases, fetchPlaybooks, fetchCheckins, fetchConfigs]);

  useEffect(() => {
    if (!id) return;
    loadProjectData(id);
  }, [id, loadProjectData]);

  // When the user returns to a backgrounded tab, refetch project-specific
  // data (the realtime channel for these tables is per-project, lives in
  // ProjectContext, and may have missed events while throttled).
  useEffect(() => {
    if (!id) return;
    return onTabResumed(() => loadProjectData(id));
  }, [id, loadProjectData]);

  // Check alumni onboarding status
  useEffect(() => {
    if (!id || !appUser?.id || !isAlumno) return;
    fetchAlumniProfile(id, appUser.id).then((profile) => {
      setAlumniProfileChecked(true);
      if (!profile) {
        setShowOnboardingModal(true);
      }
    });
  }, [id, appUser?.id, isAlumno, fetchAlumniProfile]);

  // Load all alumni profiles for admin/consultor view
  useEffect(() => {
    if (!id || !isAdminOrConsultor) return;
    fetchAllAlumniProfiles(id).then(setAllAlumniProfiles);
  }, [id, isAdminOrConsultor, fetchAllAlumniProfiles]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboardingModal(false);
    setEditingAlumniProfile(false);
    if (id && appUser?.id) {
      fetchAlumniProfile(id, appUser.id);
    }
    if (id && isAdminOrConsultor) {
      fetchAllAlumniProfiles(id).then(setAllAlumniProfiles);
    }
  }, [id, appUser?.id, fetchAlumniProfile, isAdminOrConsultor, fetchAllAlumniProfiles]);

  const handleDeleteProject = async () => {
    if (!id) return;
    await deleteProject(id);
    navigate('/projects/list');
  };

  // The active module is the first one with status 'pending' or 'in_progress'
  const activeModule = useMemo(() => {
    return modules.find((m) => m.status === 'pending' || m.status === 'in_progress') ?? null;
  }, [modules]);

  // Sorted modules by order, filtered for alumnos
  const sortedModules = useMemo(() => {
    let filtered = [...modules].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (isAlumno) {
      const today = todayLocalISO();
      filtered = filtered.filter(m =>
        m.status === 'completed' || (m.startDate && m.startDate <= today)
      );
    }
    return filtered;
  }, [modules, isAlumno]);

  const handleCompleteModule = async (moduleId: string) => {
    await completeModule(moduleId);
    if (id) fetchModules(id);
  };

  const handleEditDeliverable = (deliverable: ProjectDeliverable) => {
    setEditingDeliverable(deliverable);
    setShowDeliverableForm(true);
  };

  const handlePostNovedad = async () => {
    if (!id || !novedadContent.trim()) return;
    setPostingNovedad(true);
    // Race against a hard local timeout so the button never stays stuck on
    // "Publicando..." even if the underlying promise never settles.
    const HARD_TIMEOUT_MS = 35_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado. Recargá la página e intentá de nuevo.')), HARD_TIMEOUT_MS),
    );
    try {
      await Promise.race([addNovedad(id, novedadContent.trim()), timeoutPromise]);
      setNovedadContent('');
    } catch (err: any) {
      alert('Error al publicar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setPostingNovedad(false);
    }
  };

  const [projectLoaded, setProjectLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setProjectLoaded(false);
    setLoadError(false);
  }, [id]);

  useEffect(() => {
    if (currentProject?.id === id) {
      setProjectLoaded(true);
      setLoadError(false);
    }
  }, [currentProject, id]);

  if (!projectLoaded && !currentProject) {
    if (loadError) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-2">Error al cargar el proyecto</p>
          <button
            onClick={() => {
              setLoadError(false);
              setProjectLoaded(false);
              if (id) getProject(id);
            }}
            className="text-primary-600 hover:underline mr-4"
          >
            Reintentar
          </button>
          <Link to="/projects/list" className="text-gray-500 hover:underline">
            Volver a proyectos
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Proyecto no encontrado</p>
        <Link to="/projects/list" className="text-primary-600 hover:underline mt-2 inline-block">
          Volver a proyectos
        </Link>
      </div>
    );
  }

  const statusConfig = PROJECT_STATUS_CONFIG[currentProject.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/projects/list"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getProjectDisplayName(currentProject)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/projects/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger-600 bg-white dark:bg-gray-800 border border-danger-300 dark:border-danger-600 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirmar eliminacion</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Esta accion eliminara el proyecto y todos sus datos asociados. Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 text-sm font-medium text-white bg-danger-600 rounded-lg hover:bg-danger-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alumni onboarding modal */}
      {showOnboardingModal && isAlumno && appUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 my-8 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Bienvenido al proyecto</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Completa este formulario antes de continuar. Solo te tomara unos minutos.
            </p>
            <AlumniOnboardingForm
              projectId={id!}
              userId={appUser.id}
              onComplete={handleOnboardingComplete}
            />
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 items-center" aria-label="Tabs">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}

          {/* More dropdown */}
          {secondaryTabs.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex items-center gap-1.5 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isSecondaryActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
                {isSecondaryActive ? secondaryTabs.find(t => t.key === activeTab)?.label : 'Más'}
              </button>
              {showMoreMenu && (
                <div className="absolute z-50 mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
                  {secondaryTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setShowMoreMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          isActive ? 'text-primary-600 font-semibold bg-primary-50 dark:bg-primary-900/20' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {/* ===== RESUMEN ===== */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <ProjectKPIs
              project={currentProject}
              modules={modules}
              deliverables={deliverables}
              participants={participants}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Details card */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalles del proyecto</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentProject.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Descripcion</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{currentProject.description}</dd>
                    </div>
                  )}
                  {currentProject.clientName && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{currentProject.clientName}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass}`}>
                        {statusConfig.label}
                      </span>
                    </dd>
                  </div>
                  {currentProject.startDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de inicio</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {parseLocalDate(currentProject.startDate).toLocaleDateString('es-AR')}
                      </dd>
                    </div>
                  )}
                  {currentProject.estimatedEndDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha estimada de fin</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {parseLocalDate(currentProject.estimatedEndDate).toLocaleDateString('es-AR')}
                      </dd>
                    </div>
                  )}
                  {currentProject.actualEndDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha real de fin</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {parseLocalDate(currentProject.actualEndDate).toLocaleDateString('es-AR')}
                      </dd>
                    </div>
                  )}
                  {currentProject.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notas</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{currentProject.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Recent activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad reciente</h3>
                <ActivityTimeline activityLog={activityLog.slice(0, 10)} />
              </div>
            </div>
          </div>
        )}

        {/* ===== NOVEDADES ===== */}
        {activeTab === 'novedades' && (
          <div className="space-y-4">
            {/* New post form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                    {appUser?.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    className="input resize-none"
                    rows={2}
                    placeholder="Compartí una novedad con el equipo..."
                    value={novedadContent}
                    onChange={e => setNovedadContent(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && novedadContent.trim()) {
                        e.preventDefault();
                        handlePostNovedad();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">Ctrl+Enter para publicar</span>
                    <button
                      onClick={handlePostNovedad}
                      disabled={!novedadContent.trim() || postingNovedad}
                      className="btn-primary text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {postingNovedad ? 'Publicando...' : 'Publicar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed */}
            {novedades.length > 0 ? (
              <div className="space-y-3">
                {novedades.map(n => (
                  <div
                    key={n.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl border ${n.pinned ? 'border-amber-300 dark:border-amber-600' : 'border-gray-200 dark:border-gray-700'} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                          {n.userName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{n.userName || 'Usuario'}</span>
                          <span className="text-xs text-gray-400">{formatNovedadDate(n.createdAt)}</span>
                          {n.pinned && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <Pin className="w-3 h-3" /> Fijada
                            </span>
                          )}
                        </div>
                        {editingNovedadId === n.id ? (
                          <div className="mt-1">
                            <textarea
                              className="input resize-none text-sm"
                              rows={3}
                              value={editingNovedadContent}
                              onChange={e => setEditingNovedadContent(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && editingNovedadContent.trim()) {
                                  e.preventDefault();
                                  updateNovedad(n.id, editingNovedadContent.trim())
                                    .then(() => setEditingNovedadId(null))
                                    .catch(() => alert('Error al editar'));
                                }
                                if (e.key === 'Escape') setEditingNovedadId(null);
                              }}
                              autoFocus
                            />
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => {
                                  if (!editingNovedadContent.trim()) return;
                                  updateNovedad(n.id, editingNovedadContent.trim())
                                    .then(() => setEditingNovedadId(null))
                                    .catch(() => alert('Error al editar'));
                                }}
                                className="btn-primary text-xs inline-flex items-center gap-1 px-2.5 py-1"
                              >
                                <Check className="w-3 h-3" /> Guardar
                              </button>
                              <button
                                onClick={() => setEditingNovedadId(null)}
                                className="btn-secondary text-xs inline-flex items-center gap-1 px-2.5 py-1"
                              >
                                <X className="w-3 h-3" /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{n.content}</p>
                        )}
                      </div>
                      {(n.userId === appUser?.id || appUser?.role === 'admin') && editingNovedadId !== n.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {n.userId === appUser?.id && (
                            <button
                              onClick={() => { setEditingNovedadId(n.id); setEditingNovedadContent(n.content); }}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => togglePinNovedad(n.id, !n.pinned).catch(() => alert('Error al fijar novedad'))}
                            className={`p-1.5 rounded-lg transition-colors ${n.pinned ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            title={n.pinned ? 'Desfijar' : 'Fijar'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminar esta novedad?')) {
                                deleteNovedad(n.id).catch(() => alert('Error al eliminar'));
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No hay novedades aún</p>
                <p className="text-xs text-gray-400 mt-1">Publicá la primera novedad del proyecto</p>
              </div>
            )}
          </div>
        )}

        {/* ===== ENTREGABLES ===== */}
        {activeTab === 'deliverables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setDeliverableViewMode('list')}
                  className={`p-2 ${deliverableViewMode === 'list' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeliverableViewMode('kanban')}
                  className={`p-2 ${deliverableViewMode === 'kanban' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <Kanban className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingDeliverable(null);
                  setShowDeliverableForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo Entregable
              </button>
            </div>
            {deliverables.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No hay entregables aun</p>
              </div>
            ) : deliverableViewMode === 'kanban' ? (
              <KanbanBoard
                deliverables={deliverables}
                onEditDeliverable={handleEditDeliverable}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliverables.map((d) => (
                  <DeliverableCard
                    key={d.id}
                    deliverable={d}
                    onEdit={() => {
                      setEditingDeliverable(d);
                      setShowDeliverableForm(true);
                    }}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            )}
            {showDeliverableForm && (
              <DeliverableForm
                isOpen={true}
                projectId={id!}
                deliverable={editingDeliverable ?? undefined}
                participants={participants}
                onClose={() => {
                  setShowDeliverableForm(false);
                  setEditingDeliverable(null);
                }}
                onSaved={() => {
                  setShowDeliverableForm(false);
                  setEditingDeliverable(null);
                  if (id) fetchDeliverables(id);
                }}
              />
            )}
          </div>
        )}

        {/* ===== MODULOS ===== */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <ModuleProgress modules={modules} />
              </div>
              {sortedModules.length > 1 && (
                <button
                  onClick={async () => {
                    if (!id || rescheduling) return;
                    setRescheduling(true);
                    await rescheduleModulesWeekly(id);
                    setRescheduling(false);
                  }}
                  disabled={rescheduling}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0 disabled:opacity-50"
                  title="Reprogramar módulos con intervalos semanales"
                >
                  {rescheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                  {rescheduling ? 'Reprogramando...' : 'Reprogramar semanal'}
                </button>
              )}
            </div>

            {sortedModules.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No hay modulos aun</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedModules.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    index={index}
                    isActive={activeModule?.id === module.id}
                    onEdit={() => {
                      setEditingModule(module);
                      setShowModuleForm(true);
                    }}
                    onComplete={() => handleCompleteModule(module.id)}
                    onDelete={() => deleteModule(module.id)}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => {
                  setEditingModule(null);
                  setShowModuleForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar modulo
              </button>
            </div>

            {showModuleForm && (
              <ModuleForm
                isOpen={true}
                projectId={id!}
                module={editingModule ?? undefined}
                nextSortOrder={modules.length + 1}
                onClose={() => {
                  setShowModuleForm(false);
                  setEditingModule(null);
                }}
                onSaved={() => {
                  setShowModuleForm(false);
                  setEditingModule(null);
                  if (id) fetchModules(id);
                }}
              />
            )}
          </div>
        )}

        {/* ===== GANTT ===== */}
        {activeTab === 'gantt' && (
          <GanttChartComponent
            modules={modules}
          />
        )}

        {/* ===== EQUIPO ===== */}
        {activeTab === 'team' && (
          <TeamSection
            projectId={id!}
            participants={participants}
          />
        )}

        {/* ===== ASISTENCIA ===== */}
        {activeTab === 'attendance' && (
          <AttendanceSection
            projectId={id!}
            participants={participants}
          />
        )}

        {/* ===== NPS ===== */}
        {activeTab === 'nps' && (
          <NPSSection projectId={id!} />
        )}

        {/* ===== DOCUMENTOS ===== */}
        {activeTab === 'documents' && (
          <DocumentsSection
            projectId={id!}
            documents={documents}
          />
        )}

        {/* ===== FINANZAS ===== */}
        {activeTab === 'finance' && (
          <FinanceSection project={currentProject} />
        )}

        {/* ===== ACTIVIDAD ===== */}
        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historial de actividad</h3>
            <ActivityTimeline activityLog={activityLog} />
          </div>
        )}

        {/* ===== CHECK-INS ===== */}
        {activeTab === 'checkins' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Check-ins</h3>
              <div className="flex gap-2">
                <Link
                  to={`/checkins/config/${id}`}
                  className="btn-secondary text-sm"
                >
                  Configurar
                </Link>
                <Link
                  to={`/checkins/history/${id}`}
                  className="btn-secondary text-sm"
                >
                  Historial
                </Link>
              </div>
            </div>
            {projectCheckins.length > 0 ? (
              <div className="space-y-2">
                {projectCheckins.slice(0, 10).map(ci => (
                  <Link
                    key={ci.id}
                    to={`/checkins/${ci.id}`}
                    className="card px-5 py-3 flex items-center gap-3 hover:shadow-md transition-shadow"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">#{ci.numero}</span>
                    <span className="text-sm text-gray-500 flex-1">{ci.periodo || ''}</span>
                    <span className={`text-sm font-bold ${ci.pulsoScore && ci.pulsoScore >= 8 ? 'text-green-600' : ci.pulsoScore && ci.pulsoScore >= 5 ? 'text-yellow-600' : ci.pulsoScore ? 'text-red-600' : 'text-gray-400'}`}>
                      {ci.pulsoScore ?? '-'}/10
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <ClipboardCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No hay check-ins para este proyecto</p>
                <Link to={`/checkins/config/${id}`} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Configurar check-ins
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ===== BMC ===== */}
        {activeTab === 'bmc' && (
          hasBMC ? (
            <div className="space-y-4">
              {projectCanvases.map(canvas => (
                <div key={canvas.id} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{canvas.name}</h3>
                    <Link
                      to={`/bmc/${canvas.id}`}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                    >
                      Abrir canvas completo →
                    </Link>
                  </div>
                  {canvas.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{canvas.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <LayoutGrid className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No hay BMC vinculado a este proyecto</p>
              <Link to="/bmc" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Crear BMC
              </Link>
            </div>
          )
        )}

        {/* ===== PLAYBOOK ===== */}
        {activeTab === 'playbook' && (
          hasPlaybook ? (
            <div className="space-y-4">
              {projectPlaybooks.map(pb => (
                <div key={pb.id} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pb.name}</h3>
                    <Link
                      to={`/playbook/${pb.id}/view`}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                    >
                      Ver playbook completo →
                    </Link>
                  </div>
                  {pb.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{pb.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <BookMarked className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No hay Playbook vinculado a este proyecto</p>
              <Link to="/playbook" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Crear Playbook
              </Link>
            </div>
          )
        )}

        {/* ===== ONBOARDING ===== */}
        {activeTab === 'onboarding' && (
          <div>
            {isAlumno && alumniProfile && !editingAlumniProfile && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tu perfil de onboarding</h3>
                  <button
                    onClick={() => setEditingAlumniProfile(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                </div>
                <dl className="space-y-4">
                  <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre completo</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.fullName}</dd></div>
                  {alumniProfile.company && <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Empresa</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.company}</dd></div>}
                  {alumniProfile.position && <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cargo</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.position}</dd></div>}
                  {alumniProfile.phone && <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefono</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.phone}</dd></div>}
                  {alumniProfile.city && <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Ciudad</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.city}</dd></div>}
                  <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Expectativas</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{alumniProfile.expectations}</dd></div>
                  {alumniProfile.previousExperience && <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Experiencia previa</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{alumniProfile.previousExperience}</dd></div>}
                  <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Indicador objetivo</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.targetKpi}</dd></div>
                  {alumniProfile.targetKpiCurrentValue && <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor actual</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.targetKpiCurrentValue}</dd></div>}
                  {alumniProfile.targetKpiGoalValue && <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Meta</dt><dd className="mt-1 text-sm text-gray-900 dark:text-white">{alumniProfile.targetKpiGoalValue}</dd></div>}
                </dl>
              </div>
            )}

            {isAlumno && editingAlumniProfile && appUser && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <AlumniOnboardingForm
                  projectId={id!}
                  userId={appUser.id}
                  existingProfile={alumniProfile ?? undefined}
                  onComplete={handleOnboardingComplete}
                />
              </div>
            )}

            {isAdminOrConsultor && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Perfiles de alumnos ({allAlumniProfiles.length})</h3>
                {allAlumniProfiles.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ningun alumno completo el onboarding aun</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allAlumniProfiles.map(profile => (
                      <div key={profile.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{profile.fullName}</h4>
                        {(profile.company || profile.position) && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {[profile.position, profile.company].filter(Boolean).join(' en ')}
                          </p>
                        )}
                        <div className="mt-3 space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">KPI objetivo:</span>{' '}
                            <span className="text-gray-900 dark:text-white">{profile.targetKpi}</span>
                          </div>
                          {profile.targetKpiCurrentValue && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Valor actual:</span>{' '}
                              <span className="text-gray-900 dark:text-white">{profile.targetKpiCurrentValue}</span>
                            </div>
                          )}
                          {profile.targetKpiGoalValue && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Meta:</span>{' '}
                              <span className="text-gray-900 dark:text-white">{profile.targetKpiGoalValue}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Expectativas:</span>{' '}
                            <span className="text-gray-900 dark:text-white">{profile.expectations}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                          Completado: {new Date(profile.completedAt).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
