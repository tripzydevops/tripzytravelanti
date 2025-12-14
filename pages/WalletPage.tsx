import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { CustomBriefcaseIcon } from '../components/Icons';
import { supabase } from '../lib/supabaseClient';
import DealCard from '../components/DealCard';
import { Deal } from '../types';

interface UserDeal {
    id: string;
    deal_id: string;
    status: 'active' | 'redeemed' | 'expired';
    acquired_at: string;
}

const WalletPage: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [walletDeals, setWalletDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWalletDeals() {
            if (!user) return;
            try {
                // Fetch user's owned deals
                const { data: userDeals, error } = await supabase
                    .from('user_deals')
                    .select('deal_id, status, acquired_at')
                    .eq('user_id', user.id)
                    .order('acquired_at', { ascending: false });

                if (error) throw error;

                if (userDeals && userDeals.length > 0) {
                    // Get full deal details
                    const dealIds = userDeals.map(ud => ud.deal_id);
                    const { data: dealsData, error: dealsError } = await supabase
                        .from('deals')
                        .select('*')
                        .in('id', dealIds);

                    if (dealsError) throw dealsError;

                    // Map DB deals to App Deal type
                    // (Assuming simplified mapping here since we don't have the full transform function in this file)
                    // Ideally should import transformDealFromDB
                    const mappedDeals = dealsData?.map((dbDeal: any) => ({
                        id: dbDeal.id,
                        title: dbDeal.title,
                        title_tr: dbDeal.title_tr,
                        description: dbDeal.description,
                        description_tr: dbDeal.description_tr,
                        imageUrl: dbDeal.image_url,
                        category: dbDeal.category,
                        category_tr: dbDeal.category_tr,
                        originalPrice: dbDeal.original_price,
                        discountedPrice: dbDeal.discounted_price,
                        requiredTier: dbDeal.required_tier,
                        // ... map other necessary fields or cast if lazy
                        ...dbDeal // Fallback
                    })) as Deal[]; // Simplified for now

                    setWalletDeals(mappedDeals || []);
                } else {
                    setWalletDeals([]);
                }

            } catch (err) {
                console.error('Error fetching wallet deals:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchWalletDeals();
    }, [user]);

    return (
        <div className="container mx-auto px-4 pt-6 pb-24">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-brand-text-light mb-2">{t('myWalletTitle') || 'My Wallet'}</h1>
                <p className="text-lg text-gray-500 dark:text-brand-text-muted">{t('myWalletSubtitle') || 'Deals you have purchased or won'}</p>
            </header>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>
            ) : walletDeals.length > 0 ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                    {walletDeals.map(deal => (
                        <div key={deal.id} className="relative">
                            <DealCard deal={deal} />
                            {/* Badge for status? */}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 flex flex-col items-center">
                    <CustomBriefcaseIcon className="w-16 h-16 text-gray-400 dark:text-brand-text-muted mb-4" />
                    <p className="text-xl text-gray-500 dark:text-brand-text-muted">{t('emptyWallet') || 'Your wallet is empty'}</p>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
