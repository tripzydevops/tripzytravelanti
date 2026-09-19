import React, { useState } from 'react';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Gift,
  Ticket,
  Instagram,
  Share2,
  Users,
  Coins,
  CheckCircle,
  Clock,
  Sparkles,
  Trophy,
  ExternalLink
} from 'lucide-react';
import { SocialShareModal } from './SocialShareModal';
import { triggerHapticFeedback } from '../../lib/hapticUtils';

export const SocialRafflesCard: React.FC = () => {
  const { raffles, completeRaffleQuest, buyRaffleTicketWithPoints } = useGamification();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [activeRaffleIndex, setActiveRaffleIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [loadingQuestId, setLoadingQuestId] = useState<string | null>(null);

  if (!raffles || raffles.length === 0) return null;

  const currentRaffle = raffles[activeRaffleIndex];
  const title = language === 'tr' ? currentRaffle.title_tr : currentRaffle.title;
  const desc = language === 'tr' ? currentRaffle.description_tr : currentRaffle.description;

  const handleQuestAction = async (questId: string, actionType: string, actionUrl?: string, pointsCost?: number) => {
    setLoadingQuestId(questId);
    try {
      if (actionType === 'instagram_follow' && actionUrl) {
        window.open(actionUrl, '_blank');
        setTimeout(async () => {
          await completeRaffleQuest(currentRaffle.id, questId);
        }, 1200);
      } else if (actionType === 'instagram_story' || actionType === 'referral') {
        setIsShareModalOpen(true);
        setTimeout(async () => {
          await completeRaffleQuest(currentRaffle.id, questId);
        }, 2000);
      } else if (actionType === 'points_exchange' && pointsCost) {
        if (!user) {
          alert(language === 'tr' ? 'Lütfen önce giriş yapın.' : 'Please log in first.');
          return;
        }
        if ((user.points || 0) < pointsCost) {
          alert(language === 'tr' ? 'Yetersiz Tripzy puanı.' : 'Insufficient Tripzy points.');
          return;
        }
        await buyRaffleTicketWithPoints(currentRaffle.id, questId, pointsCost);
      } else {
        await completeRaffleQuest(currentRaffle.id, questId);
      }
    } finally {
      setLoadingQuestId(null);
    }
  };

  return (
    <div className="mx-4 my-6 space-y-4">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {language === 'tr' ? 'Sosyal Medya Çekilişleri' : 'Social Media Giveaways'}
            </h3>
            <p className="text-white/50 text-xs">
              {language === 'tr' ? 'Görevleri yap, bilet topla ve kazan!' : 'Complete quests to earn free raffle tickets!'}
            </p>
          </div>
        </div>

        {/* User Tickets Counter */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-primary/20 border border-brand-primary/30 text-brand-primary font-bold text-xs">
          <Ticket className="w-3.5 h-3.5" />
          <span>{currentRaffle.userTickets} {language === 'tr' ? 'Biletin Var' : 'Tickets'}</span>
        </div>
      </div>

      {/* Featured Raffle Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-2 border-brand-primary/30 shadow-2xl p-5 sm:p-6 space-y-5">
        {/* Background Image Banner */}
        <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-inner">
          <img
            src={currentRaffle.imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          {/* Badges on Top of Image */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-red-600/90 text-white font-black text-xs uppercase tracking-wider backdrop-blur-md shadow">
              {language === 'tr' ? '🎁 BÜYÜK ÇEKİLİŞ' : '🎁 MEGA GIVEAWAY'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-brand-primary text-black font-extrabold text-xs shadow">
              {currentRaffle.prizeValue}
            </span>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'tr' ? `Çekiliş Tarihi: ${currentRaffle.drawDate}` : `Draw Date: ${currentRaffle.drawDate}`}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
              <Users className="w-3.5 h-3.5 text-brand-primary" />
              <span>{currentRaffle.totalTickets} {language === 'tr' ? 'Katılım' : 'Entries'}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <h4 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
            {title}
          </h4>
          <p className="text-white/70 text-xs sm:text-sm">
            {desc}
          </p>
        </div>

        {/* Quests To Earn Tickets */}
        <div className="space-y-2.5 pt-2">
          <h5 className="text-xs uppercase tracking-wider text-brand-primary font-bold">
            {language === 'tr' ? 'Ücretsiz Bilet Kazanma Görevleri' : 'Complete Quests For Tickets'}
          </h5>

          <div className="space-y-2">
            {currentRaffle.quests.map((quest) => {
              const qTitle = language === 'tr' ? quest.title_tr : quest.title;
              const qDesc = language === 'tr' ? quest.description_tr : quest.description;

              return (
                <div
                  key={quest.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    quest.isCompleted
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                      {quest.actionType === 'instagram_follow' && <Instagram className="w-4 h-4 text-pink-400" />}
                      {quest.actionType === 'instagram_story' && <Share2 className="w-4 h-4 text-rose-400" />}
                      {quest.actionType === 'referral' && <Users className="w-4 h-4 text-amber-400" />}
                      {quest.actionType === 'points_exchange' && <Coins className="w-4 h-4 text-yellow-400" />}
                      {quest.actionType === 'redeem_deal' && <Ticket className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-xs truncate">{qTitle}</p>
                      <p className="text-white/50 text-[11px] truncate">{qDesc}</p>
                    </div>
                  </div>

                  {quest.isCompleted ? (
                    <div className="flex items-center gap-1 text-green-400 text-xs font-bold px-2 py-1 bg-green-500/20 rounded-lg flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{language === 'tr' ? 'Tamamlandı' : 'Done'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleQuestAction(quest.id, quest.actionType, quest.actionUrl, quest.pointsCost)}
                      disabled={loadingQuestId === quest.id}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-primary to-amber-500 text-black font-extrabold text-xs shadow hover:opacity-95 transition-opacity flex items-center gap-1 flex-shrink-0"
                    >
                      <Sparkles className="w-3 h-3" />
                      +{quest.ticketsReward} {language === 'tr' ? 'Bilet' : 'Tix'}
                    </button>
                  )}
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
          shareType="raffle"
          title={title}
          subtitle={desc}
          dealImageUrl={currentRaffle.imageUrl}
          referralCode={user?.referralCode}
        />
      )}
    </div>
  );
};

export default SocialRafflesCard;
