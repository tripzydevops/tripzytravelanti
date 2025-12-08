import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Deal, SubscriptionTier } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Lock, StarIcon, BookmarkIcon } from './Icons';
import { getThumbnailUrl } from '../lib/imageUtils';

interface DealCardProps {
  deal: Deal;
}

const TIER_LEVELS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.NONE]: 0,
  [SubscriptionTier.FREE]: 1,
  [SubscriptionTier.BASIC]: 2,
  [SubscriptionTier.PREMIUM]: 3,
  [SubscriptionTier.VIP]: 4,
};

const StarRating: React.FC<{ rating: number; ratingCount: number; t: (key: string) => string }> = ({ rating, ratingCount, t }) => {
  if (ratingCount === 0) {
    return <p className="text-sm text-brand-text-muted">{t('noRatingsYet')}</p>;
  }

  const fullStars = Math.floor(rating);

  return (
    <div className="flex items-center">
      <div className="flex items-center mr-2">
        {[...Array(fullStars)].map((_, i) => <StarIcon key={`full-${i}`} className="w-4 h-4 text-yellow-400" fill="currentColor" />)}
        {[...Array(5 - fullStars)].map((_, i) => <StarIcon key={`empty-${i}`} className="w-4 h-4 text-yellow-400" />)}
      </div>
      <span className="text-sm text-brand-text-muted">
        {rating.toFixed(1)} ({ratingCount})
      </span>
    </div>
  );
};

