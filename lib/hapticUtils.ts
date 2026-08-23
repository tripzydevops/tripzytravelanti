/**
 * Haptic Feedback Utility for Tripzy Mobile App
 * Provides native Capacitor haptics with browser fallback for web touch interactions.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export async function triggerHapticFeedback(style: HapticStyle = 'light'): Promise<void> {
    try {
        // Attempt dynamically importing @capacitor/haptics if available on Capacitor platform
        if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
            const { Haptics, ImpactStyle, NotificationType } = await import(/* @vite-ignore */ '@capacitor/haptics');
            if (style === 'success') {
                await Haptics.notification({ type: NotificationType.Success });
            } else if (style === 'warning') {
                await Haptics.notification({ type: NotificationType.Warning });
            } else if (style === 'error') {
                await Haptics.notification({ type: NotificationType.Error });
            } else if (style === 'medium') {
                await Haptics.impact({ style: ImpactStyle.Medium });
            } else if (style === 'heavy') {
                await Haptics.impact({ style: ImpactStyle.Heavy });
            } else {
                await Haptics.impact({ style: ImpactStyle.Light });
            }
            return;
        }
    } catch (e) {
        // Suppress native error and fallback to Web Vibration API
    }

    // Web Vibration API fallback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
            if (style === 'success') {
                navigator.vibrate([10, 30, 10]);
            } else if (style === 'heavy') {
                navigator.vibrate(30);
            } else if (style === 'medium') {
                navigator.vibrate(20);
            } else {
                navigator.vibrate(10);
            }
        } catch (e) {
            // Ignore vibration errors on unsupported browsers
        }
    }
}
