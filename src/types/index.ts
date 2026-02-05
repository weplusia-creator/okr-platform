export * from './arca';
export * from './finance';
export * from './kpi';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export type OKRStatus = 'in_progress' | 'completed' | 'at_risk' | 'cancelled';

export type UserRole = 'super_admin' | 'admin' | 'member' | 'viewer';

export const USER_ROLE_CONFIG: Record<UserRole, { label: string; bgClass: string }> = {
  super_admin: { label: 'Super Admin', bgClass: 'badge-warning' },
  admin: { label: 'Admin', bgClass: 'badge-danger' },
  member: { label: 'Miembro', bgClass: 'badge-primary' },
  viewer: { label: 'Viewer', bgClass: 'badge-gray' },
};

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  progress: number;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string | null;
}

export interface Objective {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  status: OKRStatus;
  quarter: Quarter;
  year: number;
  owner: string;
  startDate: string;
  endDate: string;
  keyResults: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export type UserType = 'consultant' | 'client';

export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
  organizationId: string | null;
  role: UserRole;
  jobTitle: string | null;
  status: 'active' | 'inactive';
  userType: UserType;
  phone: string | null;
  clientId: string | null;
  birthDate: string | null;
  createdAt: string;
}

export interface OKRFilters {
  quarter: Quarter | 'all';
  year: number | 'all';
  status: OKRStatus | 'all';
  search: string;
}

export interface OKRStats {
  total: number;
  completed: number;
  inProgress: number;
  atRisk: number;
  cancelled: number;
  averageProgress: number;
}

export const STATUS_CONFIG: Record<OKRStatus, { label: string; color: string; bgClass: string }> = {
  in_progress: {
    label: 'En progreso',
    color: 'primary',
    bgClass: 'badge-primary',
  },
  completed: {
    label: 'Completado',
    color: 'success',
    bgClass: 'badge-success',
  },
  at_risk: {
    label: 'En riesgo',
    color: 'warning',
    bgClass: 'badge-warning',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'gray',
    bgClass: 'badge-gray',
  },
};

export type InitiativeStatus = 'todo' | 'in_progress' | 'done';

export interface Initiative {
  id: string;
  keyResultId: string;
  organizationId: string;
  title: string;
  description: string | null;
  responsibleId: string | null;
  responsibleName?: string;
  dueDate: string | null;
  status: InitiativeStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InitiativeComment {
  id: string;
  initiativeId: string;
  userId: string;
  userName: string | null;
  text: string;
  createdAt: string;
}

export const INITIATIVE_STATUS_CONFIG: Record<InitiativeStatus, { label: string; color: string; bgClass: string }> = {
  todo: { label: 'Por hacer', color: 'gray', bgClass: 'badge-gray' },
  in_progress: { label: 'En progreso', color: 'primary', bgClass: 'badge-primary' },
  done: { label: 'Hecho', color: 'success', bgClass: 'badge-success' },
};

// ===== TASKS (Gestión) =====
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  responsibleId: string | null;
  responsibleName?: string;
  dueDate: string | null;
  status: TaskStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  text: string;
  createdAt: string;
}

export type MeetingOccurrenceStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  location: string | null;
  createdBy: string | null;
  active: boolean;
  createdAt: string;
}

export interface MeetingOccurrence {
  id: string;
  meetingId: string;
  organizationId: string;
  date: string;
  status: MeetingOccurrenceStatus;
  minutes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: 'Q1 (Ene - Mar)',
  Q2: 'Q2 (Abr - Jun)',
  Q3: 'Q3 (Jul - Sep)',
  Q4: 'Q4 (Oct - Dic)',
};
