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
  const { setAdBannerVisible, setChatbotVisible } = useLayout();
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    setAdBannerVisible(false);
    setChatbotVisible(false);
    return () => {
      setAdBannerVisible(true);
      setChatbotVisible(true);
    };
  }, [setAdBannerVisible, setChatbotVisible]);

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

  return (
    <div className="bg-brand-bg text-white min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-white/10">
        <div className="mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-brand-text-light hover:scale-110 transition-transform" aria-label="Go back">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-heading font-semibold text-brand-text-light absolute left-1/2 -translate-x-1/2 truncate max-w-[60vw]">
            {t('dealDetailsTitle')}
          </h1>
          <button onClick={handleShare} className="p-2 -mr-2 text-brand-text-light hover:scale-110 transition-transform" aria-label={t('shareDeal')}>
            <ShareIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="animate-fade-in">
        {/* Hero Image */}
        <div className="relative h-80 overflow-hidden">
          <img
            src={deal.imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 -mt-8 relative z-10">
          {/* Title Card */}
          <div className="card mb-6 animate-slide-up">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-3xl font-heading font-bold text-brand-text-light flex-1">{title}</h2>
              {deal.rating && (
                <div className="ml-4 flex items-center gap-1 bg-brand-primary/20 px-3 py-1 rounded-lg">
                  <span className="text-yellow-400">★</span>
                  <span className="font-semibold">{deal.rating}</span>
                </div>
              )}
            </div>
            <p className="text-base text-brand-text-muted leading-relaxed">{description}</p>
          </div>

          {/* Deal Information Card */}
          <div className="card">
            <h3 className="text-xl font-heading font-bold text-brand-text-light mb-4">{t('dealInformation')}</h3>
            <div className="space-y-4">
              {dealInfo.map((item, index) => (
                <div key={item.label} className={`flex justify-between items-start gap-4 ${index < dealInfo.length - 1 ? 'pb-4 border-b border-white/5' : ''}`}>
                  <span className="text-brand-text-muted text-sm">{item.label}</span>
                  <span className="font-semibold text-right text-brand-text-light text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Redeem Button Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-brand-bg/95 backdrop-blur-lg p-4 z-10 border-t border-white/10">
        <button
          onClick={() => setIsRedeemModalOpen(true)}
          className="btn-primary w-full text-lg shadow-2xl shadow-brand-primary/50"
        >
          {t('redeem')}
        </button>
      </footer>

      <Modal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        title={t('redeemDealTitle')}
      >
        <div className="text-center">
          <p className="text-sm text-brand-text-muted mb-4">{t('yourRedemptionCode')}</p>
          <div className="bg-brand-surface border-2 border-dashed border-brand-primary/30 rounded-xl py-6 px-4 mb-6">
            <p className="text-4xl font-mono font-bold tracking-widest text-gradient">{deal.redemptionCode}</p>
          </div>
          <button onClick={() => setIsRedeemModalOpen(false)} className="btn-primary w-full">
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

    </div>
  );
};

export default DealDetailPage;