import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHeroImageUrl } from '../lib/imageUtils';
import { checkMonthlyLimit, getWalletItems } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { triggerConfetti } from '../utils/confetti';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { SubscriptionTier, Deal } from '../types';
import { ChevronLeftIcon, ShareIcon, WhatsappIcon, FacebookLogo, TelegramIcon, InstagramIcon, LinkIcon, CheckCircle, PremiumShareIcon, HeartIcon, ClockIcon, LocationMarkerIcon, GlobeIcon, StarIcon, SparklesIcon, CustomBriefcaseIcon } from './Icons';
import Modal from './Modal';
import StarRatingInput from './StarRatingInput';
import WalletQRCode from './WalletQRCode';
import { getWalletLimit, isWalletFull } from '../lib/walletUtils';

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
                            <span className="text-xs font-medium text-gray-700 dark:text-brand-text-muted text-center mt-2">{platform.name}</span>
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
    const { saveDeal, unsaveDeal, isDealSaved, claimDeal, isDealOwned } = useUserActivity();
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

    useEffect(() => {
        if (user) {
            checkMonthlyLimit(user.id)
                .then(result => setRemainingRedemptions(result.remaining))
                .catch(err => console.error('Failed to check limit:', err));

            // Fetch active deals count for wallet capacity check
            supabase
                .from('user_deals')
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
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            setWalletItemInfo({ id: data.id, redemptionCode: data.redemption_code });
                        }
                    });
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
            console.error(`Failed to ${action} deal:`, error);
            // Check for limit error (including the "Could not determine" one as a safe fallback for now)
            if (error.message?.includes('limit') || error.message?.includes('Could not determine')) {
                setIsLimitModalOpen(true);
            } else {
                alert(error.message || 'Action failed');
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

    const userTierLevel = user ? TIER_LEVELS[user.tier] : TIER_LEVELS[SubscriptionTier.NONE];
    const requiredTierLevel = TIER_LEVELS[deal.requiredTier];

    if (!isPreview && userTierLevel < requiredTierLevel && deal.requiredTier !== SubscriptionTier.FREE) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] p-4 text-center">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full backdrop-blur-md shadow-2xl">
                    <h2 className="text-2xl font-serif text-gold-400 mb-4">{t('upgradeToAccess') || 'Upgrade to Access'}</h2>
                    <p className="text-white/60 mb-6">
                        This deal requires <span className="text-gold-300 font-bold">{deal.requiredTier}</span> membership.
                    </p>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all"
                    >
                        {t('upgradeMembership') || 'Upgrade Membership'}
                    </button>
                </div>
            </div>
        );
    }

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
        <div className="bg-[#0f172a] min-h-screen relative pb-40 font-body text-white selection:bg-gold-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-brand-bg/80 to-brand-bg z-0"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[100px] opacity-20"></div>
            </div>

            {/* Header Actions (Absolute) */}
            <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                <button
                    onClick={() => isPreview ? null : navigate(-1)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 group"
                    aria-label="Go back"
                    disabled={isPreview}
                >
                    <ChevronLeftIcon className="h-6 w-6 text-white group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex gap-4">
                    <button
                        onClick={handleShare}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 hover:scale-105 transition-all duration-300 text-white"
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
                            ? 'bg-gradient-to-br from-red-600 to-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            }`}
                    >
                        <HeartIcon className={`h-6 w-6 ${isDealSaved(deal.id) ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Hero Image */}
            <div className="relative h-[45vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent z-10"></div>
                <img
                    src={getHeroImageUrl(deal.imageUrl)}
                    alt={title}
                    className="w-full h-full object-cover transform scale-105"
                />
            </div>

            {/* Floating Content Card */}
            <div className="relative z-20 -mt-16 px-4 max-w-4xl mx-auto">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-8 relative overflow-hidden">
                    {/* Top Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gold-500/50 blur-lg rounded-full"></div>

                    {/* Brand & Title Header */}
                    <div className="flex items-start gap-5 mb-8">
                        <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-[#0f172a] shadow-lg p-1 border border-gold-500/30 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            {deal.companyLogoUrl ? (
                                <img src={deal.companyLogoUrl} alt={deal.vendor} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gold-400 font-bold text-3xl font-heading">
                                    {deal.vendor.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 pt-1">
                            <h2 className="text-3xl font-heading font-bold text-white leading-tight mb-2 drop-shadow-lg">{title}</h2>
                            <p className="text-lg text-gold-200/80 font-medium tracking-wide">{deal.vendor}</p>

                            {/* Rating */}
                            <div className="flex items-center mt-2 gap-2">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <StarIcon key={star} className={`w-4 h-4 ${star <= deal.rating ? 'text-gold-400 fill-current' : 'text-gray-600'}`} />
                                    ))}
                                </div>
                                <span className="text-white/40 text-sm">({deal.ratingCount} {t('ratings')})</span>
                            </div>
                        </div>
                    </div>

                    {/* Days Left Badge */}
                    {daysLeft !== null && (
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8 shadow-inner">
                            <ClockIcon className="w-4 h-4 text-gold-400 animate-pulse" />
                            <span className="text-gold-100 font-medium text-sm tracking-wide">
                                {daysLeft} {t('daysLeft')}
                            </span>
                        </div>
                    )}

                    {/* Stock Status Badges */}
                    {(deal.isSoldOut || (deal.maxRedemptionsTotal && (deal.redemptionsCount || 0) >= deal.maxRedemptionsTotal)) ? (
                        <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-full mb-8 ml-3 shadow-inner">
                            <span className="text-red-200 font-bold text-sm tracking-wide uppercase">
                                {t('soldOut') || 'Sold Out'}
                            </span>
                        </div>
                    ) : (deal.maxRedemptionsTotal && (deal.maxRedemptionsTotal - (deal.redemptionsCount || 0) <= 10)) && (
                        <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 px-4 py-2 rounded-full mb-8 ml-3 shadow-inner animate-pulse">
                            <span className="text-orange-200 font-bold text-sm tracking-wide">
                                🔥 {t('hurryOnly') || 'Hurry! Only'} {deal.maxRedemptionsTotal - (deal.redemptionsCount || 0)} {t('left') || 'Left!'}
                            </span>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex border-b border-white/10 mb-8 relative">
                        {/* Active Tab Indicator Background (Optional Animation could be added here) */}
                        <button
                            onClick={() => setActiveTab('conditions')}
                            className={`flex-1 pb-4 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'conditions'
                                ? 'text-gold-400'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            {t('campaignConditions')}
                            {activeTab === 'conditions' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent shadow-[0_0_10px_rgba(212,175,55,0.7)]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('locations')}
                            className={`flex-1 pb-4 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'locations'
                                ? 'text-gold-400'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            {t('validLocations')}
                            {activeTab === 'locations' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent shadow-[0_0_10px_rgba(212,175,55,0.7)]"></div>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="animate-fade-in min-h-[200px]">
                        {activeTab === 'conditions' ? (
                            <div className="space-y-6">
                                <div className="prose prose-invert max-w-none text-white/80 leading-relaxed font-light text-lg">
                                    <p>{description}</p>
                                </div>

                                {/* Terms Link */}
                                {deal.termsUrl && (
                                    <div className="pt-6 border-t border-white/10">
                                        <a
                                            href={deal.termsUrl || '#'}
                                            onClick={handleTermsClick}
                                            className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 font-semibold text-sm transition-colors group"
                                        >
                                            <LinkIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                            {t('viewTermsAndConditions')}
                                        </a>
                                    </div>
                                )}

                                {/* Rating Section */}
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <h3 className="text-sm font-semibold text-white/90 mb-4 uppercase tracking-wider">{t('rateThisDeal')}</h3>
                                    <div className="flex justify-center bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <StarRatingInput
                                            onRate={handleRate}
                                            disabled={isPreview || !user || (user && !user.redemptions?.some(r => r.dealId === deal.id))}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-64">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                                        <LocationMarkerIcon className="w-8 h-8 text-gold-400" />
                                    </div>
                                    <p className="text-white/70 font-light text-lg">
                                        {deal.latitude && deal.longitude
                                            ? "View location on map"
                                            : (t('validAtAllLocations') || "Valid at all branch locations.")}
                                    </p>
                                    {deal.latitude && deal.longitude && (
                                        <button
                                            onClick={() => window.open(`https://maps.google.com/?q=${deal.latitude},${deal.longitude}`, '_blank')}
                                            className="mt-6 px-6 py-2 rounded-full border border-gold-500/30 text-gold-400 text-sm font-bold hover:bg-gold-500/10 transition-colors"
                                        >
                                            Open in Maps
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                        {t('contactInfo') || 'Contact Information'}
                                    </h4>
                                    {deal.companyWebsiteUrl && (
                                        <div className="flex items-center gap-4 text-white/70 hover:text-white transition-colors group cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-gold-500/30 transition-colors">
                                                <GlobeIcon className="w-5 h-5 text-white/50 group-hover:text-gold-400 transition-colors" />
                                            </div>
                                            <a href={deal.companyWebsiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium">Visit Website</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Bar - Static (In Flow) */}
            <div className="relative z-30 mt-8 px-4 max-w-4xl mx-auto mb-8">
                <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between gap-4">
                        <div className="hidden md:flex flex-col">
                            <span className="text-white/40 text-xs line-through">{originalPriceFormatted}</span>
                            <div className="text-2xl font-bold bg-gradient-to-r from-gold-300 via-gold-500 to-gold-400 bg-clip-text text-transparent">
                                {discountedPriceFormatted}
                            </div>
                        </div>

                        <div className="flex-1 flex gap-3">
                            {/* Sold Out State */}
                            {(deal.isSoldOut || (deal.maxRedemptionsTotal && (deal.redemptionsCount || 0) >= deal.maxRedemptionsTotal)) ? (
                                <div className="flex-1 bg-gray-600 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-80">
                                    <span>{t('soldOut') || 'Sold Out'}</span>
                                </div>
                            ) : (
                                <>
                                    {/* Add to Wallet Button */}
                                    {!isDealOwned(deal.id) && (
                                        <button
                                            onClick={() => handleActionClick('claim')}
                                            className="flex-1 bg-white/10 border border-white/20 text-white font-bold py-4 px-4 rounded-xl hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                                        >
                                            <span>{t('addToWallet') || 'Add to Wallet'}</span>
                                        </button>
                                    )}

                                    {/* Redeem Now Button */}
                                    <button
                                        onClick={() => isPreview ? null : handleActionClick('redeem')}
                                        className={`flex-1 ${isDealOwned(deal.id) ? 'w-full' : ''
                                            } bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wider text-lg cursor-pointer`}
                                    >
                                        <span>{t('redeemNow') || 'Redeem Now'}</span>
                                    </button>
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
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
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
                            className="text-gray-500 dark:text-brand-text-muted hover:text-gray-700 dark:hover:text-white font-medium"
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
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
                            className="w-full bg-white/10 border border-white/20 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/20 transition-all"
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
