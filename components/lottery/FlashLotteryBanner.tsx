import React, { useState, useEffect } from 'react';
import { Sparkles, Ticket, Clock, Share2, Award, ChevronRight, CheckCircle2 } from 'lucide-react';
import { LotteryCampaign } from '../../types';
import { lotteryService } from '../../lib/services/lotteryService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface FlashLotteryBannerProps {
  onOpenModal: (campaign: LotteryCampaign) => void;
}

export const FlashLotteryBanner: React.FC<FlashLotteryBannerProps> = ({ onOpenModal }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [campaign, setCampaign] = useState<LotteryCampaign | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 24,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const loadActiveCampaign = async () => {
      const campaigns = await lotteryService.getCampaigns(user?.id);
      const active = campaigns.find(c => c.status === 'active');
      if (active) {
        setCampaign(active);
      }
    };
    loadActiveCampaign();
  }, [user?.id]);

  useEffect(() => {
    if (!campaign) return;

    const interval = setInterval(() => {
      const end = new Date(campaign.endsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign]);

  if (!campaign) return null;

  const hasTickets = (campaign.userTicketsCount || 0) > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-rose-600 to-indigo-700 p-0.5 shadow-2xl transition-all duration-300 hover:shadow-rose-500/20 mb-6">
      <div className="relative rounded-[23px] bg-slate-950/90 backdrop-blur-xl p-5 md:p-6 overflow-hidden">
        {/* Background Ambient Glow & Graphic */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Campaign Info & Badge */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold tracking-wide uppercase animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                {isTr ? '🔥 Flaş Seyahat Çekilişi' : '🔥 Flash Travel Giveaway'}
              </span>

              {hasTickets && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isTr ? `${campaign.userTicketsCount} Biletin Var` : `${campaign.userTicketsCount} Tickets Active`}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                {isTr ? campaign.title_tr : campaign.title}
              </h3>
              <p className="text-xs md:text-sm text-slate-300 mt-1 line-clamp-2">
                {isTr ? campaign.prizeDescription_tr : campaign.prizeDescription}
              </p>
            </div>

            {/* Countdown & Stats row */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs md:text-sm">
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-200">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-slate-400 text-xs">{isTr ? 'Kaldı' : 'Left'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-300">
                <Ticket className="w-4 h-4 text-rose-400" />
                <span>
                  <strong className="text-white font-bold">{campaign.totalTicketsMinted}</strong> {isTr ? 'Bilet Dağıtıldı' : 'Tickets Minted'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTA Button & Image Preview */}
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="hidden sm:block relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-md flex-shrink-0">
              <img
                src={campaign.imageUrl}
                alt="Lottery Prize"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-amber-300">
                %100 ÜCRETSİZ
              </span>
            </div>

            <button
              onClick={() => onOpenModal(campaign)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all transform active:scale-95 group cursor-pointer"
            >
              <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>{isTr ? 'Paylaş & Bilet Kazan' : 'Share & Win Ticket'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
