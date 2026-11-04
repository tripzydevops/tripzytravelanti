import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { TravelPassportStamp } from '../../types';
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
  MapPin,
  Camera,
  Plane,
  X,
  ChevronRight,
  Gift,
  Trophy,
  Filter
} from 'lucide-react';
import { SocialShareModal } from './SocialShareModal';

export const TripzyPassport: React.FC = () => {
  const { gamificationState } = useGamification();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<TravelPassportStamp | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  const {
    level,
    levelTitle,
    levelTitle_tr,
    xp,
    xpForNextLevel,
    streakDays,
    stamps = []
  } = gamificationState;

  const isTr = language === 'tr';
  const currentLevelTitle = isTr ? (levelTitle_tr || levelTitle) : levelTitle;
  const progressPercent = Math.min(Math.round((xp / xpForNextLevel) * 100), 100);

  // Available unique cities for quick filter pills
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    stamps.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set);
  }, [stamps]);

  // Filtered stamps
  const filteredStamps = useMemo(() => {
    return stamps.filter((stamp) => {
      if (filterStatus === 'unlocked' && !stamp.isUnlocked) return false;
      if (filterStatus === 'locked' && stamp.isUnlocked) return false;
      if (cityFilter !== 'all' && stamp.city !== cityFilter) return false;
      return true;
    });
  }, [stamps, filterStatus, cityFilter]);

  const unlockedCount = stamps.filter((s) => s.isUnlocked).length;

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
      case 'Sparkles':
        return <Sparkles className="w-6 h-6" />;
      case 'MapPin':
        return <MapPin className="w-6 h-6" />;
      case 'Camera':
        return <Camera className="w-6 h-6" />;
      case 'Plane':
        return <Plane className="w-6 h-6" />;
      case 'Award':
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  const handleExploreDeals = (stamp: TravelPassportStamp) => {
    setSelectedStamp(null);
    if (stamp.city && stamp.city !== 'Global') {
      navigate(`/?q=${encodeURIComponent(stamp.city)}`);
    } else if (stamp.category) {
      navigate(`/?category=${encodeURIComponent(stamp.category)}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Luxury Passport Booklet Card */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-[#1b1917] via-[#292524] to-[#0c0a09] border-2 border-brand-primary/40 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        {/* Subtle Gold Foil Background Accents */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Passport Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-brand-primary/20 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-amber-600 p-[2px] shadow-lg shadow-brand-primary/20 flex-shrink-0">
              <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center text-brand-primary">
                <Compass className="w-7 h-7" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-wide">
                  TRIPZY PASSPORT
                </h2>
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30 font-bold">
                  {user?.tier || 'FREE'}
                </span>
              </div>
              <p className="text-white/60 text-xs mt-0.5">
                {user?.name || 'Explorer'} • {user?.referralCode ? `ID: #${user.referralCode}` : 'Official Travel Passport'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
              title="Share Passport"
            >
              <Share2 className="w-4 h-4" />
              <span>{isTr ? 'Hikayede Paylaş' : 'Share Passport'}</span>
            </button>
          </div>
        </div>

        {/* Level & XP Progress */}
        <div className="my-5 relative z-10 space-y-2.5 bg-black/40 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-xs">
                L{level}
              </span>
              <div>
                <span className="text-white font-bold text-sm block">
                  {currentLevelTitle}
                </span>
                <span className="text-white/50 text-[11px]">
                  {isTr ? 'Bir sonraki seviyeye:' : 'Next Level:'} {Math.max(xpForNextLevel - xp, 0)} XP
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-brand-primary font-black text-sm">
                {xp} / {xpForNextLevel} XP
              </span>
              <span className="text-white/40 text-[10px] block font-medium">
                %{progressPercent} {isTr ? 'Tamamlandı' : 'Completed'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-brand-primary via-amber-400 to-amber-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stamps Collection Section */}
        <div className="relative z-10 pt-2 space-y-4">
          {/* Section Header with Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-brand-primary/90 font-black">
                {isTr ? 'DİJİTAL SEYAHAT DAMGALARI' : 'TRAVEL PASSPORT STAMPS'}
              </h3>
              <p className="text-white/50 text-xs mt-0.5">
                {isTr
                  ? 'Fırsat kullandıkça damgaları topla, XP kazan ve özel indirimlerin kilidini aç.'
                  : 'Redeem deals to collect stamps, earn XP, and unlock perks.'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <Award className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-bold text-white">
                {unlockedCount} / {stamps.length}
              </span>
              <span className="text-[11px] text-white/50">
                {isTr ? 'Kazanıldı' : 'Unlocked'}
              </span>
            </div>
          </div>

          {/* Filter Bar: Status & Cities */}
          <div className="flex flex-col gap-2 pt-1">
            {/* Status Segmented Buttons */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-brand-primary text-black shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {isTr ? 'Tümü' : 'All'} ({stamps.length})
              </button>
              <button
                onClick={() => setFilterStatus('unlocked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatus === 'unlocked'
                    ? 'bg-brand-primary text-black shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>🎖️ {isTr ? 'Kazanılanlar' : 'Unlocked'}</span>
                <span>({unlockedCount})</span>
              </button>
              <button
                onClick={() => setFilterStatus('locked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatus === 'locked'
                    ? 'bg-brand-primary text-black shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>🎯 {isTr ? 'Hedefler' : 'In Progress'}</span>
                <span>({stamps.length - unlockedCount})</span>
              </button>
            </div>

            {/* City Quick Pills if multiple cities exist */}
            {availableCities.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setCityFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    cityFilter === 'all'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                  }`}
                >
                  {isTr ? 'Tüm Şehirler' : 'All Cities'}
                </button>
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setCityFilter(city)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                      cityFilter === city
                        ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/40'
                        : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stamps Collection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {filteredStamps.map((stamp) => {
              const name = isTr ? stamp.name_tr || stamp.name : stamp.name;
              const desc = isTr ? stamp.description_tr || stamp.description : stamp.description;
              const reqCount = stamp.requiredCount || 1;
              const curCount = stamp.currentCount || 0;
              const stampProgress = Math.min(Math.round((curCount / reqCount) * 100), 100);

              return (
                <div
                  key={stamp.id}
                  onClick={() => setSelectedStamp(stamp)}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between gap-3 cursor-pointer group hover:scale-[1.02] active:scale-[0.99] ${
                    stamp.isUnlocked
                      ? 'bg-gradient-to-br from-brand-primary/15 via-amber-500/10 to-black/60 border-brand-primary/40 shadow-lg shadow-brand-primary/5 hover:border-brand-primary'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Top Row: Icon & Status */}
                  <div className="flex items-start gap-3.5">
                    {/* Stamp Seal Icon */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                        stamp.isUnlocked
                          ? 'bg-gradient-to-br from-brand-primary via-amber-400 to-amber-600 text-zinc-950 shadow-md shadow-brand-primary/30 rotate-[-6deg] group-hover:rotate-0'
                          : 'bg-white/10 text-white/40 group-hover:text-white/70'
                      }`}
                    >
                      {stamp.isUnlocked ? getStampIcon(stamp.icon) : <Lock className="w-5 h-5" />}
                    </div>

                    {/* Stamp Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-white font-bold text-sm truncate group-hover:text-brand-primary transition-colors">
                          {name}
                        </h4>
                        {stamp.isUnlocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex-shrink-0">
                            <CheckCircle className="w-3 h-3" />
                            {isTr ? 'Kazanıldı' : 'Unlocked'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 flex-shrink-0">
                            +{stamp.xpReward} XP
                          </span>
                        )}
                      </div>

                      <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mt-1">
                        {desc}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Tags & Mini Progress */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    {/* Progress Bar for Locked Stamps */}
                    {!stamp.isUnlocked && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                          <span>{isTr ? 'İlerleme:' : 'Progress:'}</span>
                          <span className="font-bold text-white/70">{curCount} / {reqCount} {isTr ? 'fırsat' : 'deals'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-primary to-amber-500 rounded-full transition-all"
                            style={{ width: `${stampProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-white/40">
                      <div className="flex items-center gap-2">
                        {stamp.city && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-primary/90 font-medium bg-brand-primary/10 px-2 py-0.5 rounded-md">
                            <MapPin className="w-2.5 h-2.5" />
                            {stamp.city}
                          </span>
                        )}
                        {stamp.category && (
                          <span className="text-[10px] text-white/50">
                            {stamp.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors flex items-center gap-0.5">
                        {isTr ? 'İncele' : 'Details'}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStamps.length === 0 && (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <Compass className="w-8 h-8 text-white/30 mx-auto" />
              <p className="text-white/70 text-sm font-semibold">
                {isTr ? 'Bu filtreye uygun damga bulunamadı.' : 'No stamps found for this filter.'}
              </p>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setCityFilter('all');
                }}
                className="text-xs text-brand-primary font-bold hover:underline"
              >
                {isTr ? 'Filtreleri Temizle' : 'Clear Filters'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Stamp Detail Modal */}
      {selectedStamp && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-brand-primary/40 p-6 space-y-5 shadow-2xl relative animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => setSelectedStamp(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Stamp Icon Big Preview */}
            <div className="text-center pt-2">
              <div
                className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center transition-all ${
                  selectedStamp.isUnlocked
                    ? 'bg-gradient-to-br from-brand-primary via-amber-400 to-amber-600 text-zinc-950 shadow-[0_0_30px_rgba(212,175,55,0.4)] rotate-[-6deg]'
                    : 'bg-white/10 text-white/50 border border-white/15'
                }`}
              >
                {selectedStamp.isUnlocked ? (
                  getStampIcon(selectedStamp.icon)
                ) : (
                  <Lock className="w-8 h-8" />
                )}
              </div>

              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    selectedStamp.isUnlocked
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                  }`}
                >
                  {selectedStamp.isUnlocked
                    ? (isTr ? '✅ BAŞARIYLA KAZANILDI' : '✅ UNLOCKED')
                    : (isTr ? '🎯 KAZANILACAK HEDEF' : '🎯 IN PROGRESS')}
                </span>

                <h3 className="text-xl font-black text-white mt-1.5">
                  {isTr ? selectedStamp.name_tr || selectedStamp.name : selectedStamp.name}
                </h3>
              </div>
            </div>

            {/* Description & Criteria */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <p className="text-white/80 text-xs leading-relaxed text-center">
                {isTr ? selectedStamp.description_tr || selectedStamp.description : selectedStamp.description}
              </p>

              {/* Reward Pills */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5">
                <span className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                  +{selectedStamp.xpReward} XP
                </span>
                {selectedStamp.pointsReward ? (
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2.5 py-1 rounded-lg border border-emerald-400/20">
                    +{selectedStamp.pointsReward} {isTr ? 'Puan' : 'Points'}
                  </span>
                ) : null}
              </div>

              {/* Progress Detail for Locked */}
              {!selectedStamp.isUnlocked && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>{isTr ? 'Kazanma Şartı:' : 'Unlock Requirement:'}</span>
                    <span className="font-bold text-white">
                      {selectedStamp.currentCount || 0} / {selectedStamp.requiredCount || 1} {isTr ? 'Kullanım' : 'Redemptions'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-primary to-amber-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          Math.round(((selectedStamp.currentCount || 0) / (selectedStamp.requiredCount || 1)) * 100),
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-1">
              {selectedStamp.isUnlocked ? (
                <button
                  onClick={() => {
                    setSelectedStamp(null);
                    setIsShareModalOpen(true);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary to-amber-500 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-black" />
                  <span>{isTr ? 'Bu Damgayı Hikayede Paylaş' : 'Share Stamp to Story'}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleExploreDeals(selectedStamp)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary to-amber-500 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-black" />
                  <span>
                    {isTr
                      ? `${selectedStamp.city || 'İlgili'} Fırsatlarını Gör`
                      : `Explore ${selectedStamp.city || 'Matching'} Deals`}
                  </span>
                </button>
              )}

              <button
                onClick={() => setSelectedStamp(null)}
                className="w-full py-2 text-white/50 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {isTr ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

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
