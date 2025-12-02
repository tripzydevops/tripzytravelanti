import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Announcement, Notification as AppNotification } from '../types';
import { getActiveAnnouncements, getUserNotifications, markNotificationAsRead } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';

type PermissionStatus = 'granted' | 'denied' | 'default';

interface NotificationContextType {
  permissionStatus: PermissionStatus;
  isSubscribed: boolean;
  requestPermission: () => Promise<void>;
  announcements: Announcement[];
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('default');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();

  const isSubscribed = permissionStatus === 'granted';
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission as PermissionStatus);
    }
  }, []);

  // Fetch data on load and when user changes
  const fetchData = useCallback(async () => {
    // Fetch announcements (public)
    const activeAnnouncements = await getActiveAnnouncements();
    setAnnouncements(activeAnnouncements);

    // Fetch notifications (if logged in)
    if (user) {
      const userNotifs = await getUserNotifications(user.id);
      setNotifications(userNotifs);
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    // Real-time subscription for notifications
    if (user) {
      const subscription = supabase
        .channel('public:notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          // Handle new notification
          const newNotif = payload.new as any;

          const mappedNotif: AppNotification = {
            id: newNotif.id,
            userId: newNotif.user_id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            isRead: newNotif.is_read,
            createdAt: newNotif.created_at,
            link: newNotif.link
          };

          setNotifications(prev => [mappedNotif, ...prev]);

          // Show desktop notification if subscribed
          if (isSubscribed) {
            new Notification(mappedNotif.title, { body: mappedNotif.message });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user, fetchData, isSubscribed]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.error("This browser does not support desktop notification");
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission as PermissionStatus);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markNotificationAsRead(id);
  }, []);

  return (
    <NotificationContext.Provider value={{
      permissionStatus,
      isSubscribed,
      requestPermission,
      announcements,
      notifications,
      unreadCount,
      markAsRead,
      refreshNotifications: fetchData
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};