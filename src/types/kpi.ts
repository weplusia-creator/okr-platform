export interface KPICategory {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface KPI {
  id: string;
  organizationId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  targetValue: number | null;
  isSystem: boolean;
  createdAt: string;
}

export interface KPIEntry {
  id: string;
  kpiId: string;
  value: number;
  date: string;
  notes: string | null;
  createdAt: string;
}
