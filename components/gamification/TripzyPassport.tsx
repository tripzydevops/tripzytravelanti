import React, { useState } from 'react';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Compass,
  Utensils,
  Sun,
  Coffee,
  Award,
  Sparkles,
  Share2,
  Lock,
  CheckCircle,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { SocialShareModal } from './SocialShareModal';

export const TripzyPassport: React.FC = () => {
  const { gamificationState } = useGamification();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const {
    level,
    levelTitle,
    levelTitle_tr,
    xp,
    xpForNextLevel,
    streakDays,
    stamps
  } = gamificationState;

  const currentLevelTitle = language === 'tr' ? (levelTitle_tr || levelTitle) : levelTitle;
  const progressPercent = Math.min(Math.round((xp / xpForNextLevel) * 100), 100);

  const getStampIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils className="w-6 h-6" />;
      case 'Compass':
        return <Compass className="w-6 h-6" />;
      case 'Sun':
        return <Sun className="w-6 h-6" />;
      case 'Coffee':
        return <Coffee className="w-6 h-6" />;
      case 'Award':
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Luxury Passport Booklet Card */}
      <div className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-br from-[#1b1917] via-[#292524] to-[#0c0a09] border-2 border-brand-primary/40 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        {/* Subtle Gold Foil Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Passport Header */}
        <div className="flex items-start justify-between relative z-10 border-b border-brand-primary/20 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-amber-600 p-[2px] shadow-lg shadow-brand-primary/20">
              <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center text-brand-primary">
                <Compass className="w-7 h-7" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-wide">
                  TRIPZY PASSPORT
                </h2>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30 font-bold">
                  {user?.tier || 'FREE'}
                </span>
              </div>
              <p className="text-white/60 text-xs mt-0.5">
                {user?.name || 'Explorer'} • {user?.referralCode ? `ID: #${user.referralCode}` : 'Official Travel Passport'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Share Passport"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'tr' ? 'Hikayede Paylaş' : 'Share'}</span>
          </button>
        </div>

        {/* Level & XP Progress */}
        <div className="my-5 relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/80 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              {currentLevelTitle} (Lvl {level})
            </span>
            <span className="text-brand-primary font-bold">
              {xp} / {xpForNextLevel} XP
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-brand-primary via-amber-400 to-amber-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stamps Collection Grid */}
        <div className="relative z-10 pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-widest text-brand-primary/90 font-black">
              {language === 'tr' ? 'DİJİTAL SEYAHAT DAMGALARI' : 'TRAVEL PASSPORT STAMPS'}
            </h3>
            <span className="text-xs text-white/50 font-medium">
              {stamps.filter((s) => s.isUnlocked).length} / {stamps.length} {language === 'tr' ? 'Kazanıldı' : 'Unlocked'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stamps.map((stamp) => {
              const name = language === 'tr' ? stamp.name_tr : stamp.name;
              const desc = language === 'tr' ? stamp.description_tr : stamp.description;

              return (
                <div
                  key={stamp.id}
                  className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex items-center gap-3.5 ${
                    stamp.isUnlocked
                      ? 'bg-gradient-to-br from-brand-primary/15 via-amber-500/10 to-transparent border-brand-primary/40 shadow-md'
                      : 'bg-white/5 border-white/10 opacity-70'
                  }`}
                >
                  {/* Stamp Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${
                      stamp.isUnlocked
                        ? 'bg-gradient-to-br from-brand-primary to-amber-600 text-zinc-950 shadow-md rotate-[-6deg]'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {stamp.isUnlocked ? getStampIcon(stamp.icon) : <Lock className="w-5 h-5" />}
                  </div>

                  {/* Stamp Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-white font-bold text-xs truncate">
                        {name}
                      </h4>
                      {stamp.isUnlocked ? (
                        <CheckCircle className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                      ) : (
                        <span className="text-[10px] text-white/40 font-semibold">
                          +{stamp.xpReward} XP
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-[11px] leading-tight line-clamp-2 mt-0.5">
                      {desc}
                    </p>
                    {stamp.city && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-brand-primary/80 font-medium mt-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {stamp.city}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <SocialShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareType="passport"
          title={`Tripzy Passport - ${currentLevelTitle}`}
          referralCode={user?.referralCode || 'TRIPZY2026'}
        />
      )}
    </div>
  );
};

export default TripzyPassport;
