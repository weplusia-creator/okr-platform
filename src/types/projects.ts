// ===== Project Statuses & Enums =====

export type ProjectStatus = 'proposal' | 'approved' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type ProjectPriority = 'high' | 'medium' | 'low';
export type DeliverableStatus = 'pending' | 'in_progress' | 'in_review' | 'delivered' | 'approved';
export type ModuleStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type ParticipantRole = 'alumno' | 'consultor' | 'admin' | 'sponsor';
export type DocumentType = 'kickoff' | 'progress' | 'delivery' | 'closure' | 'other';

// ===== Config Maps =====

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bgClass: string }> = {
  proposal: { label: 'Propuesta', color: 'gray', bgClass: 'badge-gray' },
  approved: { label: 'Aprobado', color: 'primary', bgClass: 'badge-primary' },
  in_progress: { label: 'En progreso', color: 'warning', bgClass: 'badge-warning' },
  paused: { label: 'Pausado', color: 'warning', bgClass: 'badge-warning' },
  completed: { label: 'Completado', color: 'success', bgClass: 'badge-success' },
  cancelled: { label: 'Cancelado', color: 'danger', bgClass: 'badge-danger' },
};

export const PRIORITY_CONFIG: Record<ProjectPriority, { label: string; color: string; bgClass: string }> = {
  high: { label: 'Alta', color: 'danger', bgClass: 'badge-danger' },
  medium: { label: 'Media', color: 'warning', bgClass: 'badge-warning' },
  low: { label: 'Baja', color: 'gray', bgClass: 'badge-gray' },
};

export const DELIVERABLE_STATUS_CONFIG: Record<DeliverableStatus, { label: string; color: string; bgClass: string }> = {
  pending: { label: 'Pendiente', color: 'gray', bgClass: 'badge-gray' },
  in_progress: { label: 'En progreso', color: 'primary', bgClass: 'badge-primary' },
  in_review: { label: 'En revisión', color: 'warning', bgClass: 'badge-warning' },
  delivered: { label: 'Entregado', color: 'success', bgClass: 'badge-success' },
  approved: { label: 'Aprobado', color: 'success', bgClass: 'badge-success' },
};

export const MODULE_STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; bgClass: string }> = {
  pending: { label: 'Pendiente', color: 'gray', bgClass: 'badge-gray' },
  in_progress: { label: 'En curso', color: 'primary', bgClass: 'badge-primary' },
  completed: { label: 'Completado', color: 'success', bgClass: 'badge-success' },
  skipped: { label: 'Omitido', color: 'warning', bgClass: 'badge-warning' },
};

export const PARTICIPANT_ROLE_CONFIG: Record<ParticipantRole, { label: string }> = {
  alumno: { label: 'Alumno' },
  consultor: { label: 'Consultor' },
  admin: { label: 'Admin / Supervisor' },
  sponsor: { label: 'Sponsor / Cliente' },
};

export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, { label: string }> = {
  kickoff: { label: 'Kickoff' },
  progress: { label: 'Avance' },
  delivery: { label: 'Entrega' },
  closure: { label: 'Cierre' },
  other: { label: 'Otro' },
};

// ===== Kanban Column Order (for deliverables) =====
export const DELIVERABLE_STATUS_ORDER: DeliverableStatus[] = ['pending', 'in_progress', 'in_review', 'delivered', 'approved'];

// ===== Module Order =====
export const MODULE_STATUS_ORDER: ModuleStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];

// ===== Entities =====

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export interface Project {
  id: string;
  organizationId: string;
  clientId: string | null;
  clientName?: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string;
  ownerName?: string;
  product: string | null;
  monthlyFee: number | null;
  budget: number | null;
  estimatedCost: number | null;
  startDate: string | null;
  estimatedEndDate: string | null;
  actualEndDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getProjectDisplayName(project: { clientName?: string; product?: string | null; name: string }): string {
  const parts = [project.clientName, project.product].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : project.name;
}

export interface ProjectParticipant {
  id: string;
  projectId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: ParticipantRole;
  hourlyRate: number | null;
  allocatedHours: number | null;
  createdAt: string;
}

export interface ProjectDeliverable {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  actualDeliveryDate: string | null;
  status: DeliverableStatus;
  responsibleId: string | null;
  responsibleName?: string;
  attachments: string[];
  invoiceAmount: number | null;
  acceptanceCriteria: ChecklistItem[];
  clientFeedback: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectModule {
  id: string;
  projectId: string;
  deliverableId: string | null;
  deliverableName?: string;
  title: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: ModuleStatus;
  subtasks: ChecklistItem[];
  sortOrder: number;
  completedAt: string | null;
  completedBy: string | null;
  completedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleTimeEntry {
  id: string;
  moduleId: string;
  userId: string;
  userName?: string;
  hours: number;
  description: string | null;
  date: string;
  createdAt: string;
}

export interface ModuleComment {
  id: string;
  moduleId: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  type: DocumentType;
  date: string | null;
  url: string | null;
  notes: string | null;
  actionItems: ChecklistItem[];
  createdAt: string;
}

export interface ProjectActivityLog {
  id: string;
  projectId: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

export interface ProjectPayment {
  id: string;
  projectId: string;
  month: string;       // "2026-01" formato YYYY-MM
  amount: number;
  status: 'pending' | 'paid';
  paidDate: string | null;
  invoiceId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface NPSSurvey {
  id: string;
  projectId: string;
  sessionTitle: string;
  token: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface NPSResponse {
  id: string;
  surveyId: string;
  respondentName: string;
  score: number;
  liked: string | null;
  improvement: string | null;
  createdAt: string;
}

// ===== Products =====

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductTemplateModule {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  presentationUrl: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProductTemplateDeliverable {
  id: string;
  templateModuleId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProductTemplateObjective {
  id: string;
  templateModuleId: string;
  text: string;
  sortOrder: number;
  createdAt: string;
}

// ===== KPIs & Reports =====

export interface ProjectKPIData {
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  daysTotal: number;
  daysRemaining: number;
  daysElapsed: number;
  budgetTotal: number;
  estimatedCost: number;
  actualCost: number;
  hoursLogged: number;
  overdueModules: number;
  completedThisWeek: number;
  spiIndex: number;
  cpiIndex: number;
  projectedProfitability: number;
}

export interface ProjectFilters {
  status: ProjectStatus | 'all';
  clientId: string | 'all';
  ownerId: string | 'all';
  priority: ProjectPriority | 'all';
  search: string;
}

export interface AlumniProfile {
  id: string;
  projectId: string;
  userId: string;
  fullName: string;
  company: string | null;
  position: string | null;
  phone: string | null;
  city: string | null;
  expectations: string;
  previousExperience: string | null;
  targetKpi: string;
  targetKpiCurrentValue: string | null;
  targetKpiGoalValue: string | null;
  completedAt: string;
  updatedAt: string;
}

// ===== Attendance =====

export interface AttendanceSession {
  id: string;
  projectId: string;
  sessionDate: string;
  sessionTitle: string;
  sessionDescription: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  participantId: string;
  participantName?: string;
  participantRole?: ParticipantRole;
  present: boolean;
  notes: string | null;
  markedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
