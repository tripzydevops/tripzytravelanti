import React, { useEffect, useState } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface AdBannerProps {
    position?: 'TOP' | 'BOTTOM';
    className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ position = 'BOTTOM', className = '' }) => {
    const [isNative, setIsNative] = useState(false);
    const [adLoaded, setAdLoaded] = useState(false);

    useEffect(() => {
        const checkPlatform = async () => {
            if (Capacitor.isNativePlatform()) {
                setIsNative(true);
                await initializeAdMob();
            }
        };

        checkPlatform();

        return () => {
            if (isNative) {
                AdMob.removeBanner();
            }
        };
    }, []);

    const initializeAdMob = async () => {
        try {
            await AdMob.initialize({
                // requestTrackingAuthorization: true,
                testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // Example test device ID
                initializeForTesting: true,
            });

            // Listen for ad events
            AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
                setAdLoaded(true);
            });

            const options = {
                adId: 'ca-app-pub-3940256099942544/6300978111', // Test Ad Unit ID
                adSize: BannerAdSize.BANNER,
                position: position === 'TOP' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: true,
            };

            await AdMob.showBanner(options);
        } catch (error) {
            console.error('AdMob initialization failed:', error);
        }
    };

    if (isNative) {
        // Native ads are overlaid on top of the webview, so we don't render anything in the DOM
        // but we might want to reserve space if needed.
        return null;
    }

    // Browser Mock
    return (
        <div
            className={`w-full h-[50px] bg-gray-200 border-t border-gray-300 flex items-center justify-center text-gray-500 text-sm font-medium ${className}`}
            style={{ minHeight: '50px' }}
        >
            <div className="flex flex-col items-center">
                <span className="font-bold">TEST AD BANNER</span>
                <span className="text-xs">(Visible in Browser Only)</span>
            </div>
        </div>
    );
};
