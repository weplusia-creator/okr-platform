export * from './finance';
export * from './kpi';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export type OKRStatus = 'in_progress' | 'completed' | 'at_risk' | 'cancelled';

export type UserRole = 'admin' | 'member' | 'viewer';

export const USER_ROLE_CONFIG: Record<UserRole, { label: string; bgClass: string }> = {
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

export const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: 'Q1 (Ene - Mar)',
  Q2: 'Q2 (Abr - Jun)',
  Q3: 'Q3 (Jul - Sep)',
  Q4: 'Q4 (Oct - Dic)',
};
