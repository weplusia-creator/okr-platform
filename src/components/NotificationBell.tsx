import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  FolderKanban,
  DollarSign,
  ClipboardCheck,
  LayoutGrid,
  Check,
  Trash2,
  X,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { NOTIFICATION_CONFIG } from '../types/notifications';
import type { AppNotification, NotificationType } from '../types/notifications';

const ICON_MAP: Record<string, React.ElementType> = {
  ClipboardList,
  FolderKanban,
  DollarSign,
  ClipboardCheck,
  LayoutGrid,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
  onNavigate,
}: {
  notification: AppNotification;
  onRead: () => void;
  onDelete: () => void;
  onNavigate: () => void;
}) {
  const cfg = NOTIFICATION_CONFIG[notification.type as NotificationType];
  const IconComponent = ICON_MAP[cfg?.icon] || Bell;

  return (
    <div
      onClick={onNavigate}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg?.bgColor || 'bg-gray-100 dark:bg-gray-700'}`}>
        <IconComponent className={`w-4 h-4 ${cfg?.color || 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {!notification.isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(); }}
            className="p-1 text-gray-400 hover:text-blue-500 rounded"
            title="Marcar como leída"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-gray-400 hover:text-red-500 rounded"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNavigate = (n: AppNotification) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.actionUrl) navigate(n.actionUrl);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d3839] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={() => markAsRead(n.id)}
                  onDelete={() => deleteNotification(n.id)}
                  onNavigate={() => handleNavigate(n)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
