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
            if (!dealId) return;
            setLoading(true);
            try {
                const results = await getSimilarDeals(dealId, limit);
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
        <section className="py-12 px-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-gold-500/10 border border-gold-500/20">
                    <SparklesIcon className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                    <h3 className="text-xl font-heading font-bold text-white uppercase tracking-wider">{t('youMightAlsoLike') || 'You Might Also Like'}</h3>
                    <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">{t('aiRecommended') || 'AI Powered Recommendations'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {deals.map((deal) => (
                    <div key={deal.id} className="h-full">
                        <DealCard deal={deal} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SimilarDeals;
