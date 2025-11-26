import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Deal, SubscriptionTier } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Lock, StarIcon, BookmarkIcon } from './Icons';

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
      <div className="relative overflow-hidden">
        <img
          className="w-full h-56 object-cover transition-transform duration-500 hover:scale-110"
          src={deal.imageUrl}
          alt={title}
        />
        {discount > 0 && !isLocked && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-brand-secondary to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg z-10 animate-zoom">
            {language === 'tr' ? `%${discount}` : `${discount}%`}
          </div>
        )}
        {user && !isLocked && (
          <button
            onClick={handleSaveToggle}
            className="absolute top-3 right-3 glass p-2 rounded-full text-white hover:scale-110 transition-transform z-10"
            aria-label={isSaved ? t('unsaveDealAction') : t('saveDealAction')}
          >
            <BookmarkIcon className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center z-10">
            <Lock className="w-10 h-10 mb-3 text-brand-secondary" />
            <span className="font-semibold text-sm">
              {!user ? t('loginToUnlock') : `${t('lockedDeal')} ${deal.requiredTier} ${t('toUnlock')}`}
            </span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-center text-xs text-brand-text-muted mb-2">
          <span className="font-semibold">{deal.vendor}</span>
          {isLocked && (
            <span
              style={{ backgroundColor: requiredTierColor.bg, color: requiredTierColor.text }}
              className="font-bold py-1 px-2.5 rounded-full"
            >
              {deal.requiredTier}
            </span>
          )}
        </div>
        <h3 className="text-lg font-heading font-bold text-brand-text-light mb-2">{title}</h3>
        <p className="text-brand-text-muted text-sm mb-4 flex-grow line-clamp-2">{description}</p>

        <div className="mt-auto pt-4 border-t border-white/5">
          <StarRating rating={deal.rating} ratingCount={deal.ratingCount} t={t} />
          <div className="flex justify-between items-baseline mt-3">
            <div className="flex items-baseline space-x-2">
              {deal.originalPrice > 0 ? (
                <>
                  <p className="text-2xl font-bold text-gradient">${deal.discountedPrice}</p>
                  <p className="text-sm font-medium text-brand-text-muted line-through">${deal.originalPrice}</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-gradient">{language === 'tr' ? `%${discount}` : `${discount}%`}</p>
              )}
            </div>
            <p className={`text-xs font-semibold ${daysLeftText === t('expired') ? 'text-red-500' : 'text-brand-text-muted'} whitespace-nowrap`}>
              {daysLeftText}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="card overflow-hidden flex flex-col hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-pointer">
      {isLocked ? (
        <div className="flex flex-col flex-grow" onClick={() => !user ? navigate('/login') : navigate('/subscriptions')}>
          <CardContent />
        </div>
      ) : (
        <Link to={`/deals/${deal.id}`} className="flex flex-col flex-grow">
          <CardContent />
        </Link>
      )}
    </div>
  );
};

export default DealCard;