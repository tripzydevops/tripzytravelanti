import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface FlightSearchWidgetProps {
    origin?: string;
    destination?: string;
    departDate?: string;
}

const FlightSearchWidget: React.FC<FlightSearchWidgetProps> = ({ origin, destination, departDate }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { language } = useLanguage();

    useEffect(() => {
        if (containerRef.current) {
            // Clear previous content
            containerRef.current.innerHTML = '';

            const script = document.createElement('script');
            const locale = language === 'tr' ? 'tr' : 'en';

            let url = `https://tpwgts.com/content?currency=usd&trs=475099&shmarker=682806&locale=${locale}&stops=any&show_hotels=true&powered_by=true&border_radius=0&plain=true&color_button=%2300A991&color_button_text=%23ffffff&promo_id=3414&campaign_id=111`;

            if (origin) url += `&origin=${origin}`;
            if (destination) url += `&destination=${destination}`;
            if (departDate) url += `&depart_date=${departDate}`;
            // If no specific route is provided, default origin to IST (as per previous fix)
            else if (!origin) url += `&origin=IST`;

            script.src = url;
            script.async = true;
            script.charset = "utf-8";
            containerRef.current.appendChild(script);

            return () => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
            };
        }
    }, [language, origin, destination, departDate]);

    return (
        <div className="w-full min-h-[500px] bg-white dark:bg-brand-surface rounded-xl shadow-lg overflow-hidden p-4">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

export default FlightSearchWidget;