const DealCard: React.FC<DealCardProps> = ({ deal }) => {
  const { user, saveDealForUser, unsaveDealForUser } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const userTierLevel = user ? TIER_LEVELS[user.tier] : TIER_LEVELS[SubscriptionTier.NONE];
  const requiredTierLevel = TIER_LEVELS[deal.requiredTier];

  // Logic update: Guests see FREE tier deals as unlocked, but others as locked.
  let isLocked = userTierLevel < requiredTierLevel;
  if (!user && deal.requiredTier === SubscriptionTier.FREE) {
    isLocked = false;
  }

  const isSaved = user?.savedDeals?.includes(deal.id) ?? false;

  const title = language === 'tr' ? deal.title_tr : deal.title;
  const description = language === 'tr' ? deal.description_tr : deal.description;
  const discount = deal.discountPercentage && deal.discountPercentage > 0
    ? deal.discountPercentage
    : (deal.originalPrice > 0 ? Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100) : 0);

  const calculateDaysLeft = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);

    if (expiry.getFullYear() > now.getFullYear() + 50) {
      return t('neverExpires');
    }

    expiry.setHours(23, 59, 59, 999);
    const diffTime = expiry.getTime() - now.getTime();
    if (diffTime <= 0) return t('expired');
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${t('expiresIn')} ${diffDays} ${diffDays > 1 ? t('days') : t('daySingular')}`;
  };

  const daysLeftText = calculateDaysLeft(deal.expiresAt);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (isSaved) {
      unsaveDealForUser(deal.id);
    } else {
      saveDealForUser(deal.id);
    }
  };

  const tierColors: Record<SubscriptionTier, { bg: string, text: string }> = {
    [SubscriptionTier.BASIC]: { bg: 'rgba(99, 102, 241, 0.2)', text: '#6366F1' },
    [SubscriptionTier.PREMIUM]: { bg: 'rgba(244, 114, 182, 0.2)', text: '#F472B6' },
    [SubscriptionTier.VIP]: { bg: 'rgba(251, 191, 36, 0.2)', text: '#FBBF24' },
    [SubscriptionTier.FREE]: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94A3B8' },
    [SubscriptionTier.NONE]: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94A3B8' },
  };
  const requiredTierColor = tierColors[deal.requiredTier] || tierColors.FREE;

  const CardContent = () => (
    <>
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60 z-10"></div>
        <img
          className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-110"
          src={getThumbnailUrl(deal.imageUrl)}
          alt={title}
        />
        {discount > 0 && !isLocked && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg z-20 border border-white/10 backdrop-blur-sm">
            {language === 'tr' ? `%${discount} ${t('off') || 'İNDİRİM'}` : `${discount}% OFF`}
          </div>
        )}
        {user && !isLocked && (
          <button
            onClick={handleSaveToggle}
            className="absolute top-3 right-3 bg-white/10 hover:bg-gold-500/20 backdrop-blur-md p-2 rounded-full text-white hover:text-gold-400 border border-white/20 transition-all z-20 group/btn"
            aria-label={isSaved ? t('unsaveDealAction') : t('saveDealAction')}
          >
            <BookmarkIcon className={`w-5 h-5 transition-colors ${isSaved ? 'text-gold-500 fill-current' : 'text-white group-hover/btn:text-gold-400'}`} />
          </button>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4 text-center z-20 border-b border-white/10">
            <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-3 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <Lock className="w-8 h-8 text-gold-500" />
            </div>
            <span className="font-bold text-sm tracking-wide text-gold-200">
              {!user ? t('loginToUnlock') : `${t('lockedDeal')} ${deal.requiredTier} ${t('toUnlock')}`}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow relative bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex justify-between items-center text-xs mb-3">
          <div className="flex items-center gap-2">
            {deal.companyLogoUrl ? (
              <img src={deal.companyLogoUrl} alt={deal.vendor} className="w-6 h-6 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                {deal.vendor.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-white/90 tracking-wide">{deal.vendor}</span>
          </div>
          <div className="flex gap-2">
            {isLocked && (
              <span
                className="font-bold py-0.5 px-2 rounded-md text-[10px] uppercase tracking-wider border border-white/10 shadow-sm"
                style={{ backgroundColor: requiredTierColor.bg, color: requiredTierColor.text }}
              >
                {deal.requiredTier}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-heading font-bold text-white mb-2 leading-tight group-hover:text-gold-400 transition-colors">{title}</h3>
        <p className="text-white/60 text-sm mb-4 flex-grow line-clamp-2">{description}</p>

        <div className="mt-auto pt-4 border-t border-white/20">
          <div className="flex justify-between items-center mb-2">
            <StarRating rating={deal.rating} ratingCount={deal.ratingCount} t={t} />
            {deal.redemptionStyle && deal.redemptionStyle.length > 0 && (
              <div className="flex gap-2 text-white/50 text-xs">
                {deal.redemptionStyle.includes('online') && <span title="Online">🌐</span>}
                {deal.redemptionStyle.includes('in_store') && <span title="In-Store">🏪</span>}
              </div>
            )}
          </div>

          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              {deal.originalPrice > 0 && <span className="text-xs text-white/40 line-through mb-0.5">${deal.originalPrice}</span>}
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-500 to-gold-400 shadow-sm">
                {deal.originalPrice > 0 ? `$${deal.discountedPrice}` : (language === 'tr' ? `%${discount}` : `${discount}%`)}
              </div>
            </div>
            <p className={`text-xs font-semibold ${daysLeftText === t('expired') ? 'text-red-400' : 'text-emerald-400'} bg-white/5 px-2 py-1 rounded-md border border-white/5`}>
              {daysLeftText}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-gold-500/50 group">
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/0 via-gold-500/0 to-gold-500/0 group-hover:from-gold-500/5 group-hover:to-purple-500/5 transition-all duration-500 pointer-events-none"></div>

      {isLocked ? (
        <div className="flex flex-col flex-grow cursor-pointer" onClick={() => !user ? navigate('/login') : navigate('/subscriptions')}>
          <CardContent />
        </div>
      ) : (
        <Link to={`/deals/${deal.id}`} className="flex flex-col flex-grow cursor-pointer">
          <CardContent />
        </Link>
      )}
    </div>
  );
};

export default DealCard;