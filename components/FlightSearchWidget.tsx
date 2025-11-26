import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const FlightSearchWidget: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { language } = useLanguage();

    useEffect(() => {
        if (containerRef.current) {
            // Clear previous content
            containerRef.current.innerHTML = '';

            const script = document.createElement('script');
            const locale = language === 'tr' ? 'tr' : 'en';
            script.src = `https://tpwgts.com/content?currency=usd&trs=475099&shmarker=682806&locale=${locale}&stops=any&show_hotels=true&powered_by=true&border_radius=0&plain=true&color_button=%2300A991&color_button_text=%23ffffff&promo_id=3414&campaign_id=111&origin=IST`;
            script.async = true;
            script.charset = "utf-8";
            containerRef.current.appendChild(script);

            return () => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
            };
        }
    }, [language]); // Re-run when language changes

    return (
        <div className="w-full min-h-[500px] bg-white dark:bg-brand-surface rounded-xl shadow-lg overflow-hidden p-4">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

export default FlightSearchWidget;
