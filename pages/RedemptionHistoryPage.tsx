import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserRedemptions } from '../lib/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronLeftIcon, CalendarIcon, LocationMarkerIcon } from '../components/Icons';

const RedemptionHistoryPage: React.FC = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [redemptions, setRedemptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getUserRedemptions(user.id)
                .then(data => {
                    setRedemptions(data || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch redemptions', err);
                    setLoading(false);
                });
        }
    }, [user]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text-light pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-brand-bg/95 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors mr-4"
                >
                    <ChevronLeftIcon className="w-6 h-6 text-gold-500" />
                </button>
                <h1 className="text-xl font-bold font-heading text-white">{t('redemptionHistory')}</h1>
            </div>

            <div className="container mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                    </div>
                ) : redemptions.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-4xl mb-4">🎟️</div>
                        <h3 className="text-lg font-bold text-white mb-2">{t('noRedemptions') || 'No Redemptions Yet'}</h3>
                        <p className="text-white/50 text-sm">{t('startRedeeming') || 'Start using your deals to see them here!'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {redemptions.map((redemption) => {
                            const deal = redemption.deals; // Joined data
                            if (!deal) return null;

                            return (
                                <div key={redemption.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex shadow-lg hover:border-gold-500/30 transition-colors">
                                    {/* Deal Image */}
                                    <div className="w-24 h-24 flex-shrink-0 bg-gray-800">
                                        <img
                                            src={deal.image_url}
                                            alt={deal.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-grow p-3 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-white text-sm line-clamp-1">
                                                {language === 'tr' ? deal.title_tr : deal.title}
                                            </h3>
                                            <p className="text-xs text-white/60 mb-1">{deal.vendor}</p>
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center text-xs text-gold-500/80">
                                                <CalendarIcon className="w-3 h-3 mr-1" />
                                                {new Date(redemption.redeemed_at).toLocaleDateString()}
                                                <span className="mx-1">•</span>
                                                {new Date(redemption.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>

                                            {deal.redemption_code && (
                                                <div className="bg-gold-500/10 border border-gold-500/20 px-2 py-1 rounded text-xs text-gold-500 font-mono">
                                                    {deal.redemption_code}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RedemptionHistoryPage;
