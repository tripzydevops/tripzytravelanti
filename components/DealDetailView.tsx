import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHeroImageUrl } from '../lib/imageUtils';
import { triggerConfetti } from '../utils/confetti';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionTier, Deal } from '../types';
import { ChevronLeftIcon, ShareIcon, WhatsappIcon, FacebookLogo, TelegramIcon, InstagramIcon, LinkIcon, CheckCircle, PremiumShareIcon } from './Icons';
import Modal from './Modal';
import StarRatingInput from './StarRatingInput';
import QRCode from 'react-qr-code';

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
    const navigate = useNavigate();

    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [hasRated, setHasRated] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);

    const handleRedeemConfirm = async (dontShowAgain: boolean) => {
        if (deal && onRedeem) {
            try {
                await onRedeem(deal.id);
                setIsWarningModalOpen(false);
                setIsRedeemModalOpen(true);
                setTimeout(() => triggerConfetti('burst'), 300);
            } catch (error) {
                console.error('Failed to redeem deal:', error);
            }
        } else if (isPreview) {
            setIsWarningModalOpen(false);
            setIsRedeemModalOpen(true);
            setTimeout(() => triggerConfetti('burst'), 300);
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
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-brand-bg p-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('upgradeToAccess') || 'Upgrade to Access'}</h2>
                <p className="text-gray-600 dark:text-brand-text-muted mb-6 text-center">
                    This deal requires {deal.requiredTier} membership.
                </p>
                <button
                    onClick={() => navigate('/profile')}
                    className="bg-brand-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    {t('upgradeMembership') || 'Upgrade Membership'}
                </button>
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

    return (
        <div className="bg-white dark:bg-brand-bg min-h-screen relative">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-brand-bg/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
                <div className="mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => isPreview ? null : navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300 text-gray-700 dark:text-brand-text-light"
                        aria-label="Go back"
                        disabled={isPreview}
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleShare}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300"
                        aria-label={t('shareDeal')}
                    >
                        <PremiumShareIcon className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="animate-fade-in pb-24">
                {/* Hero Image */}
                <div className="relative h-64 md:h-96 w-full overflow-hidden bg-gray-900">
                    <div
                        className="absolute inset-0 bg-cover bg-center blur-xl opacity-60 scale-110 transition-transform duration-700"
                        style={{ backgroundImage: `url(${getHeroImageUrl(deal.imageUrl)})` }}
                    ></div>
                    <img
                        src={getHeroImageUrl(deal.imageUrl)}
                        alt={title}
                        className="relative w-full h-full object-contain z-10 shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/20 to-transparent z-20"></div>
                </div>

                <div className="container mx-auto px-4 py-6">
                    {/* Brand Logo and Title Section */}
                    <div className="flex items-start gap-4 mb-6">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg overflow-hidden">
                            {deal.companyLogoUrl ? (
                                <img src={deal.companyLogoUrl} alt={deal.vendor} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-white">{deal.vendor.charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-brand-text-light mb-1">{title}</h2>
                            <p className="text-sm text-gray-600 dark:text-brand-text-muted">{deal.vendor}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <p className={`text-gray-700 dark:text-brand-text-muted leading-relaxed ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                            {description}
                        </p>
                        {description.length > 150 && (
                            <button
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                className="text-brand-primary hover:text-brand-secondary font-medium text-sm mt-2"
                            >
                                {showFullDescription ? t('readLess') : t('readMore')}
                            </button>
                        )}
                    </div>

                    {/* Offer Details */}
                    <div className="bg-gray-50 dark:bg-brand-surface rounded-xl p-4 mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-brand-text-light mb-3">{t('offerDetails')}</h3>
                        <div className="space-y-3">
                            {(deal.discountPercentage || deal.originalPrice > 0) && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-brand-text-muted">{t('discount')}</span>
                                    <span className="text-lg font-bold text-brand-primary">
                                        {deal.discountPercentage
                                            ? (language === 'tr' ? `%${deal.discountPercentage}` : `${deal.discountPercentage}%`)
                                            : `$${deal.originalPrice - deal.discountedPrice}`}
                                    </span>
                                </div>
                            )}
                            {(deal.usageLimit || deal.usageLimit_tr) && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-brand-text-muted">{t('usageLimit')}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-brand-text-light">
                                        {language === 'tr' ? deal.usageLimit_tr : deal.usageLimit}
                                    </span>
                                </div>
                            )}
                            {(deal.validity || deal.validity_tr) && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-brand-text-muted">{t('validity')}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-brand-text-light">
                                        {language === 'tr' ? deal.validity_tr : deal.validity}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rating Section */}
                    <div className="bg-white dark:bg-brand-surface border border-gray-100 dark:border-white/5 rounded-xl p-6 mb-6 shadow-sm text-center">
                        {hasRated ? (
                            <div className="animate-fade-in">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                <p className="text-brand-text-light font-medium">{t('ratingSubmittedSuccess')}</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-brand-text-light mb-4">{t('rateThisDeal')}</h3>
                                <StarRatingInput
                                    onRate={handleRate}
                                    disabled={isPreview || !user || (user && !user.redemptions?.some(r => r.dealId === deal.id))}
                                />
                                {isPreview ? (
                                    <p className="text-xs text-brand-text-muted mt-2">Preview Mode: Rating disabled</p>
                                ) : !user ? (
                                    <p className="text-xs text-brand-text-muted mt-2">{t('loginToUnlock')}</p>
                                ) : user && !user.redemptions?.some(r => r.dealId === deal.id) ? (
                                    <p className="text-xs text-brand-text-muted mt-2">{t('redeemToRate')}</p>
                                ) : null}
                            </>
                        )}
                    </div>

                    {/* Share Button */}
                    <div className="flex justify-center mb-6">
                        <button
                            onClick={handleShare}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <ShareIcon className="w-5 h-5" />
                            {t('shareDeal')}
                        </button>
                    </div>

                    {/* Terms Link */}
                    <div className="mb-6">
                        <a
                            href={deal.termsUrl || '#'}
                            onClick={handleTermsClick}
                            className="text-brand-primary hover:text-brand-secondary text-sm font-medium underline cursor-pointer"
                        >
                            {t('viewTermsAndConditions')}
                        </a>
                    </div>
                </div>
            </main>

            {/* Sticky Use Coupon Button Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-brand-bg border-t border-gray-200 dark:border-white/10 p-4 z-10">
                {deal.redemptionStyle && deal.redemptionStyle.length > 0 && (
                    <div className="flex justify-center gap-3 mb-2">
                        {deal.redemptionStyle.includes('online') && (
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                🌐 Redeem Online
                            </span>
                        )}
                        {deal.redemptionStyle.includes('in_store') && (
                            <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                🏪 Redeem In-Store
                            </span>
                        )}
                    </div>
                )}
                <button
                    onClick={() => {
                        if (isPreview) {
                            handleRedeemConfirm(false);
                        } else if (!user) {
                            navigate('/login');
                        } else {
                            const dontShowAgain = localStorage.getItem('dontShowRedemptionWarning') === 'true';
                            if (dontShowAgain) {
                                handleRedeemConfirm(false);
                            } else {
                                setIsWarningModalOpen(true);
                            }
                        }
                    }}
                    className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                    {t('useCoupon')}
                </button>
            </footer>

            {/* Warning Modal */}
            <Modal
                isOpen={isWarningModalOpen}
                onClose={() => setIsWarningModalOpen(false)}
                title={t('redemptionWarningTitle')}
            >
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
                            onClick={() => handleRedeemConfirm(localStorage.getItem('dontShowRedemptionWarning') === 'true')}
                            className="flex-1 bg-brand-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            {t('confirmRedeem')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Redeem Modal (Coupon Code) */}
            <Modal
                isOpen={isRedeemModalOpen}
                onClose={() => setIsRedeemModalOpen(false)}
                title={t('yourCouponCode')}
            >
                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-brand-text-muted mb-4">{t('showThisCodeAtCheckout')}</p>
                    <div className="bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 border-2 border-dashed border-brand-primary/30 rounded-xl py-8 px-4 mb-6">
                        <p className="text-4xl font-mono font-bold tracking-widest text-gradient mb-2">{deal.redemptionCode}</p>
                        <div className="flex justify-center my-4 p-4 bg-white rounded-xl">
                            <QRCode value={deal.redemptionCode} size={128} />
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(deal.redemptionCode);
                            }}
                            className="text-sm text-brand-primary hover:text-brand-secondary font-medium mt-2"
                        >
                            {t('copyCode')}
                        </button>
                    </div>
                    <button
                        onClick={() => setIsRedeemModalOpen(false)}
                        className="w-full bg-gray-100 dark:bg-brand-surface text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-brand-surface/80 transition-colors"
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

            {/* Terms and Conditions Modal */}
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
        </div>
    );
};

export default DealDetailView;
