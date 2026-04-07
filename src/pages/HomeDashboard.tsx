import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  Handshake,
  Phone,
  Mail,
  FileText,
  User,
  Briefcase,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseLocalDate } from '../utils/helpers';
import { useOKR } from '../context/OKRContext';
import { useCRM } from '../context/CRMContext';
import { ACTIVITY_TYPE_CONFIG } from '../types/crm';

export function HomeDashboard() {
  const { appUser, organization } = useAuth();
  const { objectives, initiatives, loading: okrLoading } = useOKR();
  const { activities: crmActivities, deals, loading: crmLoading } = useCRM();

  // Pending initiatives for current user
  const pendingInitiatives = useMemo(() => {
    const krMap: Record<string, string> = {};
    objectives.forEach(obj => {
      obj.keyResults.forEach(kr => { krMap[kr.id] = obj.title; });
    });
    return initiatives
      .filter(i => i.status !== 'done' && i.responsibleId === appUser?.id)
      .map(i => ({ ...i, okrTitle: krMap[i.keyResultId] || '' }))
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [initiatives, objectives, appUser?.id]);

  // Pending CRM activities for current user
  const pendingCRMActivities = useMemo(() => {
    const now = new Date();
    return crmActivities
      .filter(a => !a.isCompleted && a.ownerId === appUser?.id)
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
  }, [crmActivities, deals, appUser?.id]);

  const overdueCRMActivities = pendingCRMActivities.filter(a => a.isOverdue).length;

  const loading = okrLoading || crmLoading;

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

  // Frase motivacional diaria (cambia cada día del año)
  const FRASES = [
    'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
    'No cuentes los días, haz que los días cuenten.',
    'La disciplina es el puente entre metas y logros.',
    'Cada día es una nueva oportunidad para ser mejor.',
    'Lo que hoy parece difícil, mañana será tu calentamiento.',
    'El progreso, no la perfección, es lo que importa.',
    'Grandes cosas nunca vinieron de zonas de confort.',
    'Tu único límite eres vos mismo.',
    'Hoy es un buen día para empezar.',
    'El esfuerzo de hoy es el éxito de mañana.',
    'Creé en el proceso y confiá en tu camino.',
    'Cada paso cuenta, por más pequeño que sea.',
    'La constancia transforma lo ordinario en extraordinario.',
    'Hacé que tu trabajo hable por vos.',
    'Lo importante no es la velocidad, sino la dirección.',
    'Un objetivo sin plan es solo un deseo.',
    'La mejor inversión es en vos mismo.',
    'Enfocate en el progreso, no en la perfección.',
    'Las oportunidades no se esperan, se crean.',
    'Hoy es el día perfecto para dar un paso más.',
    'El talento te abre puertas, la actitud te las mantiene abiertas.',
    'No hay atajos para llegar a donde vale la pena.',
    'La acción es la clave de todo éxito.',
    'Rendirse no es una opción, reinventarse sí.',
    'Lo que sembrás hoy, lo cosechás mañana.',
    'Cada desafío es una oportunidad disfrazada.',
    'La excelencia no es un acto, es un hábito.',
    'Pensá en grande, actuá en grande.',
    'El mejor momento para empezar fue ayer. El segundo mejor es ahora.',
    'Tu actitud determina tu altitud.',
    'La perseverancia convierte lo imposible en posible.',
  ];
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const fraseDiaria = FRASES[dayOfYear % FRASES.length];

  const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    member: 'Miembro',
    viewer: 'Visualizador',
  };

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Hola {firstName}, qué lindo tenerte de vuelta
        </h1>
        <p className="text-gray-500 dark:text-gray-400 capitalize">{todayStr}{organization ? ` · ${organization.name}` : ''}</p>
        <p className="text-sm text-accent-600 dark:text-accent-400 italic mt-1">"{fraseDiaria}"</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-warning-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Mis iniciativas pendientes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingInitiatives.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Mis actividades CRM</span>
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
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Total pendiente</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingInitiatives.length + pendingCRMActivities.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Iniciativas + Actividades CRM */}
        <div className="lg:col-span-2 space-y-6">
          {/* Iniciativas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Mis iniciativas pendientes</h2>
              <Link to="/okrs/initiatives" className="text-sm text-primary-600 hover:underline">Ver tablero</Link>
            </div>
            {pendingInitiatives.length === 0 ? (
              <div className="card p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No tenés iniciativas pendientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInitiatives.slice(0, 8).map(init => {
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
                      {init.dueDate && (
                        <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-danger-600 font-medium' : 'text-gray-400'}`}>
                          {parseLocalDate(init.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {pendingInitiatives.length > 8 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{pendingInitiatives.length - 8} más
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
                Mis actividades CRM
              </h2>
              <Link to="/crm/activities" className="text-sm text-primary-600 hover:underline">Ver todas</Link>
            </div>
            {pendingCRMActivities.length === 0 ? (
              <div className="card p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No tenés actividades pendientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingCRMActivities.slice(0, 8).map(activity => {
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
                      {activity.dueDate && (
                        <span className={`text-xs flex-shrink-0 ${activity.isOverdue ? 'text-danger-600 font-medium' : 'text-gray-400'}`}>
                          {parseLocalDate(activity.dueDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {pendingCRMActivities.length > 8 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{pendingCRMActivities.length - 8} más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Datos personales */}
        <div>
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Mi perfil
            </h3>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D4FC59' }}>
                <span className="text-lg font-bold" style={{ color: '#231F1F' }}>
                  {(appUser?.fullName || appUser?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {appUser?.fullName || 'Sin nombre'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{appUser?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              {appUser?.jobTitle && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cargo</p>
                    <p className="text-sm text-gray-900 dark:text-white truncate">{appUser.jobTitle}</p>
                  </div>
                </div>
              )}
              {appUser?.role && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Rol</p>
                    <p className="text-sm text-gray-900 dark:text-white">{ROLE_LABELS[appUser.role] || appUser.role}</p>
                  </div>
                </div>
              )}
              {appUser?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                    <p className="text-sm text-gray-900 dark:text-white">{appUser.phone}</p>
                  </div>
                </div>
              )}
              {organization && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Organización</p>
                    <p className="text-sm text-gray-900 dark:text-white truncate">{organization.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
