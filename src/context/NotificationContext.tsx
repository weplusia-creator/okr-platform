import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { AppNotification } from '../types/notifications';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function mapRow(r: any): AppNotification {
  return {
    id: r.id,
    organizationId: r.organization_id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    entityType: r.entity_type,
    entityId: r.entity_id,
    actionUrl: r.action_url,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', appUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []).map(mapRow));
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  // Load on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!appUser?.id) return;

    const channel = supabase
      .channel(`notifications-${appUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${appUser.id}`,
      }, (payload) => {
        const newNotif = mapRow(payload.new);
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Realtime not available — remove channel to stop reconnection storm
          supabase.removeChannel(channel);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [appUser?.id]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw new Error(error.message);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!appUser?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', appUser.id)
        .eq('is_read', false);
      if (error) throw new Error(error.message);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [appUser?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      fetchNotifications, markAsRead, markAllAsRead, deleteNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
