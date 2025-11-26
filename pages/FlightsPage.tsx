import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '../components/Icons';
import FlightSearchWidget from '../components/FlightSearchWidget';
import { useLanguage } from '../contexts/LanguageContext';

const FlightsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-brand-bg">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-brand-bg/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
                <div className="mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300 text-gray-700 dark:text-brand-text-light"
                        aria-label="Go back"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <h1 className="text-lg font-bold text-brand-text-light">{t('categoryFlights') || 'Flights'}</h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-heading font-bold text-brand-text-light mb-4">
                            {t('findFlightsTitle') || 'Find the Best Flight Deals'}
                        </h2>
                        <p className="text-brand-text-muted">
                            {t('findFlightsSubtitle') || 'Search hundreds of travel sites at once.'}
                        </p>
                    </div>

                    <FlightSearchWidget />
                </div>
            </main>
        </div>
    );
};

export default FlightsPage;
