import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Bell, Check, CheckCheck, AlertTriangle, Clock, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/lib/api';
import { cn, formatRelative } from '@/lib/utils';

const SEVERITY_ICONS: Record<string, any> = {
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  critical: AlertTriangle,
};

const SEVERITY_COLORS: Record<string, string> = {
  error: 'var(--error)',
  warning: 'var(--warning)',
  info: 'var(--info)',
  critical: 'var(--error)',
};

export default function NotificationsPanel() {
  const { notificationsOpen, setNotificationsOpen } = useAppStore();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
    enabled: notificationsOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications?.filter(n => !n.is_read) || [];

  if (!notificationsOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:bg-transparent"
        onClick={() => setNotificationsOpen(false)} />

      <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[400px] flex flex-col animate-slide-in-right"
        style={{ backgroundColor: 'var(--bg-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold text-primary">Notifications</h3>
            {unread.length > 0 && (
              <span className="badge badge-error text-[10px]">{unread.length} new</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread.length > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="btn btn-ghost btn-sm gap-1 text-accent"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
            <button onClick={() => setNotificationsOpen(false)} className="btn-ghost btn-icon rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y divide-[var(--border-secondary)]">
              {notifications.map(notif => {
                const Icon = SEVERITY_ICONS[notif.severity] || Info;
                const color = SEVERITY_COLORS[notif.severity] || 'var(--info)';
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'px-5 py-3 flex items-start gap-3 transition-colors cursor-pointer',
                      !notif.is_read && 'bg-[var(--bg-primary)]',
                    )}
                    onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${color}15`, color }}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', notif.is_read ? 'text-secondary' : 'text-primary font-medium')}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-tertiary capitalize">{notif.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-tertiary">{formatRelative(notif.created_at)}</span>
                      </div>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state py-16">
              <Bell size={36} className="mb-3" />
              <p className="text-sm">No notifications</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
