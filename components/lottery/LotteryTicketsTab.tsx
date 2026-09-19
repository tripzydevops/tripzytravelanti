import React, { useEffect, useState } from 'react';
import {
  Ticket,
  Sparkles,
  Trophy,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  QrCode
} from 'lucide-react';
import { LotteryTicket, LotteryCampaign } from '../../types';
import { lotteryService } from '../../lib/services/lotteryService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface LotteryTicketsTabProps {
  onOpenCampaign?: (campaign: LotteryCampaign) => void;
}

export const LotteryTicketsTab: React.FC<LotteryTicketsTabProps> = ({ onOpenCampaign }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [tickets, setTickets] = useState<LotteryTicket[]>([]);
  const [campaigns, setCampaigns] = useState<LotteryCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [userTickets, allCampaigns] = await Promise.all([
          lotteryService.getUserTickets(user?.id || 'demo-user'),
          lotteryService.getCampaigns(user?.id)
        ]);
        setTickets(userTickets);
        setCampaigns(allCampaigns);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const wonTickets = tickets.filter(t => t.isWinner);
  const activeTickets = tickets.filter(t => !t.isWinner);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">
          {isTr ? 'Çekiliş biletleri yükleniyor...' : 'Loading lottery tickets...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WON VOUCHERS BANNER (IF ANY) */}
      {wonTickets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">
              {isTr ? '🎉 Kazandığınız Flaş Çekiliş Ödülleri' : '🎉 Won Flash Lottery Prizes'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wonTickets.map(ticket => {
              const camp = campaigns.find(c => c.id === ticket.campaignId);
              return (
                <div
                  key={ticket.id}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-indigo-500/20 border-2 border-amber-400/50 p-5 shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                        🏆 %100 ÜCRETSİZ KAZANDINIZ
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">
                        {camp ? (isTr ? camp.title_tr : camp.title) : 'Flash Prize Voucher'}
                      </h4>
                      <p className="text-xs text-amber-300 font-semibold mt-0.5">
                        {camp ? (isTr ? camp.prizeDescription_tr : camp.prizeDescription) : ''}
                      </p>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-white p-1 shadow flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-full h-full text-slate-900" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isTr ? 'Kupon / Bilet No' : 'Voucher Code'}</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {ticket.ticketNumber}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(ticket.ticketNumber)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copiedCode === ticket.ticketNumber ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Kodu Kopyala' : 'Copy')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE LOTTERY TICKETS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">
              {isTr ? 'Aktif Çekiliş Biletleriniz' : 'Your Active Lottery Tickets'} ({activeTickets.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {isTr ? 'Doğrulanmış Biletler' : 'Verified Tickets'}
          </span>
        </div>

        {activeTickets.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {isTr ? 'Henüz aktif bir çekiliş biletiniz yok' : 'No active lottery tickets yet'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {isTr
                  ? 'Fırsatları Instagramda paylaşarak veya arkadaşlarınızı davet ederek anında ücretsiz bilet kazanabilirsiniz.'
                  : 'Share deals on Instagram or invite friends to earn free lottery tickets instantly.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeTickets.map(ticket => {
              const camp = campaigns.find(c => c.id === ticket.campaignId);
              return (
                <div
                  key={ticket.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-rose-300 text-[10px] font-bold">
                        <Sparkles className="w-3 h-3 text-rose-400" />
                        {ticket.verificationMethod}
                      </span>
                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {camp ? (isTr ? camp.title_tr : camp.title) : 'Travel Giveaway'}
                      </h4>
                    </div>

                    <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {isTr ? 'Çekiliş Bekleniyor' : 'Pending Draw'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">BİLET NUMARASI</span>
                      <span className="font-mono font-bold text-rose-400 text-xs">
                        {ticket.ticketNumber}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(ticket.ticketNumber)}
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
