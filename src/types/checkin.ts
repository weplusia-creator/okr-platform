// ===== Check-in Client Types =====

// ===== Enums/Union Types =====

export type CheckinStatus = 'pendiente' | 'completado_cliente' | 'en_reunion' | 'cerrado';
export type CheckinFrecuencia = 'semanal' | 'quincenal' | 'mensual';
export type CheckinSeccion = 'pulso' | 'avances' | 'problemas' | 'proxima_semana' | 'feedback';
export type CheckinEmoji = 'feliz' | 'neutral' | 'triste';
export type CompromisoStatus = 'pendiente' | 'en_progreso' | 'completado' | 'no_cumplido';
export type CompromisoPrioridad = 'alta' | 'media' | 'baja';
export type CompromisoResponsable = 'cliente' | 'consultor';
export type PlantillaType = 'estandar' | 'onboarding' | 'avanzado' | 'cierre' | 'custom';
export type TipoRespuesta = 'texto' | 'emoji' | 'slider' | 'si_no' | 'checkbox';
export type Tendencia = 'subio' | 'bajo' | 'igual';
export type MetricaUnidad = 'porcentaje' | 'numero' | 'moneda';
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';

// ===== Interfaces =====

export interface CheckinPlantilla {
  id: string;
  organizationId: string;
  nombre: string;
  descripcion: string | null;
  tipo: PlantillaType;
  esPublica: boolean;
  creadoPor: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinPlantillaPregunta {
  id: string;
  plantillaId: string;
  seccion: CheckinSeccion;
  pregunta: string;
  tipoRespuesta: TipoRespuesta;
  orden: number;
  esRequerida: boolean;
  createdAt: string;
}

export interface MetricaConfigItem {
  nombre: string;
  unidad: MetricaUnidad;
  meta: number | null;
}

export interface CheckinConfig {
  id: string;
  organizationId: string;
  proyectoId: string;
  clienteId: string;
  frecuencia: CheckinFrecuencia;
  diaPreferido: DiaSemana;
  horaEnvio: string;
  activo: boolean;
  plantillaId: string;
  metricasConfig: MetricaConfigItem[];
  creadoPor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Checkin {
  id: string;
  organizationId: string;
  configId: string;
  proyectoId: string;
  clienteId: string;
  token: string;
  numero: number;
  periodo: string;
  estado: CheckinStatus;
  fechaEnvio: string;
  fechaCompletadoCliente: string | null;
  fechaReunion: string | null;
  fechaCierre: string | null;
  pulsoScore: number | null;
  npsScore: number | null;
  emoji: CheckinEmoji | null;
  palabraClave: string | null;
  necesitaAyudaUrgente: boolean;
  detalleAyudaUrgente: string | null;
  notasConsultor: string | null;
  resumenReunion: string | null;
  creadoPor: string;
  createdAt: string;
  updatedAt: string;
  projectName?: string;
  clientName?: string;
}

export interface CheckinPregunta {
  id: string;
  checkinId: string;
  seccion: CheckinSeccion;
  pregunta: string;
  respuesta: string | null;
  orden: number;
  createdAt: string;
}

export interface CheckinCompromiso {
  id: string;
  organizationId: string;
  checkinId: string;
  proyectoId: string;
  descripcion: string;
  responsable: CompromisoResponsable;
  fechaLimite: string | null;
  estado: CompromisoStatus;
  prioridad: CompromisoPrioridad;
  checkinOrigenId: string;
  checkinRevisionId: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinMetrica {
  id: string;
  checkinId: string;
  nombreMetrica: string;
  valorActual: number | null;
  valorMeta: number | null;
  valorAnterior: number | null;
  tendencia: Tendencia;
  unidad: MetricaUnidad;
  createdAt: string;
}

// ===== Config Maps =====

export const CHECKIN_STATUS_LABELS: Record<CheckinStatus, { label: string; color: string }> = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  completado_cliente: {
    label: 'Completado por cliente',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  en_reunion: {
    label: 'En reunión',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  cerrado: {
    label: 'Cerrado',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
};

export const COMPROMISO_STATUS_LABELS: Record<CompromisoStatus, { label: string; color: string }> = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  en_progreso: {
    label: 'En progreso',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  completado: {
    label: 'Completado',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  no_cumplido: {
    label: 'No cumplido',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
};

export const PRIORIDAD_LABELS: Record<CompromisoPrioridad, { label: string; color: string }> = {
  alta: {
    label: 'Alta',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  media: {
    label: 'Media',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  baja: {
    label: 'Baja',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
};

export const FRECUENCIA_LABELS: Record<CheckinFrecuencia, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
};

export const DIA_LABELS: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

export const EMOJI_CONFIG: Record<CheckinEmoji, { emoji: string; label: string }> = {
  feliz: { emoji: '😀', label: 'Bien' },
  neutral: { emoji: '😐', label: 'Regular' },
  triste: { emoji: '😟', label: 'Mal' },
};

export const SECCION_CONFIG: Record<CheckinSeccion, { label: string; description: string; icon: string; tiempoEstimado: string }> = {
  pulso: {
    label: 'Pulso',
    description: '¿Cómo te sentís con el proyecto?',
    icon: 'Heart',
    tiempoEstimado: '1 min',
  },
  avances: {
    label: 'Avances',
    description: 'Logros y resultados de la semana',
    icon: 'TrendingUp',
    tiempoEstimado: '3 min',
  },
  problemas: {
    label: 'Problemas',
    description: 'Bloqueos o dificultades',
    icon: 'AlertTriangle',
    tiempoEstimado: '2 min',
  },
  proxima_semana: {
    label: 'Próxima semana',
    description: 'Prioridades y necesidades',
    icon: 'Calendar',
    tiempoEstimado: '2 min',
  },
  feedback: {
    label: 'Feedback',
    description: 'Comentarios y sugerencias',
    icon: 'MessageCircle',
    tiempoEstimado: '2 min',
  },
};

// ===== Helper Functions =====

export function getPulsoColor(score: number | null): string {
  if (score === null) return 'text-gray-400 dark:text-gray-500';
  if (score >= 8) return 'text-green-600 dark:text-green-400';
  if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function getTendenciaLabel(t: Tendencia): { label: string; icon: string; color: string } {
  switch (t) {
    case 'subio':
      return { label: 'Subió', icon: 'TrendingUp', color: 'text-green-600 dark:text-green-400' };
    case 'bajo':
      return { label: 'Bajó', icon: 'TrendingDown', color: 'text-red-600 dark:text-red-400' };
    case 'igual':
      return { label: 'Igual', icon: 'Minus', color: 'text-gray-500 dark:text-gray-400' };
  }
}

// ===== Default Plantillas =====

export const DEFAULT_PLANTILLAS: Array<{
  nombre: string;
  descripcion: string;
  tipo: PlantillaType;
  preguntas: Array<{
    seccion: CheckinSeccion;
    pregunta: string;
    tipoRespuesta: TipoRespuesta;
    orden: number;
    esRequerida: boolean;
  }>;
}> = [
  {
    nombre: 'Check-in Estándar',
    descripcion: 'Plantilla semanal completa para seguimiento regular de proyectos',
    tipo: 'estandar',
    preguntas: [
      // Pulso
      { seccion: 'pulso', pregunta: '¿Cómo te sentís con el proyecto?', tipoRespuesta: 'emoji', orden: 1, esRequerida: false },
      { seccion: 'pulso', pregunta: '¿Del 1 al 10, qué tan satisfecho estás?', tipoRespuesta: 'slider', orden: 2, esRequerida: false },
      { seccion: 'pulso', pregunta: 'Una palabra que describa tu semana:', tipoRespuesta: 'texto', orden: 3, esRequerida: false },
      // Avances
      { seccion: 'avances', pregunta: '¿Qué lograste esta semana?', tipoRespuesta: 'texto', orden: 4, esRequerida: true },
      { seccion: 'avances', pregunta: '¿Hubo algún resultado destacable?', tipoRespuesta: 'texto', orden: 5, esRequerida: false },
      // Problemas
      { seccion: 'problemas', pregunta: '¿Tenés algún problema o bloqueo?', tipoRespuesta: 'texto', orden: 6, esRequerida: false },
      { seccion: 'problemas', pregunta: '¿Necesitás ayuda urgente con algo?', tipoRespuesta: 'si_no', orden: 7, esRequerida: false },
      // Próxima semana
      { seccion: 'proxima_semana', pregunta: '¿Cuáles son tus 3 prioridades para la próxima semana?', tipoRespuesta: 'texto', orden: 8, esRequerida: true },
      { seccion: 'proxima_semana', pregunta: '¿Hay algo que necesites de nosotros?', tipoRespuesta: 'texto', orden: 9, esRequerida: false },
      // Feedback
      { seccion: 'feedback', pregunta: '¿Hay algo que podamos mejorar?', tipoRespuesta: 'texto', orden: 10, esRequerida: false },
      { seccion: 'feedback', pregunta: '¿Recomendarías nuestro servicio? (1-10)', tipoRespuesta: 'slider', orden: 11, esRequerida: false },
    ],
  },
  {
    nombre: 'Check-in Onboarding',
    descripcion: 'Plantilla para las primeras semanas de un proyecto nuevo',
    tipo: 'onboarding',
    preguntas: [
      // Pulso
      { seccion: 'pulso', pregunta: '¿Cómo te sentís con el proyecto?', tipoRespuesta: 'emoji', orden: 1, esRequerida: false },
      { seccion: 'pulso', pregunta: '¿Del 1 al 10, qué tan satisfecho estás?', tipoRespuesta: 'slider', orden: 2, esRequerida: false },
      { seccion: 'pulso', pregunta: 'Una palabra que describa tu semana:', tipoRespuesta: 'texto', orden: 3, esRequerida: false },
      // Avances
      { seccion: 'avances', pregunta: '¿Cómo te sentís con el arranque del proyecto?', tipoRespuesta: 'texto', orden: 4, esRequerida: true },
      { seccion: 'avances', pregunta: '¿Entendés claramente los próximos pasos?', tipoRespuesta: 'si_no', orden: 5, esRequerida: false },
      // Problemas
      { seccion: 'problemas', pregunta: '¿Tenés alguna duda sobre el proceso?', tipoRespuesta: 'texto', orden: 6, esRequerida: false },
      { seccion: 'problemas', pregunta: '¿Hay algo que no esperabas?', tipoRespuesta: 'texto', orden: 7, esRequerida: false },
      // Próxima semana
      { seccion: 'proxima_semana', pregunta: '¿El equipo está alineado?', tipoRespuesta: 'si_no', orden: 8, esRequerida: false },
      { seccion: 'proxima_semana', pregunta: '¿Qué necesitás para la próxima semana?', tipoRespuesta: 'texto', orden: 9, esRequerida: false },
      // Feedback
      { seccion: 'feedback', pregunta: '¿Hay algo que podamos mejorar del onboarding?', tipoRespuesta: 'texto', orden: 10, esRequerida: false },
    ],
  },
  {
    nombre: 'Check-in Proyecto Avanzado',
    descripcion: 'Plantilla para proyectos en etapa avanzada con foco en resultados',
    tipo: 'avanzado',
    preguntas: [
      // Pulso
      { seccion: 'pulso', pregunta: '¿Cómo te sentís con el proyecto?', tipoRespuesta: 'emoji', orden: 1, esRequerida: false },
      { seccion: 'pulso', pregunta: '¿Del 1 al 10, qué tan satisfecho estás?', tipoRespuesta: 'slider', orden: 2, esRequerida: false },
      { seccion: 'pulso', pregunta: 'Una palabra que describa tu semana:', tipoRespuesta: 'texto', orden: 3, esRequerida: false },
      // Avances
      { seccion: 'avances', pregunta: '¿Estamos en camino para cumplir los objetivos?', tipoRespuesta: 'si_no', orden: 4, esRequerida: false },
      { seccion: 'avances', pregunta: '¿Qué resultados concretos estás viendo?', tipoRespuesta: 'texto', orden: 5, esRequerida: true },
      // Problemas
      { seccion: 'problemas', pregunta: '¿Hay que ajustar algo del plan?', tipoRespuesta: 'texto', orden: 6, esRequerida: false },
      { seccion: 'problemas', pregunta: '¿El equipo mantiene el ritmo?', tipoRespuesta: 'si_no', orden: 7, esRequerida: false },
      // Próxima semana
      { seccion: 'proxima_semana', pregunta: '¿Cuáles son las prioridades para el próximo período?', tipoRespuesta: 'texto', orden: 8, esRequerida: true },
      // Feedback
      { seccion: 'feedback', pregunta: '¿Cómo calificás el avance general? (1-10)', tipoRespuesta: 'slider', orden: 9, esRequerida: false },
    ],
  },
  {
    nombre: 'Check-in Cierre de Proyecto',
    descripcion: 'Plantilla para la evaluación final y cierre de un proyecto',
    tipo: 'cierre',
    preguntas: [
      // Pulso
      { seccion: 'pulso', pregunta: '¿Se cumplieron tus expectativas?', tipoRespuesta: 'si_no', orden: 1, esRequerida: false },
      { seccion: 'pulso', pregunta: 'Satisfacción general (1-10)', tipoRespuesta: 'slider', orden: 2, esRequerida: false },
      // Avances
      { seccion: 'avances', pregunta: '¿Qué fue lo más valioso del proyecto?', tipoRespuesta: 'texto', orden: 3, esRequerida: true },
      { seccion: 'avances', pregunta: '¿Qué resultados concretos obtuviste?', tipoRespuesta: 'texto', orden: 4, esRequerida: true },
      // Problemas
      { seccion: 'problemas', pregunta: '¿Qué podríamos haber hecho mejor?', tipoRespuesta: 'texto', orden: 5, esRequerida: false },
      // Próxima semana
      { seccion: 'proxima_semana', pregunta: '¿Hay algo más en lo que podamos ayudarte?', tipoRespuesta: 'texto', orden: 6, esRequerida: false },
      // Feedback
      { seccion: 'feedback', pregunta: '¿Recomendarías nuestro servicio? (1-10)', tipoRespuesta: 'slider', orden: 7, esRequerida: true },
      { seccion: 'feedback', pregunta: 'Comentarios finales', tipoRespuesta: 'texto', orden: 8, esRequerida: false },
    ],
  },
];
