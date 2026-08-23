import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserRedemptions } from '../lib/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import RedeemedVoucherCard from '../components/RedeemedVoucherCard';

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
                <h1 className="text-xl font-bold font-heading text-white">{t('redemptionHistory') || 'Kullanılan Fırsatlar & Makbuzlar'}</h1>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                    </div>
                ) : redemptions.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-4xl mb-4">🎟️</div>
                        <h3 className="text-lg font-bold text-white mb-2">{t('noRedemptions') || 'Henüz Kullanılan Fırsat Yok'}</h3>
                        <p className="text-white/50 text-sm">{t('startRedeeming') || 'Fırsatlarınızı kullandığınızda dijital makbuzlarınız burada görünecektir.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {redemptions.map((redemption) => {
                            const deal = redemption.deals;
                            if (!deal) return null;

                            const formattedDeal = {
                                ...deal,
                                id: deal.id,
                                title: deal.title,
                                title_tr: deal.title_tr,
                                imageUrl: deal.image_url,
                                vendor: deal.vendor,
                                originalPrice: deal.original_price,
                                discountedPrice: deal.discounted_price,
                                acquiredAt: redemption.redeemed_at,
                                redemptionCode: deal.redemption_code || redemption.id.substring(0, 8).toUpperCase()
                            };

                            return (
                                <RedeemedVoucherCard key={redemption.id} deal={formattedDeal} />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RedemptionHistoryPage;
