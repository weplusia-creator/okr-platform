import {
  LayoutDashboard,
  FolderKanban,
  DollarSign,
  BarChart3,
  Target,
  Users,
  Sparkles,
  Eye,
  Calendar,
  BookOpen,
} from 'lucide-react';

interface Section {
  icon: React.ElementType;
  title: string;
  color: string;
  items: string[];
}

const SECTIONS: Section[] = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
    items: [
      'Vista general con métricas clave de la organización.',
      'Resumen de proyectos activos, facturación y estado del equipo.',
      'Acceso rápido a las secciones principales.',
    ],
  },
  {
    icon: FolderKanban,
    title: 'Proyectos',
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400',
    items: [
      'Dashboard de proyectos: vista general de todos los proyectos con estado, progreso y métricas.',
      'Crear proyecto: asignar cliente, servicio, fechas, presupuesto y equipo.',
      'Al seleccionar un servicio, los módulos del template se crean automáticamente.',
      'Módulos: cada proyecto tiene módulos con subtareas, links (presentación, video, tarea, material), fechas y estado.',
      'Equipo: asignar participantes al proyecto con rol y tarifa.',
      'Asistencia: registrar sesiones de asistencia por módulo y marcar presentes.',
      'NPS: cada módulo genera una encuesta NPS automática. Compartir link con participantes.',
      'Documentos: subir y organizar documentos del proyecto.',
      'Gantt: vista de línea de tiempo de todos los proyectos.',
      'Clientes: gestión de empresas cliente con datos de contacto.',
    ],
  },
  {
    icon: DollarSign,
    title: 'Finanzas',
    color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
    items: [
      'Dashboard financiero: ingresos, gastos y métricas de rentabilidad.',
      'Facturas: crear, editar y dar seguimiento a facturas. Estados: borrador, enviada, pagada, vencida.',
      'Flujo de caja: gráfico mensual de ingresos vs gastos. Navegar entre años con las flechas.',
      'Pagos por proyecto: se generan automáticamente al crear un proyecto con fee mensual.',
    ],
  },
  {
    icon: BarChart3,
    title: 'KPIs',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
    items: [
      'Definir indicadores clave de rendimiento personalizados.',
      'Registrar valores periódicamente para hacer seguimiento.',
      'Visualizar tendencias y progreso de cada KPI.',
    ],
  },
  {
    icon: Target,
    title: 'OKRs',
    color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
    items: [
      'Objetivos: crear objetivos con key results medibles. Cada KR tiene progreso, responsable y fecha.',
      'Iniciativas: tablero Kanban (Por hacer, En progreso, Hecho) para gestionar iniciativas.',
      'Arrastrar y soltar iniciativas entre columnas para cambiar estado.',
      'Comentarios: dejar comentarios en cada iniciativa para coordinación del equipo.',
      'Asignar responsable a cada iniciativa y key result.',
    ],
  },
  {
    icon: Users,
    title: 'Equipo',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
    items: [
      'Consultor: gestionar usuarios de tipo consultor. Crear, editar rol, cargo y estado.',
      'Clientes: gestionar usuarios de tipo cliente. Asignar a empresa cliente.',
      'Roles disponibles: admin (acceso total) y viewer (solo lectura).',
      'Al crear un usuario se le asigna contraseña temporal. Puede cambiarla después.',
      'Eliminar usuario lo marca como inactivo (no se pierde la información).',
    ],
  },
  {
    icon: Sparkles,
    title: 'Servicios',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    items: [
      'Definir los servicios/productos que ofrece la consultora.',
      'Cada servicio tiene módulos template que se copian automáticamente al crear un proyecto.',
      'Editar módulos del template: título, descripción, orden.',
      'Los módulos del proyecto son independientes del template — editarlos no afecta al servicio ni viceversa.',
    ],
  },
  {
    icon: Calendar,
    title: 'Reuniones',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400',
    items: [
      'Crear reuniones recurrentes semanales: título, día, hora, duración y ubicación.',
      'Se generan automáticamente las próximas 8 ocurrencias.',
      'Cada ocurrencia tiene link a Google Calendar para agendar fácilmente.',
      'Escribir minutas en cada ocurrencia para documentar lo hablado.',
      'Marcar ocurrencias como completadas o canceladas.',
    ],
  },
  {
    icon: Eye,
    title: 'Portal del Cliente',
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400',
    items: [
      'Los usuarios tipo cliente acceden automáticamente al portal.',
      'Ven solo los proyectos asignados a su empresa.',
      'Cada proyecto muestra: progreso general, módulos con subtareas, links, fechas y asistencia.',
      'Los consultores pueden previsualizar el portal desde "Portal Cliente" en el menú.',
      'El cliente no puede editar — es vista de solo lectura.',
    ],
  },
];

export function Manual() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manual de uso</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Guía completa de todas las funcionalidades de la plataforma</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map(section => (
          <div
            key={section.title}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${section.color}`}>
                <section.icon className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="text-gray-300 dark:text-gray-600 mt-1.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
