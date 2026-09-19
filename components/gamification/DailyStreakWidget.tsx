import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Flame, Sparkles, Gift, CheckCircle, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export const DailyStreakWidget: React.FC = () => {
  const {
    gamificationState,
    claimStreak,
    openScratchModal,
    isStreakModalOpen,
    openStreakModal,
    closeStreakModal
  } = useGamification();
  const { language } = useLanguage();

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedResult, setClaimedResult] = useState<{ xpEarned: number; pointsEarned: number } | null>(null);

  const streakDays = gamificationState.streakDays;
  const canClaim = gamificationState.canClaimDailyStreak;

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await claimStreak();
      if (res) {
        setClaimedResult(res);
        openStreakModal();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore confetti if canvas unsupported
        }
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <>
      {/* Compact Feed Banner */}
      <div className="mx-4 my-2 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 backdrop-blur-md flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30 animate-pulse-slow">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-extrabold text-sm sm:text-base">
                {streakDays} {language === 'tr' ? 'Günlük Seri!' : 'Day Streak!'}
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded-md border border-amber-500/30">
                {gamificationState.levelTitle_tr || gamificationState.levelTitle}
              </span>
            </div>
            <p className="text-white/60 text-xs">
              {canClaim
                ? (language === 'tr' ? 'Bugünkü ödülün hazır! 🔥' : "Today's bonus is ready! 🔥")
                : (language === 'tr' ? 'Yarın seriyi devam ettir' : 'Return tomorrow to extend streak')}
            </p>
          </div>
        </div>

        {canClaim ? (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-amber-500 text-black font-extrabold text-xs shadow-md shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {language === 'tr' ? 'Ödülü Al' : 'Claim'}
          </button>
        ) : (
          <button
            onClick={openScratchModal}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 flex items-center gap-1.5 transition-colors"
          >
            <Gift className="w-3.5 h-3.5 text-brand-primary" />
            {language === 'tr' ? 'Şans Kartı' : 'Lucky Card'}
          </button>
        )}
      </div>

      {/* Celebration Streak Modal (Rendered via Portal to always stay centered in viewport) */}
      {isStreakModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-zinc-900 to-black border border-amber-500/30 p-6 text-center space-y-5 shadow-2xl relative my-auto animate-scale-up">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce">
              <Flame className="w-12 h-12 fill-current" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">
                {streakDays} {language === 'tr' ? 'Günlük Seri Tamam!' : 'Day Streak Achieved!'}
              </h3>
              <p className="text-white/70 text-sm">
                {language === 'tr'
                  ? 'Harika gidiyorsun! Her gün giriş yaparak seyahat puanlarını katla.'
                  : 'You are on fire! Keep exploring daily to maximize your travel rewards.'}
              </p>
            </div>

            {/* Earned Rewards Box */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around">
              <div>
                <span className="text-xs text-white/50 block">{language === 'tr' ? 'Kazanılan XP' : 'XP Earned'}</span>
                <span className="text-lg font-bold text-amber-400">+{claimedResult?.xpEarned || 30} XP</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-xs text-white/50 block">{language === 'tr' ? 'Tripzy Puanı' : 'Tripzy Points'}</span>
                <span className="text-lg font-bold text-brand-primary">+{claimedResult?.pointsEarned || 10} Puan</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  closeStreakModal();
                  openScratchModal();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary to-amber-500 text-black font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-95"
              >
                <Gift className="w-4 h-4 text-black" />
                {language === 'tr' ? 'Şanslı Kazı Kazan Kartını Aç 🎁' : 'Open Mystery Scratch Card 🎁'}
              </button>

              <button
                onClick={closeStreakModal}
                className="w-full py-2.5 text-white/50 hover:text-white text-xs font-medium transition-colors"
              >
                {language === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default DailyStreakWidget;
