import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeals } from '../contexts/DealContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { SubscriptionTier } from '../types';
import { ChevronLeftIcon, ShareIcon, WhatsappIcon, FacebookLogo, TelegramIcon, InstagramIcon } from '../components/Icons';
import Modal from '../components/Modal';

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
  const [showInstagramHint, setShowInstagramHint] = useState(false);

  const handleInstagramShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowInstagramHint(true);
      setTimeout(() => setShowInstagramHint(false), 3000);
      window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
    });
  };

  const socialPlatforms = [
    { name: 'Facebook', icon: <FacebookLogo className="w-8 h-8 text-[#1877F2]" />, action: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, isLink: true },
    { name: 'WhatsApp', icon: <WhatsappIcon className="w-8 h-8 text-[#25D366]" />, action: `https://api.whatsapp.com/send?text=${encodeURIComponent(dealTitle + '\n' + shareUrl)}`, isLink: true },
    { name: 'Telegram', icon: <TelegramIcon className="w-8 h-8 text-[#0088cc]" />, action: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(dealTitle)}`, isLink: true },
    { name: 'Instagram', icon: <InstagramIcon className="w-8 h-8" />, action: handleInstagramShare, isLink: false },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('shareDeal')}>
      <div className="flex flex-wrap justify-center gap-4">
        {socialPlatforms.map(platform => {
          if (platform.isLink) {
            return (
              <a
                key={platform.name}
                href={platform.action as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 text-center text-brand-text-muted hover:opacity-80 transition-opacity w-20"
              >
                <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center hover:scale-110 transition-transform">
                  {platform.icon}
                </div>
                <span className="text-xs font-medium">{platform.name}</span>
              </a>
            );
          }
          return (
            <button
              key={platform.name}
              onClick={platform.action as () => void}
              className="flex flex-col items-center gap-2 text-center text-brand-text-muted hover:opacity-80 transition-opacity w-20"
            >
              <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center hover:scale-110 transition-transform">
                {platform.icon}
              </div>
              <span className="text-xs font-medium">{platform.name}</span>
            </button>
          )
        })}
      </div>
      {showInstagramHint && (
        <p className="text-center text-sm text-brand-text-muted mt-4">
          {t('instagramShareHint')}
        </p>
      )}
    </Modal>
  );
};


// --- Deal Detail Page Component ---
const DealDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getDealById } = useDeals();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setChatbotVisible } = useLayout();
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  useEffect(() => {
    setChatbotVisible(false);
    return () => {
      setChatbotVisible(true);
    };
  }, [setChatbotVisible]);

  const deal = useMemo(() => id ? getDealById(id) : undefined, [id, getDealById]);

  const shareUrl = useMemo(() => {
    if (!id) return '';
    const cleanPathname = window.location.pathname.replace(/index\.html$/, '');
    return `${window.location.origin}${cleanPathname}#/deals/${id}`;
  }, [id]);

  if (!id || !deal) {
    useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

  const userTierLevel = user ? TIER_LEVELS[user.tier] : TIER_LEVELS[SubscriptionTier.NONE];
  const requiredTierLevel = TIER_LEVELS[deal.requiredTier];

  useEffect(() => {
    if (userTierLevel < requiredTierLevel) {
      navigate('/');
    }
  }, [userTierLevel, requiredTierLevel, navigate]);

  if (userTierLevel < requiredTierLevel) {
    return null;
  }

  const title = language === 'tr' ? deal.title_tr : deal.title;
  const description = language === 'tr' ? deal.description_tr : deal.description;

  const dealInfo = [
    { label: t('usageLimit'), value: language === 'tr' ? deal.usageLimit_tr : deal.usageLimit },
    { label: t('validity'), value: language === 'tr' ? deal.validity_tr : deal.validity },
    { label: t('terms'), value: <a href={deal.termsUrl} className="text-brand-primary underline hover:text-brand-secondary transition-colors">{t('seeFullTerms')}</a> },
  ];

  const handleShare = async () => {
    const shareData = {
      title,
      text: description,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('Web Share API failed:', error);
      }
    }

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

  const [showFullDescription, setShowFullDescription] = useState(false);

  return (
    <div className="bg-white dark:bg-brand-bg min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-brand-bg border-b border-gray-200 dark:border-white/10">
        <div className="mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900 dark:text-brand-text-light hover:scale-110 transition-transform" aria-label="Go back">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button onClick={handleShare} className="p-2 -mr-2 text-gray-900 dark:text-brand-text-light hover:scale-110 transition-transform" aria-label={t('shareDeal')}>
            <ShareIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="animate-fade-in pb-24">
        {/* Hero Image */}
        <div className="relative h-64 overflow-hidden">
          <img
            src={deal.imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Brand Logo and Title Section */}
          <div className="flex items-start gap-4 mb-6">
            {/* Brand Logo Circle */}
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">{deal.vendor.charAt(0)}</span>
            </div>

            {/* Title and Vendor */}
            <div className="flex-1">
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-brand-text-light mb-1">{title}</h2>
              <p className="text-sm text-gray-600 dark:text-brand-text-muted">{deal.vendor}</p>
            </div>
          </div>

          {/* Description with Read More */}
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
              {/* Discount */}
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

              {/* Usage Limit */}
              {(deal.usageLimit || deal.usageLimit_tr) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-brand-text-muted">{t('usageLimit')}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-brand-text-light">
                    {language === 'tr' ? deal.usageLimit_tr : deal.usageLimit}
                  </span>
                </div>
              )}

              {/* Validity */}
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

          {/* Share Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-brand-primary font-medium hover:text-brand-secondary transition-colors py-2 px-4 rounded-full bg-brand-primary/5 hover:bg-brand-primary/10"
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
        <button
          onClick={() => setIsRedeemModalOpen(true)}
          className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        >
          {t('useCoupon')}
        </button>
      </footer>

      {/* Redeem Modal */}
      <Modal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        title={t('yourCouponCode')}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-brand-text-muted mb-4">{t('showThisCodeAtCheckout')}</p>
          <div className="bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 border-2 border-dashed border-brand-primary/30 rounded-xl py-8 px-4 mb-6">
            <p className="text-4xl font-mono font-bold tracking-widest text-gradient mb-2">{deal.redemptionCode}</p>
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

export default DealDetailPage;