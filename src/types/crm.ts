// ===== CRM Types =====

// ===== Enums/Union Types =====
export type LeadSource = 'manual' | 'web' | 'referido' | 'evento' | 'linkedin' | 'publicidad' | 'landing' | 'guia agro' | 'otro';
export type LeadStatus = 'new' | 'nuevo' | 'contactado' | 'calificado' | 'descalificado';
export type DealStage = string;
export type ActivityType = 'llamada' | 'email' | 'reunion' | 'tarea' | 'nota';

// ===== Interfaces =====

export interface Lead {
  id: string;
  organizationId: string;
  contactName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  budgetRange: string | null;
  timeline: string | null;
  needs: string | null;
  notes: string | null;
  ownerId: string | null;
  ownerName?: string;
  convertedAt: string | null;
  convertedToDealId: string | null;
  lastContactAt: string | null;
  nextContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  organizationId: string;
  leadId: string | null;
  clientId: string | null;
  clientName?: string;
  name: string;
  description: string | null;
  stage: DealStage;
  probability: number;
  amount: number;
  currency: string;
  monthlyFee: number | null;
  product: string | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  ownerId: string | null;
  ownerName?: string;
  lostReason: string | null;
  wonNotes: string | null;
  createdClientId: string | null;
  createdProjectId: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  organizationId: string;
  leadId: string | null;
  dealId: string | null;
  activityType: ActivityType;
  subject: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  dueDate: string | null;
  durationMinutes: number | null;
  reminderAt: string | null;
  reminderSent: boolean;
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealNote {
  id: string;
  organizationId: string;
  dealId: string;
  content: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface DealHistory {
  id: string;
  dealId: string;
  fromStage: DealStage | null;
  toStage: DealStage;
  changedBy: string | null;
  changedByName?: string;
  notes: string | null;
  createdAt: string;
}

// ===== Config Maps =====

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  manual: 'Manual',
  web: 'Sitio Web',
  referido: 'Referido',
  evento: 'Evento',
  linkedin: 'LinkedIn',
  publicidad: 'Publicidad',
  landing: 'Landing',
  'guia agro': 'Guía Agro',
  otro: 'Otro',
};

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgClass: string }> = {
  new: { label: 'Nuevo', color: 'blue', bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  nuevo: { label: 'Nuevo', color: 'blue', bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  contactado: { label: 'Contactado', color: 'yellow', bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  calificado: { label: 'Calificado', color: 'green', bgClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  descalificado: { label: 'Descalificado', color: 'gray', bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

// ===== Pipeline Stage (dynamic) =====
export interface PipelineStage {
  id?: string;
  name: string;
  label: string;
  color: string;
  probability: number;
  position: number;
}

export const TERMINAL_STAGES = ['ganado', 'perdido'] as const;

// Color options with pre-built TW classes
export const STAGE_COLOR_OPTIONS: Record<string, { label: string; bgClass: string; headerBg: string }> = {
  gray: { label: 'Gris', bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', headerBg: 'bg-gray-100 dark:bg-gray-700' },
  blue: { label: 'Azul', bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', headerBg: 'bg-blue-100 dark:bg-blue-900/40' },
  cyan: { label: 'Cyan', bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', headerBg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  purple: { label: 'Violeta', bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', headerBg: 'bg-purple-100 dark:bg-purple-900/40' },
  yellow: { label: 'Amarillo', bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', headerBg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  orange: { label: 'Naranja', bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', headerBg: 'bg-orange-100 dark:bg-orange-900/40' },
  pink: { label: 'Rosa', bgClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', headerBg: 'bg-pink-100 dark:bg-pink-900/40' },
  indigo: { label: 'Indigo', bgClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', headerBg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  green: { label: 'Verde', bgClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', headerBg: 'bg-green-100 dark:bg-green-900/40' },
  red: { label: 'Rojo', bgClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', headerBg: 'bg-red-100 dark:bg-red-900/40' },
};

export function getStageColorConfig(color: string) {
  return STAGE_COLOR_OPTIONS[color] || STAGE_COLOR_OPTIONS.gray;
}

// Default stages (fallback when org has no custom stages)
export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { name: 'prospecto', label: 'Prospecto', color: 'gray', probability: 10, position: 0 },
  { name: 'contactado', label: 'Contactado', color: 'blue', probability: 20, position: 1 },
  { name: 'calificado', label: 'Calificado', color: 'cyan', probability: 40, position: 2 },
  { name: 'propuesta', label: 'Propuesta', color: 'purple', probability: 60, position: 3 },
  { name: 'negociacion', label: 'Negociacion', color: 'yellow', probability: 80, position: 4 },
];

export const DEAL_STAGE_CONFIG: Record<string, {
  label: string;
  color: string;
  bgClass: string;
  probability: number;
  headerBg: string;
}> = {
  prospecto: {
    label: 'Prospecto',
    color: 'gray',
    bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    probability: 10,
    headerBg: 'bg-gray-100 dark:bg-gray-700',
  },
  contactado: {
    label: 'Contactado',
    color: 'blue',
    bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    probability: 20,
    headerBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  calificado: {
    label: 'Calificado',
    color: 'cyan',
    bgClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    probability: 40,
    headerBg: 'bg-cyan-100 dark:bg-cyan-900/40',
  },
  propuesta: {
    label: 'Propuesta',
    color: 'purple',
    bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    probability: 60,
    headerBg: 'bg-purple-100 dark:bg-purple-900/40',
  },
  negociacion: {
    label: 'Negociacion',
    color: 'yellow',
    bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    probability: 80,
    headerBg: 'bg-yellow-100 dark:bg-yellow-900/40',
  },
  ganado: {
    label: 'Ganado',
    color: 'green',
    bgClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    probability: 100,
    headerBg: 'bg-green-100 dark:bg-green-900/40',
  },
  perdido: {
    label: 'Perdido',
    color: 'red',
    bgClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    probability: 0,
    headerBg: 'bg-red-100 dark:bg-red-900/40',
  },
};

export const DEAL_STAGE_ORDER: string[] = ['prospecto', 'contactado', 'calificado', 'propuesta', 'negociacion', 'ganado', 'perdido'];
export const DEAL_PIPELINE_STAGES: string[] = ['prospecto', 'contactado', 'calificado', 'propuesta', 'negociacion'];

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: string; color: string }> = {
  llamada: { label: 'Llamada', icon: 'Phone', color: '#3B82F6' },
  email: { label: 'Email', icon: 'Mail', color: '#8B5CF6' },
  reunion: { label: 'Reunion', icon: 'Calendar', color: '#10B981' },
  tarea: { label: 'Tarea', icon: 'CheckSquare', color: '#F59E0B' },
  nota: { label: 'Nota', icon: 'FileText', color: '#6B7280' },
};

// ===== Stats =====

export interface CRMStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  totalDeals: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
  avgDealSize: number;
  winRate: number;
  pendingActivities: number;
  overdueActivities: number;
}

// ===== Lost Reasons =====

export const LOST_REASONS = [
  'Precio',
  'Competencia',
  'Sin presupuesto',
  'Sin necesidad',
  'Timing',
  'Sin respuesta',
  'Otro',
] as const;
