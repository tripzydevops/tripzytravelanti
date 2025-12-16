import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { updateFcmToken } from './supabaseService';

/**
 * Initialize push notifications for the app
 * Should be called once after user is authenticated
 */
export async function initPushNotifications(userId: string): Promise<boolean> {
    // Only works on native platforms
    if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications not available on web');
        return false;
    }

    try {
        // Request permission
        const permission = await PushNotifications.requestPermissions();

        if (permission.receive !== 'granted') {
            console.warn('Push notification permission denied');
            return false;
        }

        // Register for push notifications
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
            console.log('FCM Token:', token.value);
            // Store token in user profile
            await updateFcmToken(userId, token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
            console.error('Push registration error:', error);
        });

        // Listen for push notifications received
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received:', notification);
            // Handle notification based on type
            handleNotification(notification.data);
        });

        // Listen for action on push notification (when user taps it)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Push notification action:', action);
            handleNotificationAction(action.notification.data);
        });

        return true;
    } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        return false;
    }
}

/**
 * Handle incoming push notification data
 */
function handleNotification(data: any) {
    if (data?.type === 'redemption_confirmation') {
        // Show in-app confirmation dialog
        const event = new CustomEvent('redemption-confirmation-requested', {
            detail: {
                walletItemId: data.walletItemId,
                confirmationToken: data.confirmationToken,
                dealTitle: data.dealTitle
            }
        });
        window.dispatchEvent(event);
    }
}

/**
 * Handle when user taps on a notification
 */
function handleNotificationAction(data: any) {
    if (data?.type === 'redemption_confirmation') {
        // Navigate to confirmation screen
        window.location.href = `#/confirm-redemption/${data.walletItemId}/${data.confirmationToken}`;
    }
}

/**
 * Remove all push notification listeners (for logout)
 */
export async function cleanupPushNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
        await PushNotifications.removeAllListeners();
    } catch (error) {
        console.error('Error cleaning up push notifications:', error);
    }
}
