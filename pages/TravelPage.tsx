import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import MetaHead from '../components/MetaHead';
import FlightSearchWidget from '../components/FlightSearchWidget';
import { CustomBriefcaseIcon, GlobeIcon, SparklesIcon, ChevronRightIcon } from '../components/Icons';

const TravelPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const featuredDestinations = [
        { name: 'Antalya', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80', deals: 12 },
        { name: 'Istanbul', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80', deals: 45 },
        { name: 'Cappadocia', image: 'https://images.unsplash.com/photo-1621847468516-1cd5d0ec569d?w=800&q=80', deals: 8 },
        { name: 'Bodrum', image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80', deals: 15 },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-brand-bg pb-24">
            <MetaHead
                title={t('travelPageTitle') || "Travel Hub - Tripzy"}
                description={t('travelPageDescription') || "Book hotels, flights, and exclusive travel experiences."}
                url="https://tripzy.app/travel"
            />

            {/* Hero Section */}
            <div className="relative h-[40vh] min-h-[300px] flex items-center justify-center overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80"
                    alt="Travel Hub Hero"
                    className="absolute inset-0 w-full h-full object-cover brightness-50 bg-brand-bg/80"
                />
                <div className="relative z-10 text-center px-4">
                    <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-4 drop-shadow-lg">
                        {t('travelHubTitle') || "Your World of Adventure"}
                    </h1>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                        {t('travelHubSubtitle') || "Exclusive discounts on 850,000+ hotels and flights worldwide."}
                    </p>
                </div>
            </div>

            <main className="container mx-auto px-4 -mt-10 relative z-20">
                {/* Search Integration */}
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Flight Search Section */}
                    <section className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl overflow-hidden">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-brand-primary/20 rounded-lg">
                                <GlobeIcon className="w-6 h-6 text-brand-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">{t('findFlightsTitle') || 'Flight Discovery'}</h2>
                        </div>
                        <FlightSearchWidget />
                    </section>

                    {/* Hotel Placeholder (Access Development API Stub) */}
                    <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl group">
                        {/* Decorative Background Glows */}
                        <div className="absolute top-0 left-1/4 w-64 h-64 bg-brand-primary/10 rounded-full blur-[100px] group-hover:bg-brand-primary/20 transition-all duration-1000"></div>
                        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] group-hover:bg-purple-500/20 transition-all duration-1000"></div>

                        <div className="relative z-10">
                            <div className="inline-flex p-5 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                <SparklesIcon className="w-12 h-12 text-gold-400" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-heading font-black text-white mb-4 tracking-tight drop-shadow-lg">
                                {t('hotelSearchTitle') || '850,000+ Discounted Hotels'}
                            </h2>
                            <p className="text-white/60 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                                {t('hotelSearchComingSoon') || "We're integrating our core hotel engine to bring you exclusive VIP rates across Turkey and the globe."}
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button className="w-full sm:w-auto bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-bold py-4 px-12 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-[0_10px_40px_rgba(212,175,55,0.3)] uppercase tracking-widest text-sm">
                                    {t('notifyMe') || "Stay Tuned"}
                                </button>
                                <div className="px-6 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-xs font-bold text-white/40 uppercase tracking-[0.2em]">
                                    Coming Q1 2024
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Featured Destinations */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center">
                                <SparklesIcon className="w-6 h-6 text-brand-primary mr-2" />
                                {t('featuredDestinations') || 'Trending Destinations'}
                            </h3>
                            <button className="text-brand-primary hover:underline flex items-center font-medium">
                                {t('viewAll') || 'View All'}
                                <ChevronRightIcon className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {featuredDestinations.map((dest) => (
                                <div key={dest.name} className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-lg">
                                    <img src={dest.image} alt={dest.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-4 left-4">
                                        <div className="text-white font-bold text-lg">{dest.name}</div>
                                        <div className="text-white/70 text-sm">{dest.deals} {t('dealsLabel') || 'Deals'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TravelPage;
