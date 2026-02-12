import { supabase } from './supabase';
import type { NotificationType } from '../types/notifications';

interface NotifyParams {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

/**
 * Send a notification to a specific user.
 * Standalone function — can be imported from any context.
 */
export async function notify(params: NotifyParams) {
  try {
    await supabase.from('notifications').insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      action_url: params.actionUrl || null,
    });
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

/**
 * Send a notification to multiple users at once.
 */
export async function notifyMany(userIds: string[], params: Omit<NotifyParams, 'userId'>) {
  if (userIds.length === 0) return;
  try {
    const rows = userIds.map(userId => ({
      organization_id: params.organizationId,
      user_id: userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      action_url: params.actionUrl || null,
    }));
    await supabase.from('notifications').insert(rows);
  } catch (err) {
    console.error('Error sending notifications:', err);
  }
}
