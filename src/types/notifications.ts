export type NotificationType = 'task_assigned' | 'project_update' | 'finance' | 'checkin' | 'bmc';

export interface AppNotification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_CONFIG: Record<NotificationType, { icon: string; color: string; bgColor: string }> = {
  task_assigned: { icon: 'ClipboardList', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  project_update: { icon: 'FolderKanban', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  finance: { icon: 'DollarSign', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  checkin: { icon: 'ClipboardCheck', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  bmc: { icon: 'LayoutGrid', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
};
