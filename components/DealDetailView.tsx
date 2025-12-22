import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHeroImageUrl } from '../lib/imageUtils';
import { checkMonthlyLimit, getWalletItems, logEngagementEvent } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { triggerConfetti } from '../utils/confetti';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { SubscriptionTier, Deal } from '../types';
import { ChevronLeftIcon, ShareIcon, WhatsappIcon, FacebookLogo, TelegramIcon, InstagramIcon, LinkIcon, CheckCircle, PremiumShareIcon, HeartIcon, ClockIcon, LocationMarkerIcon, GlobeIcon, StarIcon, SparklesIcon, CustomBriefcaseIcon, TicketIcon } from './Icons';
import Modal from './Modal';
import StarRatingInput from './StarRatingInput';
import WalletQRCode from './WalletQRCode';
import { getWalletLimit, isWalletFull } from '../lib/walletUtils';
import { canUserClaimDeal } from '../lib/redemptionLogic';
import { Lock } from './Icons';

const TIER_LEVELS: Record<SubscriptionTier, number> = {
    [SubscriptionTier.NONE]: 0,
    [SubscriptionTier.FREE]: 1,
    [SubscriptionTier.BASIC]: 2,
    [SubscriptionTier.PREMIUM]: 3,
    [SubscriptionTier.VIP]: 4,
};

