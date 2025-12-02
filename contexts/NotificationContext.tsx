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
  readAnnouncementIds: string[];
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('default');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();

  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('readAnnouncementIds');
    return saved ? JSON.parse(saved) : [];
  });

  const isSubscribed = permissionStatus === 'granted';

  // Calculate unread count: unread notifications + unread announcements
  const unreadCount = notifications.filter(n => !n.isRead).length +
    announcements.filter(a => !readAnnouncementIds.includes(a.id)).length;

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission as PermissionStatus);
    }
  }, []);

  // Persist read announcements
  useEffect(() => {
    localStorage.setItem('readAnnouncementIds', JSON.stringify(readAnnouncementIds));
  }, [readAnnouncementIds]);

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
    let notificationSubscription: any;
    if (user) {
      notificationSubscription = supabase
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
    }

    // Real-time subscription for announcements (Public)
    const announcementSubscription = supabase
      .channel('public:announcements')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: 'is_active=eq.true'
      }, (payload) => {
        const newAnnouncement = payload.new as any;

        // Map to Announcement type
        const mappedAnnouncement: Announcement = {
          id: newAnnouncement.id,
          title: newAnnouncement.title,
          message: newAnnouncement.message,
          type: newAnnouncement.type,
          isActive: newAnnouncement.is_active,
          createdAt: newAnnouncement.created_at,
          endAt: newAnnouncement.expires_at
        };

        setAnnouncements(prev => [mappedAnnouncement, ...prev]);

        // Show desktop notification if subscribed
        if (isSubscribed) {
          new Notification(`New Announcement: ${mappedAnnouncement.title}`, { body: mappedAnnouncement.message });
        }
      })
      .subscribe();

    return () => {
      if (notificationSubscription) supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(announcementSubscription);
    };
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
    // Check if it's an announcement (by checking if it exists in announcements array)
    const isAnnouncement = announcements.some(a => a.id === id);

    if (isAnnouncement) {
      if (!readAnnouncementIds.includes(id)) {
        setReadAnnouncementIds(prev => [...prev, id]);
      }
    } else {
      // Optimistic update for notifications
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await markNotificationAsRead(id);
    }
  }, [announcements, readAnnouncementIds]);

  return (
    <NotificationContext.Provider value={{
      permissionStatus,
      isSubscribed,
      requestPermission,
      announcements,
      notifications,
      unreadCount,
      readAnnouncementIds,
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