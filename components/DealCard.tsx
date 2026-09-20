import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Deal, SubscriptionTier } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useUserActivity } from "../contexts/UserActivityContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Lock,
  StarIcon,
  HeartIcon,
  LocationMarkerIcon as LocationIcon,
  CheckCircle,
} from "./Icons";
import { Share2, Sparkles, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { getThumbnailUrl } from "../lib/imageUtils";
import { logEngagementEvent } from "../lib/supabaseService";
import { triggerHapticFeedback } from "../lib/hapticUtils";
import { SocialShareModal } from "./gamification/SocialShareModal";

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

const StarRating: React.FC<{
  rating: number;
  ratingCount: number;
  t: (key: string) => string;
}> = ({ rating, ratingCount, t }) => {
  if (ratingCount === 0) {
    return <p className="text-xs text-slate-400">{t("noRatingsYet")}</p>;
  }

  const fullStars = Math.floor(rating);

  return (
    <div className="flex items-center">
      <div className="flex items-center mr-1.5">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon
            key={`full-${i}`}
            className="w-3.5 h-3.5 text-amber-400"
            fill="currentColor"
          />
        ))}
        {[...Array(5 - fullStars)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="w-3.5 h-3.5 text-amber-400/30" />
        ))}
      </div>
      <span className="text-xs font-bold text-slate-300">
        {rating.toFixed(1)} <span className="font-normal text-slate-400">({ratingCount})</span>
      </span>
    </div>
  );
};

