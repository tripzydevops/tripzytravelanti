import React, { useEffect, useRef, useState, memo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { SpinnerIcon } from './Icons';

interface FlightSearchWidgetProps {
    origin?: string;
    destination?: string;
    departDate?: string;
}

const FlightSearchWidget: React.FC<FlightSearchWidgetProps> = memo(({ origin, destination, departDate }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    // Lazy load: Only start loading when widget is close to viewport
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' } // Start loading 200px before it comes into view
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible || !containerRef.current) return;

        // Clear previous content
        containerRef.current.innerHTML = '';
        setIsScriptLoaded(false);

        const script = document.createElement('script');
        const locale = language === 'tr' ? 'tr' : 'en';

        let url = `https://tpwgts.com/content?currency=usd&trs=475099&shmarker=682806&locale=${locale}&stops=any&show_hotels=true&powered_by=true&border_radius=0&plain=true&color_button=%2300A991&color_button_text=%23ffffff&promo_id=3414&campaign_id=111`;

        if (origin) url += `&origin=${origin}`;
        if (destination) url += `&destination=${destination}`;
        if (departDate) url += `&depart_date=${departDate}`;
        else if (!origin) url += `&origin=IST`;

        script.src = url;
        script.async = true;
        script.charset = "utf-8";

        script.onload = () => {
            setIsScriptLoaded(true);
        };

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [isVisible, language, origin, destination, departDate]);

    return (
        <div
            ref={containerRef}
            className="w-full min-h-[500px] bg-white dark:bg-brand-surface rounded-xl shadow-lg overflow-hidden relative"
        >
            {(!isVisible || !isScriptLoaded) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm animate-pulse">
                    <div className="w-16 h-16 mb-4 text-gold-500">
                        <SpinnerIcon className="w-full h-full animate-spin" />
                    </div>
                    <div className="text-white/70 font-medium">Loading Flight Search...</div>
                    {/* Visual Skeleton placeholders */}
                    <div className="w-3/4 h-12 bg-white/10 rounded-lg mt-8 mb-4"></div>
                    <div className="w-full px-8 flex gap-4">
                        <div className="flex-1 h-32 bg-white/5 rounded-lg"></div>
                        <div className="flex-1 h-32 bg-white/5 rounded-lg"></div>
                    </div>
                </div>
            )}
        </div>
    );
});

// Display name for debugging
FlightSearchWidget.displayName = 'FlightSearchWidget';

export default FlightSearchWidget;