// --- Share Modal Component ---
interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    dealTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl, dealTitle }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleInstagramShare = () => {
        handleCopyLink();
        window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
    };

    const socialPlatforms = [
        { name: 'WhatsApp', icon: <WhatsappIcon className="w-8 h-8 text-white" />, action: `https://api.whatsapp.com/send?text=${encodeURIComponent(dealTitle + '\n' + shareUrl)}`, isLink: true, bg: 'bg-[#25D366]' },
        { name: 'Telegram', icon: <TelegramIcon className="w-8 h-8 text-white" />, action: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(dealTitle)}`, isLink: true, bg: 'bg-[#0088cc]' },
        { name: 'Facebook', icon: <FacebookLogo className="w-8 h-8 text-white" />, action: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, isLink: true, bg: 'bg-[#1877F2]' },
        { name: 'Instagram', icon: <InstagramIcon className="w-8 h-8 text-white" />, action: handleInstagramShare, isLink: false, bg: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]' },
        { name: t('copyLink'), icon: copied ? <CheckCircle className="w-8 h-8 text-white" /> : <LinkIcon className="w-8 h-8 text-white" />, action: handleCopyLink, isLink: false, bg: 'bg-gray-600' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('shareDeal')}>
            <div className="grid grid-cols-3 gap-6 py-4">
                {socialPlatforms.map((platform, index) => {
                    const content = (
                        <>
                            <div className={`w-14 h-14 rounded-2xl ${platform.bg} flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200`}>
                                {platform.icon}
                            </div>
                            <span className="text-xs font-medium text-gray-700 text-center mt-2">{platform.name}</span>
                        </>
                    );

                    if (platform.isLink) {
                        return (
                            <a
                                key={index}
                                href={platform.action as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center group"
                            >
                                {content}
                            </a>
                        );
                    }
                    return (
                        <button
                            key={index}
                            onClick={platform.action as () => void}
                            className="flex flex-col items-center group"
                        >
                            {content}
                        </button>
                    );
                })}
            </div>
            {copied && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium animate-fade-in">
                    {t('linkCopied')}
                </div>
            )}
        </Modal>
    );
};

interface DealDetailViewProps {
    deal: Deal;
    isPreview?: boolean;
    onRate?: (dealId: string, rating: number) => Promise<void>;
    onRedeem?: (dealId: string) => Promise<void>;
}

const DealDetailView: React.FC<DealDetailViewProps> = ({ deal, isPreview = false, onRate, onRedeem }) => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { saveDeal, unsaveDeal, isDealSaved, claimDeal, isDealOwned, hasRedeemed } = useUserActivity();
    const navigate = useNavigate();

    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [hasRated, setHasRated] = useState(false);
    const [activeTab, setActiveTab] = useState<'conditions' | 'locations'>('conditions');
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [isWalletFullModalOpen, setIsWalletFullModalOpen] = useState(false);
    const [remainingRedemptions, setRemainingRedemptions] = useState<number | null>(null);
    const [pendingAction, setPendingAction] = useState<'redeem' | 'claim' | null>(null);
    const [activeDealsCount, setActiveDealsCount] = useState(0);
    const [walletItemInfo, setWalletItemInfo] = useState<{ id: string; redemptionCode: string } | null>(null);
    const [localIsSoldOut, setLocalIsSoldOut] = useState(deal.isSoldOut || (deal.maxRedemptionsTotal && (deal.redemptionsCount || 0) >= deal.maxRedemptionsTotal));
    // Consistent random number for viewing count based on deal.id
    const viewingCount = useMemo(() => {
        const hash = deal.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return 8 + (hash % 18);
    }, [deal.id]);

    useEffect(() => {
        setLocalIsSoldOut(deal.isSoldOut || (deal.maxRedemptionsTotal && (deal.redemptionsCount || 0) >= deal.maxRedemptionsTotal));
    }, [deal]);

    useEffect(() => {
        if (user) {
            checkMonthlyLimit(user.id)
                .then(result => setRemainingRedemptions(result.remaining))
                .catch(err => console.error('Failed to check limit:', err));

            // Fetch active deals count for wallet capacity check
            supabase
                .from('wallet_items')
                .select('id', { count: 'exact' })
                .eq('user_id', user.id)
                .eq('status', 'active')
                .then(({ count }) => setActiveDealsCount(count || 0));

            // Fetch wallet item info if user owns this deal
            if (deal?.id) {
                supabase
                    .from('wallet_items')
                    .select('id, redemption_code')
                    .eq('user_id', user.id)
                    .eq('deal_id', deal.id)
                    .eq('status', 'active')
                    .maybeSingle()
                    .then(({ data }) => {
                        if (data) {
                            setWalletItemInfo({ id: data.id, redemptionCode: data.redemption_code });
                        }
                    });
            }

            // Phase 1: Log 'view' event
            if (deal?.id) {
                logEngagementEvent(user.id, 'view', deal.id, { source: 'DealDetailView' });
            }
        }
    }, [user, deal?.id]);

    const handleActionClick = (action: 'redeem' | 'claim') => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Check wallet capacity for claim action
        if (action === 'claim') {
            const userTier = user.tier || SubscriptionTier.FREE;
            if (isWalletFull(activeDealsCount, userTier, user.walletLimit)) {
                setIsWalletFullModalOpen(true);
                return;
            }
        }

        const dontShowAgain = localStorage.getItem('dontShowRedemptionWarning') === 'true';
        setPendingAction(action);

        if (dontShowAgain) {
            executeAction(action);
        } else {
            setIsWarningModalOpen(true);
        }
    };

    const executeAction = async (action: 'redeem' | 'claim') => {
        if (!user || !deal) return;

        try {
            if (action === 'redeem') {
                if (onRedeem) {
                    await onRedeem(deal.id);
                    setIsRedeemModalOpen(true); // Show QR
                    setTimeout(() => triggerConfetti('burst'), 300);
                }
            } else if (action === 'claim') {
                await claimDeal(deal.id);
                triggerConfetti('default');
            }
        } catch (error: any) {
            let errorMessage = 'Action failed';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String(error.message);
            }

            console.error(`Failed to ${action} deal:`, error);
            console.error(`Error details:`, JSON.stringify(error, null, 2));

            // Check for Sold Out error
            if (errorMessage.toLowerCase().includes('sold out')) {
                setLocalIsSoldOut(true);
                // Show a Sold Out modal (reusing Limit Modal structure for simplicity or a new alert)
                alert(t('dealSoldOutAlert') || 'Sorry, this deal just sold out!');
                return;
            }

            // Check for limit error (including the "Could not determine" one as a safe fallback for now)
            if (errorMessage.toLowerCase().includes('limit') || errorMessage.includes('Could not determine')) {
                setIsLimitModalOpen(true);
            } else {
                alert(errorMessage);
            }
        } finally {
            setIsWarningModalOpen(false);
            setPendingAction(null);
        }
    };

    const handleRedeemConfirm = () => {
        if (pendingAction) {
            executeAction(pendingAction);
        }
    };

    const shareUrl = useMemo(() => {
        if (!deal?.id) return '';
        const cleanPathname = window.location.pathname.replace(/index\.html$/, '');
        return `${window.location.origin}${cleanPathname}#/deals/${deal.id}`;
    }, [deal?.id]);

    const canClaim = canUserClaimDeal(user, deal);
    const requiresLogin = !user && deal.requiredTier !== SubscriptionTier.FREE;
    // Special case: guests can see FREE deals but can't claim until login
    const isLocked = !canClaim && !isPreview;

    const title = language === 'tr' ? deal.title_tr : deal.title;
    const description = language === 'tr' ? deal.description_tr : deal.description;

    const handleShare = async () => {
        setIsShareModalOpen(true);
    };

    const isTermsUrl = (url: string) => {
        return /^(http|https):\/\//i.test(url);
    };

    const handleTermsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (deal.termsUrl && isTermsUrl(deal.termsUrl)) {
            window.open(deal.termsUrl, '_blank', 'noopener,noreferrer');
        } else {
            setIsTermsModalOpen(true);
        }
    };

    const handleRate = async (rating: number) => {
        if (deal && !hasRated && onRate) {
            await onRate(deal.id, rating);
            setHasRated(true);
        }
    };

    // Calculate days left
    const daysLeft = useMemo(() => {
        if (!deal.expiresAt) return null;
        const now = new Date();
        const expiry = new Date(deal.expiresAt);
        const diffTime = Math.abs(expiry.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }, [deal.expiresAt]);

    const originalPriceFormatted = deal.originalPrice > 0 ? `₺${deal.originalPrice}` : '';
    const discountedPriceFormatted = deal.originalPrice > 0 ? `₺${deal.discountedPrice}` : (language === 'tr' ? `%${deal.discountPercentage}` : `${deal.discountPercentage}%`);

    return (
        <div className="bg-brand-bg min-h-screen relative pb-40 font-body text-brand-text-light selection:bg-gold-500/30">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-white dark:from-brand-bg via-white/80 dark:via-brand-bg/80 to-transparent z-0"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-900/10 rounded-full blur-[100px] opacity-20"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gold-500/5 dark:bg-gold-900/10 rounded-full blur-[100px] opacity-10"></div>
            </div>

            {/* Header Actions (Absolute) */}
            <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => isPreview ? null : navigate(-1)}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-brand-surface/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl hover:bg-white dark:hover:bg-brand-surface transition-all duration-500 hover:scale-105 active:scale-95 group"
                        aria-label="Go back"
                        disabled={isPreview}
                    >
                        <ChevronLeftIcon className="h-5 w-5 text-slate-900 dark:text-white group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    {/* Integrated Premium Branding */}
                    <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="relative">
                            <img src="/favicon.png" alt="Tripzy" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.5)] transition-all duration-500" />
                            <div className="absolute inset-0 bg-gold-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        </div>
                        <div className="ml-2.5 flex flex-col">
                            <span className="text-slate-900 dark:text-white font-black tracking-tighter text-xl leading-none uppercase italic">Tripzy</span>
                            <span className="text-[8px] text-gold-600 font-bold tracking-[0.3em] uppercase opacity-80 leading-none mt-1">Travel Exclusive</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleShare}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 dark:bg-brand-surface/80 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg hover:bg-white dark:hover:bg-brand-surface hover:scale-105 transition-all duration-300 text-slate-900 dark:text-white"
                        aria-label={t('shareDeal')}
                    >
                        <ShareIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={async () => {
                            if (!user) {
                                navigate('/login');
                                return;
                            }
                            if (deal && user) {
                                const isSaved = isDealSaved(deal.id);
                                if (isSaved) {
                                    await unsaveDeal(deal.id);
                                } else {
                                    await saveDeal(deal.id);
                                    triggerConfetti('default');
                                }
                            }
                        }}
                        className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md border shadow-lg hover:scale-105 transition-all duration-300 ${isDealSaved(deal.id)
                            ? 'bg-gradient-to-br from-gold-600 to-gold-500 border-gold-400 text-white shadow-[0_0_15px_rgba(212,175,55,0.5)]'
                            : 'bg-white/80 dark:bg-brand-surface/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white dark:hover:bg-brand-surface'
                            }`}
                    >
                        <HeartIcon className={`h-6 w-6 ${isDealSaved(deal.id) ? 'fill-current text-gold-200' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Header / Hero Section */}
            <div className="relative h-[45vh] md:h-[55vh] overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent z-10 pointer-events-none"></div>
                <img
                    src={getHeroImageUrl(deal.imageUrl)}
                    alt="" // Empty alt to prevent broken text cluttering if image fails
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-[10s] ease-out"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80';
                        (e.target as HTMLImageElement).style.opacity = '0.5';
                    }}
                />

                {/* Floating Gallery Badge (Placeholder for multiple images) */}
                <div className="absolute bottom-24 right-6 z-20 px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
                    <SparklesIcon className="w-3.5 h-3.5 text-gold-400" />
                    <span>Exclusive Preview</span>
                </div>

                {/* Urgency Overlay */}
                <div className="absolute top-24 left-6 z-20 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center gap-2 animate-fade-in animate-pulse-subtle">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">
                        {viewingCount} {t('peopleViewing')}
                    </span>
                </div>
            </div>

            {/* Floating Content Card */}
            <div className="container mx-auto px-4 -mt-16 relative z-30">
                <div className="glass-premium rounded-[32px] p-6">
                    <div className="flex flex-col gap-6">
                        {/* Title & Vendor Section */}
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-start gap-4">
                                <h1 className="text-3xl font-heading font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                    {language === 'tr' ? deal.title_tr || deal.title : deal.title}
                                </h1>
                                <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-600 dark:text-brand-text-muted hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-base text-slate-600 dark:text-brand-text-muted font-medium">{deal.vendor}</p>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                <div className="flex items-center gap-1.5 text-gold-500 text-sm font-bold">
                                    <StarIcon className="w-4 h-4 fill-current" />
                                    <span>{deal.rating}</span>
                                    <span className="text-slate-400 dark:text-slate-500 font-normal">({deal.ratingCount})</span>
                                </div>
                            </div>
                        </div>

                    {/* Partner spotlight / Vendor profile header */}
                        <div className="flex items-center gap-4 p-4 bg-brand-bg/50 rounded-2xl border border-white/5">
                            <div className="relative shrink-0">
                                <div className="w-16 h-16 rounded-xl bg-brand-surface shadow-lg p-1 border border-gold-500/30 overflow-hidden relative group/logo">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/20 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity"></div>
                                    {deal.companyLogoUrl ? (
                                        <img src={deal.companyLogoUrl} alt={deal.vendor} className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gold-400 font-bold text-3xl font-heading">
                                            {deal.vendor.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                {/* Verified Badge */}
                                <div className="absolute -bottom-1 -right-1 bg-gold-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
                                    <CheckCircle className="w-3 h-3" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-gold-500/80">Premium Partner</span>
                                <p className="text-brand-text-light font-semibold text-lg leading-tight">{deal.vendor}</p>
                            </div>
                        </div>
                    </div>

                    {/* Days Left Badge */}
                    {daysLeft !== null && (
                        <div className="inline-flex items-center gap-2 bg-brand-bg/50 border border-white/10 px-4 py-2 rounded-full mb-8 shadow-inner">
                            <ClockIcon className="w-4 h-4 text-gold-600 animate-pulse" />
                            <span className="text-slate-600 dark:text-brand-text-muted font-medium text-sm tracking-wide">
                                {daysLeft} {t('daysLeft')}
                            </span>
                        </div>
                    )}

                    {/* Stock Status Badges */}
                    {localIsSoldOut ? (
                        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-2 rounded-full mb-8 ml-3 shadow-inner">
                            <span className="text-red-600 font-bold text-sm tracking-wide uppercase">
                                {t('soldOut') || 'Sold Out'}
                            </span>
                        </div>
                    ) : (deal.maxRedemptionsTotal && (deal.maxRedemptionsTotal - (deal.redemptionsCount || 0) <= 10)) && (
                        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-full mb-8 ml-3 shadow-inner animate-pulse">
                            <span className="text-orange-600 font-bold text-sm tracking-wide">
                                🔥 {t('hurryOnly') || 'Hurry! Only'} {deal.maxRedemptionsTotal - (deal.redemptionsCount || 0)} {t('left') || 'Left!'}
                            </span>
                        </div>
                    )}

                    {/* Polished Tabs - Pill Style */}
                    <div className="flex p-1 bg-brand-bg border border-white/10 rounded-2xl mb-10 relative">
                        {/* Animated background pill could be added with Framer Motion, but using Tailwind classes for now */}
                        <button
                            onClick={() => setActiveTab('conditions')}
                            className={`flex-1 py-3.5 text-xs font-black tracking-[0.2em] uppercase transition-all duration-500 rounded-xl relative z-10 ${activeTab === 'conditions'
                                ? 'text-white bg-gold-500 shadow-xl'
                                : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {t('campaignConditions')}
                        </button>
                        <button
                            onClick={() => setActiveTab('locations')}
                            className={`flex-1 py-3.5 text-xs font-black tracking-[0.2em] uppercase transition-all duration-500 rounded-xl relative z-10 ${activeTab === 'locations'
                                ? 'text-white bg-gold-500 shadow-xl'
                                : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {t('validLocations')}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="animate-fade-in min-h-[200px]">
                        {activeTab === 'conditions' ? (
                            <div className="space-y-6">
                                <div className="prose prose-invert max-w-none text-brand-text-muted leading-relaxed font-light text-lg">
                                    <p>{description}</p>
                                </div>

                                {/* Terms Link */}
                                {deal.termsUrl && (
                                    <div className="pt-6 border-t border-white/5">
                                        <a
                                            href={deal.termsUrl || '#'}
                                            onClick={handleTermsClick}
                                            className="inline-flex items-center gap-2 text-gold-600 hover:text-gold-500 font-semibold text-sm transition-colors group"
                                        >
                                            <LinkIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                            {t('viewTermsAndConditions')}
                                        </a>
                                    </div>
                                )}

                                {/* Rating Section */}
                                <div className="mt-8 pt-6 border-t border-white/5">
                                    <h3 className="text-sm font-semibold text-brand-text-light mb-4 uppercase tracking-wider">{t('rateThisDeal')}</h3>
                                    <div className="flex justify-center bg-brand-bg/50 rounded-2xl p-4 border border-white/5">
                                        <StarRatingInput
                                            onRate={handleRate}
                                            disabled={isPreview || !user || (user && !user.redemptions?.some(r => r.dealId === deal.id))}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-brand-bg/50 border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <div className={`w-full flex flex-col items-center justify-center ${isLocked ? 'blur-md grayscale opacity-40' : ''}`}>
                                        {deal.latitude && deal.longitude ? (
                                            <div className="w-full space-y-6">
                                                {/* Professional Map Interface or Premium Fallback */}
                                                <div className="w-full aspect-video rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-100 dark:from-slate-800 to-slate-200 dark:to-slate-900 relative group shadow-2xl">
                                                    {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                                                        <iframe
                                                            width="100%"
                                                            height="100%"
                                                            frameBorder="0"
                                                            style={{ border: 0, opacity: 0.8 }}
                                                            src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${deal.latitude},${deal.longitude}&zoom=15`}
                                                            allowFullScreen
                                                            loading="lazy"
                                                            className="group-hover:opacity-100 transition-opacity duration-700"
                                                        ></iframe>
                                                    ) : (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                                            {/* Premium Abstract Map Pattern BG */}
                                                            <div className="absolute inset-0 opacity-5 pointer-events-none">
                                                                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                                                    <defs>
                                                                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                                                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-white/10" />
                                                                        </pattern>
                                                                    </defs>
                                                                    <rect width="100%" height="100%" fill="url(#grid)" />
                                                                </svg>
                                                            </div>

                                                            <div className="relative mb-4">
                                                                <div className="absolute inset-0 bg-gold-500/30 blur-2xl rounded-full scale-150 animate-pulse"></div>
                                                                <div className="relative w-16 h-16 bg-gradient-to-tr from-gold-600 to-gold-400 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)] transform rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                                                    <LocationMarkerIcon className="w-8 h-8 text-brand-bg" />
                                                                </div>
                                                            </div>

                                                            <h4 className="text-slate-900 dark:text-brand-text-light font-black text-lg tracking-tight mb-2 uppercase italic">{deal.vendor || 'Premium Location'}</h4>
                                                            <p className="text-slate-500 dark:text-brand-text-muted text-xs font-medium max-w-[240px] leading-relaxed">
                                                                Precision location detected. Tap below to navigate directly using Google Maps.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Premium Glass Overlay */}
                                                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 dark:from-brand-bg to-transparent pointer-events-none"></div>
                                                </div>

                                                <button
                                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${deal.latitude},${deal.longitude}`, '_blank')}
                                                    className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 text-white font-black uppercase tracking-[0.25em] text-xs hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] active:scale-95 transition-all duration-500 flex items-center justify-center gap-3 shadow-xl group"
                                                >
                                                    <GlobeIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                                    {t('openInGoogleMaps') || 'Launch Navigation'}
                                                </button>
                                            </div>
                                        ) : deal.storeLocations && deal.storeLocations.length > 0 ? (
                                            <div className="w-full space-y-3">
                                                {deal.storeLocations.map((loc, idx) => (
                                                    <div key={idx} className="flex items-start gap-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-left group hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                                                        <div className="mt-1 w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20 group-hover:bg-gold-500/20 transition-colors">
                                                            <LocationMarkerIcon className="w-4 h-4 text-gold-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-slate-900 dark:text-white font-bold text-sm">{loc.name}</p>
                                                            <p className="text-slate-500 dark:text-brand-text-muted text-xs mt-0.5">{loc.address}{loc.city ? `, ${loc.city}` : ''}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(loc.address + ' ' + (loc.city || ''))}`, '_blank')}
                                                            className="p-2 rounded-lg text-gold-500/50 hover:text-gold-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                                        >
                                                            <LinkIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center py-10">
                                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-slate-200 dark:border-white/10 shadow-sm">
                                                    <GlobeIcon className="w-8 h-8 text-gold-400" />
                                                </div>
                                                <p className="text-slate-500 dark:text-brand-text-muted font-light text-lg">
                                                    {t('validAtAllLocations') || "Valid at all branch locations."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {isLocked && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                            <Lock className="w-12 h-12 text-gold-500 mb-2" />
                                            <p className="text-gold-600 font-bold uppercase tracking-widest text-sm">Location Hidden</p>
                                            <p className="text-slate-400 dark:text-brand-text-muted text-xs mt-1">Upgrade to see branches</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                        {t('contactInfo') || 'Contact Information'}
                                    </h4>
                                    {deal.companyWebsiteUrl && (
                                        <div className="flex items-center gap-4 text-slate-600 dark:text-brand-text-muted hover:text-slate-900 dark:hover:text-white transition-colors group cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 group-hover:border-gold-500/30 transition-colors">
                                                <GlobeIcon className="w-5 h-5 text-slate-400 group-hover:text-gold-500 transition-colors" />
                                            </div>
                                            <a href={deal.companyWebsiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium">Visit Website</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* How it Works / Redemption Guide */}
                    <div className="mt-16 pt-10 border-t border-slate-100 dark:border-white/5">
                        <h3 className="text-xl font-heading font-black text-slate-900 dark:text-white mb-8 uppercase tracking-widest text-center">
                            {language === 'tr' ? 'Nasıl Çalışır?' : 'How it Works'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { step: 1, title: t('step1'), desc: t('step1Desc'), icon: <CustomBriefcaseIcon className="w-6 h-6" /> },
                                { step: 2, title: t('step2'), desc: t('step2Desc'), icon: <CheckCircle className="w-6 h-6" /> },
                                { step: 3, title: t('step3'), desc: t('step3Desc'), icon: <TicketIcon className="w-6 h-6" /> },
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center text-center group">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-gold-400 mb-4 group-hover:bg-gold-500 group-hover:text-brand-bg transition-all duration-500 shadow-xl">
                                        {item.icon}
                                    </div>
                                    <h4 className="text-slate-900 dark:text-white font-bold mb-2">{item.title}</h4>
                                    <p className="text-slate-500 dark:text-brand-text-muted text-sm leading-relaxed max-w-[200px]">{item.desc}</p>
                                    {idx < 2 && (
                                        <div className="hidden md:block absolute right-0 top-8 w-8 h-px bg-slate-200 dark:bg-white/10"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trust Signals Banner */}
                    <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: t('secureRedemption'), icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
                            { label: t('noHiddenFees'), icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
                            { label: t('guaranteedAccess'), icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-brand-bg/50 border border-slate-100 dark:border-white/5 px-5 py-4 rounded-2xl">
                                {item.icon}
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-brand-text-muted">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer - Market Standard */}
            <div className="fixed bottom-0 left-0 right-0 z-50 p-2 md:p-3 pb-safe bg-gradient-to-t from-brand-bg via-brand-bg/95 to-transparent backdrop-blur-md">
                <div className="max-w-4xl mx-auto">
                    <div className="glass backdrop-blur-xl rounded-[1.25rem] p-2 md:p-3 flex items-center justify-between gap-3">
                        {/* Price Display */}
                        <div className="flex flex-col min-w-fit pl-1">
                            <div className="flex items-center gap-2 mb-0.5">
                                {deal.originalPrice > 0 && (
                                    <span className="text-slate-400 dark:text-brand-text-muted text-sm line-through decoration-slate-300 dark:decoration-slate-700">₺{deal.originalPrice}</span>
                                )}
                                <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-brand-primary/20">
                                    {deal.discountPercentage}% OFF
                                </span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-baseline gap-1">
                                <span className="text-base font-bold text-gold-500/60">₺</span>
                                <span className="bg-gradient-to-r from-slate-900 dark:from-white via-slate-900 dark:via-white to-slate-700 dark:to-slate-300 bg-clip-text text-transparent">{deal.discountedPrice}</span>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-widest">{t('total') || 'per person'}</span>
                            </div>
                        </div>

                        {/* Final Actions */}
                        <div className="flex-1 flex gap-3 max-w-md">
                            {localIsSoldOut ? (
                                <div className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 font-black py-3 rounded-xl flex items-center justify-center gap-2 grayscale cursor-not-allowed">
                                    <span className="uppercase tracking-[0.2em] text-sm">{t('soldOut') || 'Offer Ended'}</span>
                                </div>
                            ) : (
                                <>
                                    {!isDealOwned(deal.id) &&
                                        !(deal.maxRedemptionsUser === 1 && hasRedeemed(deal.id)) &&
                                        !(deal.usageLimit === '1' && hasRedeemed(deal.id)) && (
                                            <button
                                                onClick={() => handleActionClick('claim')}
                                                className="hidden sm:flex flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-brand-text-muted font-bold py-3 rounded-xl transition-all duration-300 items-center justify-center gap-2 group"
                                            >
                                                <CustomBriefcaseIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                <span className="text-sm">{t('addToWallet') || 'Save'}</span>
                                            </button>
                                        )}

                                    {isLocked ? (
                                        <button
                                            onClick={() => !user ? navigate('/login') : navigate('/subscriptions')}
                                            className="flex-[2] bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white font-black py-3 px-6 rounded-xl shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-2 uppercase tracking-wider overflow-hidden relative group text-sm"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[30deg]"></div>
                                            <Lock className="w-4 h-4" />
                                            <span className="truncate">
                                                {!user ? t('loginToUnlock') : `${t('upgradeToUnlock') || 'Unlock Now'} (${deal.requiredTier})`}
                                            </span>
                                        </button>
                                    ) : hasRedeemed(deal.id) ? (
                                        <div className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="text-sm">{t('redeemed') || 'Used'}</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => isPreview ? null : handleActionClick('redeem')}
                                            className="flex-[2] bg-gradient-to-r from-gold-400 to-gold-600 hover:from-gold-300 hover:to-gold-500 text-white dark:text-brand-bg font-black py-2.5 px-6 rounded-xl shadow-[0_5px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_8px_25px_rgba(212,175,55,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-sm animate-pulse-subtle"
                                        >
                                            <span>{t('redeemNow') || 'Claim Offer'}</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal
                isOpen={isWarningModalOpen}
                onClose={() => setIsWarningModalOpen(false)}
                title={t('redemptionWarningTitle')}
            >
                {/* Existing Modal Content - You might want to style this too if your Modal component isn't globally styled */}
                <div className="p-4">
                    <p className="text-gray-600 dark:text-brand-text-muted mb-6">
                        {t('redemptionWarningBody')}
                    </p>
                    <div className="flex items-center mb-6">
                        <input
                            type="checkbox"
                            id="dontShowAgain"
                            className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                            onChange={(e) => {
                                if (e.target.checked) {
                                    localStorage.setItem('dontShowRedemptionWarning', 'true');
                                } else {
                                    localStorage.removeItem('dontShowRedemptionWarning');
                                }
                            }}
                        />
                        <label htmlFor="dontShowAgain" className="ml-2 text-sm text-gray-600 dark:text-brand-text-muted">
                            {t('dontShowAgain')}
                        </label>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsWarningModalOpen(false)}
                            className="flex-1 bg-gray-100 dark:bg-brand-surface text-gray-800 dark:text-brand-text-light font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t('cancelRedeem')}
                        </button>
                        <button
                            onClick={() => handleRedeemConfirm()}
                            className="flex-1 bg-brand-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            {pendingAction === 'claim' ? (t('confirmAddToWallet') || 'Confirm') : (t('confirmRedeem') || 'Redeem')}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isRedeemModalOpen}
                onClose={() => setIsRedeemModalOpen(false)}
                title={t('yourCouponCode')}
            >
                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-brand-text-muted mb-4">{t('showThisCodeAtCheckout')}</p>
                    {walletItemInfo ? (
                        <WalletQRCode
                            walletItemId={walletItemInfo.id}
                            redemptionCode={walletItemInfo.redemptionCode}
                            dealTitle={title}
                            size={160}
                        />
                    ) : (
                        <div className="bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 border-2 border-dashed border-brand-primary/30 rounded-xl py-8 px-4 mb-6">
                            <p className="text-4xl font-mono font-bold tracking-widest text-gradient mb-2">{deal.redemptionCode}</p>
                            <p className="text-xs text-gray-500">Legacy code - add to wallet for secure QR</p>
                        </div>
                    )}
                    <button
                        onClick={() => setIsRedeemModalOpen(false)}
                        className="w-full mt-4 bg-gray-100 dark:bg-brand-surface text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-brand-surface/80 transition-colors"
                    >
                        {t('close')}
                    </button>
                </div>
            </Modal>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                shareUrl={shareUrl}
                dealTitle={title}
            />

            <Modal
                isOpen={isTermsModalOpen}
                onClose={() => setIsTermsModalOpen(false)}
                title={t('viewTermsAndConditions')}
            >
                <div className="space-y-4 text-sm text-gray-700 dark:text-brand-text-muted">
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-brand-text-light mb-2">{t('usageLimit')}</h4>
                        <p>{language === 'tr' ? deal.usageLimit_tr : deal.usageLimit}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-brand-text-light mb-2">{t('validity')}</h4>
                        <p>{language === 'tr' ? deal.validity_tr : deal.validity}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-brand-text-light mb-2">{t('generalTerms')}</h4>
                        {deal.termsUrl && !isTermsUrl(deal.termsUrl) && deal.termsUrl !== '#' ? (
                            <p className="whitespace-pre-wrap">{deal.termsUrl}</p>
                        ) : (
                            <ul className="list-disc list-inside space-y-1">
                                <li>{t('termsPoint1')}</li>
                                <li>{t('termsPoint2')}</li>
                                <li>{t('termsPoint3')}</li>
                                <li>{t('termsPoint4')}</li>
                            </ul>
                        )}
                    </div>
                    <button
                        onClick={() => setIsTermsModalOpen(false)}
                        className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all"
                    >
                        {t('close')}
                    </button>
                </div>
            </Modal>

            {/* Limit Reached Modal */}
            <Modal
                isOpen={isLimitModalOpen}
                onClose={() => setIsLimitModalOpen(false)}
                title={t('limitReachedTitle') || 'Limit Reached'}
            >
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {t('monthlyLimitReached') || 'Monthly Limit Reached'}
                    </h3>
                    <p className="text-gray-600 dark:text-brand-text-muted mb-6">
                        {t('upgradePrompt') || 'You have used all your redemptions for this month. Upgrade your plan to unlock more amazing deals!'}
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all"
                        >
                            {t('upgradePlan') || 'Upgrade Plan'}
                        </button>
                        <button
                            onClick={() => setIsLimitModalOpen(false)}
                            className="text-slate-500 hover:text-slate-700 font-medium"
                        >
                            {t('maybeLater') || 'Maybe Later'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Wallet Full Modal */}
            <Modal
                isOpen={isWalletFullModalOpen}
                onClose={() => setIsWalletFullModalOpen(false)}
                title={t('walletLimitReached') || 'Wallet Full'}
            >
                <div className="p-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-gold-500/20 to-gold-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold-500/30">
                        <CustomBriefcaseIcon className="w-10 h-10 text-gold-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {t('walletCapacityFull') || 'Wallet Full!'}
                    </h3>
                    <p className="text-gray-600 dark:text-brand-text-muted mb-2">
                        {t('walletLimitReachedDesc') || 'Please upgrade your plan or remove some deals to add more.'}
                    </p>
                    <p className="text-sm text-gold-400 mb-6">
                        {`${activeDealsCount} / ${getWalletLimit(user?.tier || SubscriptionTier.FREE, user?.walletLimit)} ${language === 'tr' ? 'fırsat cüzdanda' : 'deals in wallet'}`}
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                setIsWalletFullModalOpen(false);
                                navigate('/subscriptions');
                            }}
                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white font-bold py-3 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            {t('walletUpgradePrompt') || 'Upgrade to add more deals'}
                        </button>
                        <button
                            onClick={() => {
                                setIsWalletFullModalOpen(false);
                                navigate('/wallet');
                            }}
                            className="w-full bg-white/10 dark:bg-brand-surface/40 border border-white/20 dark:border-white/10 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/20 dark:hover:bg-brand-surface/60 transition-all"
                        >
                            {language === 'tr' ? 'Cüzdanımı Görüntüle' : 'View My Wallet'}
                        </button>
                        <button
                            onClick={() => setIsWalletFullModalOpen(false)}
                            className="text-gray-500 dark:text-brand-text-muted hover:text-gray-700 dark:hover:text-white font-medium"
                        >
                            {t('maybeLater') || 'Maybe Later'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DealDetailView;
