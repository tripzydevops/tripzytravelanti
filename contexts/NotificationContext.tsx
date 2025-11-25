import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useNotificationSimulation } from '../hooks/useNotificationSimulation';

type PermissionStatus = 'granted' | 'denied' | 'default';

interface NotificationContextType {
  permissionStatus: PermissionStatus;
  isSubscribed: boolean;
  requestPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('default');
  const { user } = useAuth();
  
  const isSubscribed = permissionStatus === 'granted';

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission as PermissionStatus);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
        console.error("This browser does not support desktop notification");
        return;
    }
    
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission as PermissionStatus);
  }, []);
  
  const showNotification = useCallback((title: string, options: NotificationOptions) => {
    if (isSubscribed) {
      new Notification(title, options);
    }
  }, [isSubscribed]);

  useNotificationSimulation(showNotification, isSubscribed);

  return (
    <NotificationContext.Provider value={{ permissionStatus, isSubscribed, requestPermission }}>
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