import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { CustomBriefcaseIcon, SparklesIcon, ClockIcon, CheckCircle, XCircle } from '../components/Icons';
import { supabase } from '../lib/supabaseClient';
import DealCard from '../components/DealCard';
import DealCardSkeleton from '../components/DealCardSkeleton';
import PullToRefresh from '../components/PullToRefresh';
import { Deal } from '../types';

interface WalletDeal extends Deal {
    walletStatus: 'active' | 'redeemed' | 'expired';
    acquiredAt: string;
}

type FilterType = 'all' | 'active' | 'redeemed' | 'expired';
type SortType = 'recent' | 'expiring' | 'value';

const WalletPage: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [walletDeals, setWalletDeals] = useState<WalletDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [sortBy, setSortBy] = useState<SortType>('recent');

    const fetchWalletDeals = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            // Fetch user's owned deals with status
            const { data: userDeals, error } = await supabase
                .from('user_deals')
                .select('deal_id, status, acquired_at')
                .eq('user_id', user.id)
                .order('acquired_at', { ascending: false });

            if (error) throw error;

            if (userDeals && userDeals.length > 0) {
                const dealIds = userDeals.map(ud => ud.deal_id);
                const { data: dealsData, error: dealsError } = await supabase
                    .from('deals')
                    .select('*')
                    .in('id', dealIds);

                if (dealsError) throw dealsError;

                // Create status map from user_deals
                const statusMap = new Map(
                    userDeals.map(ud => [ud.deal_id, { status: ud.status, acquiredAt: ud.acquired_at }])
                );

                // Map and merge
                const mappedDeals: WalletDeal[] = dealsData?.map((dbDeal: any) => {
                    const userDealInfo = statusMap.get(dbDeal.id);
                    return {
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
                        discountPercentage: dbDeal.discount_percentage,
                        requiredTier: dbDeal.required_tier,
                        vendor: dbDeal.vendor,
                        expiresAt: dbDeal.expires_at,
                        rating: dbDeal.rating || 0,
                        ratingCount: dbDeal.rating_count || 0,
                        redemptionCode: dbDeal.redemption_code,
                        companyLogoUrl: dbDeal.company_logo_url,
                        createdAt: dbDeal.created_at,
                        ...dbDeal,
                        walletStatus: userDealInfo?.status || 'active',
                        acquiredAt: userDealInfo?.acquiredAt || '',
                    };
                }) || [];

                setWalletDeals(mappedDeals);
            } else {
                setWalletDeals([]);
            }
        } catch (err) {
            console.error('Error fetching wallet deals:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchWalletDeals();
    }, [fetchWalletDeals]);

    // Calculate total savings
    const totalSavings = useMemo(() => {
        return walletDeals.reduce((sum, deal) => {
            if (deal.originalPrice && deal.discountedPrice) {
                return sum + (deal.originalPrice - deal.discountedPrice);
            }
            return sum;
        }, 0);
    }, [walletDeals]);

    // Filter and sort deals
    const filteredDeals = useMemo(() => {
        let filtered = [...walletDeals];

        // Apply filter
        if (activeFilter !== 'all') {
            filtered = filtered.filter(d => d.walletStatus === activeFilter);
        }

        // Apply sort
        switch (sortBy) {
            case 'expiring':
                filtered.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
                break;
            case 'value':
                filtered.sort((a, b) => {
                    const aValue = (a.originalPrice || 0) - (a.discountedPrice || 0);
                    const bValue = (b.originalPrice || 0) - (b.discountedPrice || 0);
                    return bValue - aValue;
                });
                break;
            case 'recent':
            default:
                filtered.sort((a, b) => new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime());
                break;
        }

        return filtered;
    }, [walletDeals, activeFilter, sortBy]);

    // Count by status
    const counts = useMemo(() => ({
        all: walletDeals.length,
        active: walletDeals.filter(d => d.walletStatus === 'active').length,
        redeemed: walletDeals.filter(d => d.walletStatus === 'redeemed').length,
        expired: walletDeals.filter(d => d.walletStatus === 'expired').length,
    }), [walletDeals]);

    // Check if deal expires soon (within 48 hours)
    const getExpiryWarning = (expiresAt: string): 'today' | 'soon' | null => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const hoursLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursLeft <= 0) return null;
        if (hoursLeft <= 24) return 'today';
        if (hoursLeft <= 48) return 'soon';
        return null;
    };

    // Status badge component
    const StatusBadge: React.FC<{ status: WalletDeal['walletStatus'] }> = ({ status }) => {
        const config = {
            active: { bg: 'from-emerald-500 to-emerald-600', text: t('walletStatusActive'), icon: <CheckCircle className="w-3 h-3" /> },
            redeemed: { bg: 'from-blue-500 to-blue-600', text: t('walletStatusRedeemed'), icon: <CheckCircle className="w-3 h-3" /> },
            expired: { bg: 'from-gray-500 to-gray-600', text: t('walletStatusExpired'), icon: <XCircle className="w-3 h-3" /> },
        };
        const { bg, text, icon } = config[status];

        return (
            <div className={`absolute top-3 right-3 z-30 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${bg} shadow-lg border border-white/20`}>
                {icon}
                {text}
            </div>
        );
    };

    // Filter tabs
    const filters: { key: FilterType; labelKey: string }[] = [
        { key: 'all', labelKey: 'walletFilterAll' },
        { key: 'active', labelKey: 'walletFilterActive' },
        { key: 'redeemed', labelKey: 'walletFilterRedeemed' },
        { key: 'expired', labelKey: 'walletFilterExpired' },
    ];

    return (
        <PullToRefresh onRefresh={fetchWalletDeals} className="min-h-screen">
            <div className="container mx-auto px-4 pt-6 pb-24">
                {/* Header */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-white mb-2">
                        {t('myWalletTitle') || 'My Wallet'}
                    </h1>
                    <p className="text-lg text-white/60">
                        {t('myWalletSubtitle') || 'Deals you have purchased or won'}
                    </p>
                </header>

                {/* Savings Summary Card */}
                {walletDeals.length > 0 && totalSavings > 0 && (
                    <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-gold-500/20 via-gold-400/10 to-gold-500/20 border border-gold-500/30 backdrop-blur-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-gold-500/20 border border-gold-500/30">
                                    <SparklesIcon className="w-6 h-6 text-gold-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gold-400/80 font-medium">
                                        {t('walletSavingsSummary') || "You've saved"}
                                    </p>
                                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                                        ₺{totalSavings.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/40 uppercase tracking-wider">
                                    {t('walletTotalSavings')}
                                </p>
                                <p className="text-lg font-semibold text-white/80">
                                    {walletDeals.length} {language === 'tr' ? 'fırsat' : 'deals'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {filters.map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${activeFilter === filter.key
                                ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white border-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {t(filter.labelKey)} ({counts[filter.key]})
                        </button>
                    ))}
                </div>

                {/* Sort Options */}
                {walletDeals.length > 1 && (
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-sm text-white/40">{language === 'tr' ? 'Sırala:' : 'Sort:'}</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortType)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500/50"
                        >
                            <option value="recent">{t('walletSortRecent')}</option>
                            <option value="expiring">{t('walletSortExpiring')}</option>
                            <option value="value">{t('walletSortValue')}</option>
                        </select>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                        <DealCardSkeleton count={6} />
                    </div>
                ) : filteredDeals.length > 0 ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                        {filteredDeals.map(deal => {
                            const expiryWarning = deal.walletStatus === 'active' ? getExpiryWarning(deal.expiresAt) : null;

                            return (
                                <div key={deal.id} className="relative group">
                                    {/* Status Badge */}
                                    <StatusBadge status={deal.walletStatus} />

                                    {/* Expiry Warning Overlay */}
                                    {expiryWarning && (
                                        <div className={`absolute top-12 right-3 z-30 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white ${expiryWarning === 'today'
                                            ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse'
                                            : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                            } shadow-lg border border-white/20`}>
                                            <ClockIcon className="w-3 h-3" />
                                            {expiryWarning === 'today' ? t('walletExpiresToday') : t('walletExpiresSoon')}
                                        </div>
                                    )}

                                    <DealCard deal={deal} />

                                    {/* Quick Use Button for Active Deals */}
                                    {deal.walletStatus === 'active' && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                navigate(`/deals/${deal.id}`);
                                            }}
                                            className="absolute bottom-4 left-4 right-4 z-30 py-2 px-4 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-bold text-sm shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                                        >
                                            {t('walletUseNow') || 'Use Now'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 flex flex-col items-center">
                        <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-6">
                            <CustomBriefcaseIcon className="w-16 h-16 text-white/30" />
                        </div>
                        <p className="text-xl text-white/60 mb-2">
                            {activeFilter === 'all'
                                ? (t('emptyWallet') || 'Your wallet is empty')
                                : `${language === 'tr' ? 'Bu kategoride fırsat yok' : 'No deals in this category'}`
                            }
                        </p>
                        {activeFilter === 'all' && (
                            <Link
                                to="/"
                                className="mt-4 px-6 py-3 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 text-white font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all"
                            >
                                {t('browseDeals') || 'Browse Deals'}
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </PullToRefresh>
    );
};

export default WalletPage;
