import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Deal, SubscriptionTier } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Lock, StarIcon, HeartIcon, LocationMarkerIcon as LocationIcon, CheckCircle } from './Icons';
import { getThumbnailUrl } from '../lib/imageUtils';
import { logEngagementEvent } from '../lib/supabaseService';

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
  const { user } = useAuth();
  const { saveDeal, unsaveDeal, isDealSaved } = useUserActivity();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const userTierLevel = user ? TIER_LEVELS[user.tier] : TIER_LEVELS[SubscriptionTier.NONE];
  const requiredTierLevel = TIER_LEVELS[deal.requiredTier];

  // Logic update: Guests see FREE tier deals as unlocked, but others as locked.
  let isLocked = userTierLevel < requiredTierLevel;
  if (!user && deal.requiredTier === SubscriptionTier.FREE) {
    isLocked = false;
  }

  const isSaved = isDealSaved(deal.id);

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

  // Check if deal is "new" (created within last 48 hours)
  const isNewDeal = React.useMemo(() => {
    if (!deal.createdAt) return false;
    const createdDate = new Date(deal.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  }, [deal.createdAt]);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (isSaved) {
      unsaveDeal(deal.id);
    } else {
      saveDeal(deal.id);
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
      {/* Image Container with refined aspects */}
      <div className="relative aspect-[16/10] overflow-hidden group/img">
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
        <img
          className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
          src={getThumbnailUrl(deal.imageUrl)}
          alt={title}
          loading="lazy"
        />
        {/* Animated Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out z-10 pointer-events-none"></div>

        {/* Floating Heart Button (Top Right) - Industry Standard */}
        {user && !isLocked && (
          <button
            onClick={handleSaveToggle}
            className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/40 transition-all duration-300 group/heart active:scale-90"
            aria-label={isSaved ? t('unsaveDealAction') : t('saveDealAction')}
          >
            <HeartIcon
              className={`w-5 h-5 transition-all duration-500 ${isSaved
                ? 'text-red-500 fill-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                : 'text-white group-hover/heart:scale-110 group-hover/heart:text-red-400'
                }`}
            />
          </button>
        )}

        {/* Dynamic Badges (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5 items-start">
          {discount > 0 && !isLocked && (
            <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xl tracking-tighter uppercase whitespace-nowrap">
              {language === 'tr' ? `%${discount} İNDİRİM` : `${discount}% OFF`}
            </div>
          )}
          {isNewDeal && !isLocked && (
            <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xl tracking-tighter uppercase whitespace-nowrap">
              {language === 'tr' ? 'YENİ' : 'NEW'}
            </div>
          )}
          {/* Popular Badge for well-rated deals */}
          {deal.ratingCount > 20 && !isLocked && (
            <div className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xl tracking-tighter uppercase whitespace-nowrap flex items-center gap-1">
              <StarIcon className="w-2.5 h-2.5 fill-current" />
              {t('popular')}
            </div>
          )}
        </div>

        {/* Premium Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 text-center z-20">
            <div className="mb-3 transform scale-90 p-3 rounded-full bg-gold-500/20 border border-gold-500/30">
              <Lock className="w-6 h-6 text-gold-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-400 mb-1">
              Member Exclusive
            </span>
            <span className="text-[11px] font-medium text-white/80 max-w-[150px]">
              {!user ? t('loginToUnlock') : `${deal.requiredTier} ${t('toUnlock')}`}
            </span>
          </div>
        )}

        {/* Sold Out Badge */}
        {!isLocked && deal.isSoldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
            <span className="border-2 border-white/30 text-white font-black text-xl px-4 py-1 rounded tracking-widest uppercase">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="p-4 flex flex-col gap-3">
        {/* Vendor Header */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
            {deal.companyLogoUrl ? (
              <img src={deal.companyLogoUrl} alt={deal.vendor} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gold-500/10 flex items-center justify-center text-[8px] font-bold text-gold-500 uppercase">
                {deal.vendor.substring(0, 1)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-1 min-w-0 truncate w-full">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-tight truncate">{deal.vendor}</span>
              <CheckCircle className="w-3 h-3 text-gold-400 shrink-0" />
            </div>
            {deal.storeLocations && deal.storeLocations.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5 opacity-60 dark:opacity-40 shrink-0">
                <LocationIcon className="w-2.5 h-2.5 text-slate-400 dark:text-white" />
                <span className="text-[9px] font-medium text-slate-400 dark:text-white leading-none whitespace-nowrap">{deal.storeLocations[0].city || deal.storeLocations[0].name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="font-heading font-bold text-[16px] text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-gold-500 transition-colors">
            {language === 'tr' ? deal.title_tr || deal.title : deal.title}
          </h3>
        </div>

        {/* Rating & Expiry info row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
          <div className="flex flex-col gap-0.5">
            <div className={`flex items-baseline gap-1.5 ${discount >= 50 && !isLocked ? 'animate-pulse-subtle' : ''}`}>
              <span className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
                {deal.originalPrice > 0 ? `₺${deal.discountedPrice.toLocaleString()}` : `%${discount}`}
              </span>
              {deal.originalPrice > 0 && (
                <span className="text-[11px] text-slate-400 dark:text-white/30 line-through decoration-gold-500/50">
                  ₺{deal.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${daysLeftText === t('expired') ? 'text-red-400' : 'text-emerald-400/80'}`}>
              {daysLeftText}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <StarRating rating={deal.rating} ratingCount={deal.ratingCount} t={t} />
            {isLocked && (
              <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-gold-400 uppercase tracking-tighter">
                {deal.requiredTier}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="block group relative bg-white dark:bg-brand-surface rounded-[24px] overflow-hidden shadow-sm dark:shadow-2xl border border-slate-200 dark:border-white/5 transition-all duration-500 hover:shadow-xl dark:hover:shadow-gold-500/10 hover:-translate-y-1 active:scale-[0.98]">
      <Link
        to={`/deals/${deal.id}`}
        className="flex flex-col flex-grow cursor-pointer"
        onClick={() => logEngagementEvent(user?.id, 'click', deal.id, { source: 'DealCard', state: isLocked ? 'locked' : 'unlocked' })}
      >
        <CardContent />
      </Link>
    </div>
  );
};

export default DealCard;