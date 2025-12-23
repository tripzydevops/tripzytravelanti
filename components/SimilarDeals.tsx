import React, { useState, useEffect } from 'react';
import { getSimilarDeals } from '../lib/supabaseService';
import { Deal } from '../types';
import DealCard from './DealCard';
import { useLanguage } from '../contexts/LanguageContext';
import { SparklesIcon } from './Icons';

interface SimilarDealsProps {
    dealId: string;
    limit?: number;
}

const SimilarDeals: React.FC<SimilarDealsProps> = ({ dealId, limit = 3 }) => {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchSimilar = async () => {
            setLoading(true);
            try {
                let results: Deal[];
                if (dealId) {
                    results = await getSimilarDeals(dealId, limit);
                } else {
                    // Fetch trending/popular deals for home page
                    const { searchDealsSemantic } = await import('../lib/supabaseService');
                    results = await searchDealsSemantic('trending', limit);
                }
                setDeals(results);
            } catch (error) {
                console.error('Failed to fetch similar deals:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSimilar();
    }, [dealId, limit]);

    if (loading) {
        return (
            <div className="py-12 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500/50 mb-4"></div>
                <p className="text-white/40 text-sm animate-pulse">{t('findingSimilarDeals') || 'Finding similar deals...'}</p>
            </div>
        );
    }

    if (deals.length === 0) return null;

    return (
        <section className="py-12 px-8 max-w-7xl mx-auto my-8 relative rounded-3xl overflow-hidden glass-premium shadow-2xl">
            {/* Ambient Background Glow for Section */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-gold-500/10 border border-gold-500/20">
                        <SparklesIcon className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-heading font-bold text-white uppercase tracking-wider">
                            {dealId ? (t('youMightAlsoLike') || 'You Might Also Like') : (t('trendingDeals') || 'Trending Now')}
                        </h3>
                        <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">
                            {dealId ? (t('aiRecommended') || 'AI Powered Recommendations') : (t('aiTrending') || 'Top Picks for You')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {deals.map((deal) => (
                        <div key={deal.id} className="h-full">
                            <DealCard deal={deal} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SimilarDeals;