const DealCard: React.FC<DealCardProps> = ({ deal }) => {
  const { user } = useAuth();
  const { saveDeal, unsaveDeal, isDealSaved, bufferSignal } = useUserActivity();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showAiTooltip, setShowAiTooltip] = useState(false);
  const lastTapRef = useRef<number>(0);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-image gallery list with fallback
  const galleryImages = useMemo(() => {
    if (deal.galleryUrls && deal.galleryUrls.length > 0) {
      return deal.galleryUrls;
    }
    return [deal.imageUrl];
  }, [deal.galleryUrls, deal.imageUrl]);

  const handleMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => {
      bufferSignal("hover", deal.id, { source: "DealCard", duration_ms: 750 });
    }, 750);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowAiTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const isSaved = isDealSaved(deal.id);

  // In-Card Image Pagination Dot Click
  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(index);
    triggerHapticFeedback('light');
  };

  // Previous / Next Image Navigation
  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
    triggerHapticFeedback('light');
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    triggerHapticFeedback('light');
  };

  // Instagram Double-Tap to Heart
  const handleImageTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      e.stopPropagation();

      // Trigger burst animation & haptics
      setShowHeartBurst(true);
      triggerHapticFeedback('medium');
      setTimeout(() => setShowHeartBurst(false), 900);

      // Save deal if not already saved
      if (user && !isSaved) {
        saveDeal(deal.id);
      }

      // Buffer implicit like signal for recommendation engine
      bufferSignal("deal_double_tap_like", deal.id, {
        source: "DealCard_DoubleTap",
        category: deal.category
      });
    }
    lastTapRef.current = now;
  };

  const userTierLevel = user
    ? TIER_LEVELS[user.tier]
    : TIER_LEVELS[SubscriptionTier.NONE];
  const requiredTierLevel = TIER_LEVELS[deal.requiredTier];

  // Guests see FREE tier deals as unlocked, but higher tiers as locked.
  let isLocked = userTierLevel < requiredTierLevel;
  if (!user && deal.requiredTier === SubscriptionTier.FREE) {
    isLocked = false;
  }

  const title = language === "tr" ? deal.title_tr || deal.title : deal.title;
  const description =
    language === "tr" ? deal.description_tr || deal.description : deal.description;

  const discount =
    deal.discountPercentage && deal.discountPercentage > 0
      ? deal.discountPercentage
      : deal.originalPrice > 0
      ? Math.round(
          ((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) *
            100
        )
      : 0;

  const netSavings = deal.originalPrice > deal.discountedPrice
    ? deal.originalPrice - deal.discountedPrice
    : 0;

  const calculateDaysLeft = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);

    if (expiry.getFullYear() > now.getFullYear() + 50) {
      return t("neverExpires");
    }

    expiry.setHours(23, 59, 59, 999);
    const diffTime = expiry.getTime() - now.getTime();
    if (diffTime <= 0) return t("expired");
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${t("expiresIn")} ${diffDays} ${
      diffDays > 1 ? t("days") : t("daySingular")
    }`;
  };

  const daysLeftText = calculateDaysLeft(deal.expiresAt);

  // Check if deal is "new" (created within last 48 hours)
  const isNewDeal = React.useMemo(() => {
    if (!deal.createdAt) return false;
    const createdDate = new Date(deal.createdAt);
    const now = new Date();
    const hoursDiff =
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
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

  // Location display (Neighborhood > City > Store Location)
  const displayLocation = useMemo(() => {
    if (language === 'tr' && deal.neighborhood_tr) return deal.neighborhood_tr;
    if (deal.neighborhood) return deal.neighborhood;
    if (deal.storeLocations && deal.storeLocations.length > 0) {
      return deal.storeLocations[0].city || deal.storeLocations[0].name;
    }
    return null;
  }, [deal, language]);

  // AI Recommendation Reasoning
  const aiMatchScore = deal.aiMatchScore || (deal.rating && deal.rating >= 4.5 ? 96 : 92);
  const aiMatchReason = language === 'tr'
    ? (deal.aiMatchReason_tr || `Seyahat stiliniz ve ${deal.category_tr || deal.category} kategorisindeki tercihlerinize göre eşleştirildi.`)
    : (deal.aiMatchReason || `Curated for your travel style and preferences in ${deal.category}.`);

  const CardContent = () => (
    <>
      {/* Image Container with Airbnb-style In-Card Carousel & Double Tap */}
      <div
        className="relative aspect-[16/10] overflow-hidden group/img select-none cursor-pointer bg-slate-900"
        onClick={handleImageTap}
      >
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent z-10 pointer-events-none"></div>
        <img
          className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
          src={getThumbnailUrl(galleryImages[activeImageIndex], deal.category)}
          alt={title}
          loading="lazy"
          decoding="async"
        />

        {/* Multi-Image Prev/Next Hover Arrows (Desktop) */}
        {galleryImages.length > 1 && !isLocked && (
          <>
            <button
              onClick={handlePrevImage}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/80 opacity-0 group-hover/img:opacity-100 transition-all duration-200 hidden sm:flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/80 opacity-0 group-hover/img:opacity-100 transition-all duration-200 hidden sm:flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Carousel Pagination Dots */}
        {galleryImages.length > 1 && !isLocked && (
          <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-1.5 z-20 pointer-events-auto">
            {galleryImages.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={(e) => handleDotClick(e, dotIdx)}
                className={`transition-all duration-300 rounded-full ${
                  dotIdx === activeImageIndex
                    ? "w-2.5 h-1.5 bg-white shadow-md"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/75"
                }`}
                aria-label={`View photo ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Instagram-Style Double-Tap Heart Burst Particle */}
        {showHeartBurst && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-ping">
            <div className="p-4 rounded-full bg-red-500/30 backdrop-blur-sm shadow-[0_0_40px_rgba(239,68,68,0.8)] animate-bounce">
              <HeartIcon className="w-16 h-16 text-red-500 fill-red-500 drop-shadow-2xl" />
            </div>
          </div>
        )}

        {/* Floating Top Right Buttons (Heart + Share) */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {/* Share to Instagram Story / WhatsApp */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsShareModalOpen(true);
            }}
            className="p-2 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 hover:bg-slate-900 text-white transition-all active:scale-90 shadow-md"
            title="Share Deal"
          >
            <Share2 className="w-3.5 h-3.5 text-white hover:text-gold-400" />
          </button>

          {/* Save Heart Button */}
          {user && !isLocked && (
            <button
              onClick={handleSaveToggle}
              className="p-2 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 hover:bg-slate-900 transition-all duration-300 group/heart active:scale-90 shadow-md"
              aria-label={isSaved ? t("unsaveDealAction") : t("saveDealAction")}
            >
              <HeartIcon
                className={`w-3.5 h-3.5 transition-all duration-500 ${
                  isSaved
                    ? "text-red-500 fill-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    : "text-white group-hover/heart:scale-110 group-hover/heart:text-red-400"
                }`}
              />
            </button>
          )}
        </div>

        {/* Dual High-Contrast Savings Badges (Top Left) */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 items-center max-w-[70%]">
          {discount > 0 && !isLocked && (
            <div className="bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-xl tracking-tight uppercase whitespace-nowrap">
              {language === "tr" ? `%${discount} İNDİRİM` : `${discount}% OFF`}
            </div>
          )}
          {netSavings > 0 && !isLocked && (
            <div className="bg-gold-500 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-xl tracking-tight uppercase whitespace-nowrap flex items-center gap-1">
              ₺{netSavings.toLocaleString()} {t("savings") || (language === "tr" ? "KAZANÇ" : "SAVINGS")}
            </div>
          )}
          {isNewDeal && !isLocked && (
            <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xl tracking-tighter uppercase whitespace-nowrap">
              {language === "tr" ? "YENİ" : "NEW"}
            </div>
          )}
        </div>

        {/* Premium Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 text-center z-20">
            <div className="mb-2 p-3 rounded-full bg-gold-500/20 border border-gold-500/40">
              <Lock className="w-5 h-5 text-gold-400" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-400 mb-1">
              Member Exclusive
            </span>
            <span className="text-xs font-semibold text-slate-200 max-w-[170px]">
              {!user
                ? t("loginToUnlock")
                : `${deal.requiredTier} ${t("toUnlock")}`}
            </span>
          </div>
        )}

        {/* Sold Out Badge */}
        {!isLocked && deal.isSoldOut && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
            <span className="border-2 border-white/40 text-white font-black text-lg px-4 py-1.5 rounded-lg tracking-widest uppercase shadow-2xl">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Content Section with AAA Outdoor Legibility */}
      <div className="p-4 flex flex-col flex-grow relative bg-[#0f172a]/95 text-slate-100">
        
        {/* Vendor & Neighborhood Row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-700 shrink-0 bg-slate-800">
              {deal.companyLogoUrl ? (
                <img
                  src={deal.companyLogoUrl}
                  alt={deal.vendor}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gold-400 uppercase">
                  {deal.vendor.substring(0, 1)}
                </div>
              )}
            </div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate">
              {deal.vendor}
            </span>
            <CheckCircle className="w-3.5 h-3.5 text-gold-400 shrink-0" />
          </div>

          {displayLocation && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/60 text-slate-300 text-[10px] font-medium shrink-0">
              <LocationIcon className="w-2.5 h-2.5 text-gold-400" />
              <span className="truncate max-w-[110px]">{displayLocation}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-heading font-extrabold text-white mb-2 leading-[1.3] line-clamp-2 min-h-[2.6rem] group-hover:text-gold-400 transition-colors">
          {title}
        </h3>

        {/* AI Match Pill & Rating Row */}
        <div className="flex items-center justify-between gap-2 mb-3 pt-1 border-t border-slate-800/80">
          <div className="relative group/ai">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAiTooltip(!showAiTooltip);
              }}
              onMouseEnter={() => setShowAiTooltip(true)}
              onMouseLeave={() => setShowAiTooltip(false)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-gold-500/15 to-purple-500/15 border border-gold-500/30 text-gold-300 text-[10px] font-extrabold uppercase tracking-wide hover:border-gold-500/60 transition-all cursor-help"
            >
              <Sparkles className="w-3 h-3 text-gold-400 animate-pulse" />
              <span>%{aiMatchScore} {t("aiMatch") || "AI Eşleşme"}</span>
            </button>

            {/* AI Tooltip */}
            {showAiTooltip && (
              <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl bg-slate-900/98 border border-gold-500/40 text-xs text-slate-200 shadow-2xl z-40 animate-fade-in pointer-events-none">
                <p className="font-bold text-gold-400 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("aiWhyRecommended") || "AI Neden Önerdi?"}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {aiMatchReason}
                </p>
              </div>
            )}
          </div>

          <StarRating
            rating={deal.rating}
            ratingCount={deal.ratingCount}
            t={t}
          />
        </div>

        {/* Price & Expiry Footer Row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/80">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tracking-tight text-white leading-none">
                {deal.originalPrice > 0
                  ? `₺${deal.discountedPrice.toLocaleString()}`
                  : `%${discount}`}
              </span>
              {deal.originalPrice > 0 && (
                <span className="text-xs text-slate-400 line-through decoration-slate-500 font-medium">
                  ₺{deal.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            <p
              className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                daysLeftText === t("expired")
                  ? "text-red-400"
                  : "text-emerald-400"
              }`}
            >
              {daysLeftText}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isLocked ? (
              <span className="px-2 py-1 rounded-lg bg-gold-500/10 border border-gold-500/30 text-[10px] font-black text-gold-400 uppercase tracking-wider">
                {deal.requiredTier}
              </span>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 group-hover:from-gold-400 group-hover:to-gold-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all">
                {t("claimDealButton") || (language === "tr" ? "Fırsatı Yakala" : "Claim")}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div
        className="relative flex flex-col h-full rounded-2xl overflow-hidden bg-[#0f172a]/95 border border-slate-700/60 shadow-xl transition-all duration-300 hover:border-gold-500/50 hover:shadow-[0_15px_40px_rgba(212,175,55,0.15)] hover:scale-[1.01] group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to={`/deals/${deal.id}`}
          className="flex flex-col flex-grow cursor-pointer"
          onClick={() =>
            bufferSignal("click", deal.id, {
              source: "DealCard",
              state: isLocked ? "locked" : "unlocked",
            })
          }
        >
          <CardContent />
        </Link>
      </div>

      {isShareModalOpen && (
        <SocialShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareType="deal"
          title={title}
          subtitle={`${deal.vendor} • ${discount > 0 ? `%${discount} İndirim` : ''}`}
          discountPercentage={discount}
          dealImageUrl={galleryImages[activeImageIndex]}
          referralCode={user?.referralCode}
        />
      )}
    </>
  );
};

export default DealCard;
