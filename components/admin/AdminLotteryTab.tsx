import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Trophy,
  Clock,
  CheckCircle,
  Save,
  Sparkles,
  ShieldCheck,
  QrCode,
  Users,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LotteryCampaign, LotteryDrawResult } from '../../types';
import { lotteryService } from '../../lib/services/lotteryService';
import { useLanguage } from '../../contexts/LanguageContext';

export const AdminLotteryTab: React.FC = () => {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [campaigns, setCampaigns] = useState<LotteryCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<LotteryDrawResult | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [titleTr, setTitleTr] = useState('');
  const [prizeDesc, setPrizeDesc] = useState('');
  const [prizeDescTr, setPrizeDescTr] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1570939274717-7eda259b50ed?auto=format&fit=crop&w=1200&q=80');
  const [merchantName, setMerchantName] = useState('Tripzy Partner');
  const [durationHours, setDurationHours] = useState(48);
  const [totalWinners, setTotalWinners] = useState(1);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await lotteryService.getCampaigns();
      setCampaigns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !prizeDesc) return;

    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    await lotteryService.createCampaign({
      title,
      title_tr: titleTr || title,
      description: 'Share on Instagram Story to enter this flash lottery',
      description_tr: 'Instagram Hikayende paylaş, bu flaş çekilişe anında katıl',
      prizeDescription: prizeDesc,
      prizeDescription_tr: prizeDescTr || prizeDesc,
      imageUrl,
      merchantName,
      totalWinners,
      endsAt
    });

    setIsAdding(false);
    setTitle('');
    setTitleTr('');
    setPrizeDesc('');
    setPrizeDescTr('');
    await fetchCampaigns();
  };

  const handleDrawWinner = async (campaignId: string) => {
    setIsDrawing(true);
    try {
      const result = await lotteryService.drawWinner(campaignId, 'admin');
      setDrawResult(result);

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });

      await fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Çekiliş yapılırken hata oluştu.');
    } finally {
      setIsDrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-rose-500" />
            <h2 className="text-xl font-black text-white">
              {isTr ? 'Flaş Çekiliş ve Viral Bilet Yönetimi' : 'Flash Lottery & Viral Draw Hub'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {isTr
              ? 'Instagram Story paylaşımlarını, OCR doğrulamalarını ve kriptografik rastgele çekilişleri yönetin.'
              : 'Manage Instagram Story shares, OCR verifications, and provably fair cryptographic winner draws.'}
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdding ? (isTr ? 'Formu Kapat' : 'Close Form') : (isTr ? 'Yeni Flaş Çekiliş Başlat' : 'New Flash Lottery')}</span>
        </button>
      </div>

      {/* DRAW RESULT MODAL / BANNER */}
      {drawResult && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-indigo-500/20 border-2 border-amber-400/60 p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h3 className="text-base font-black text-white">
                {isTr ? '🎉 Çekiliş Başarıyla Tamamlandı!' : '🎉 Draw Executed Successfully!'}
              </h3>
            </div>
            <button
              onClick={() => setDrawResult(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded-lg cursor-pointer"
            >
              {isTr ? 'Kapat' : 'Close'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {drawResult.winners.map((w, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1"
              >
                <span className="text-[10px] text-amber-400 font-bold block uppercase">
                  🏆 KAZANAN #{idx + 1}
                </span>
                <span className="text-sm font-bold text-white block">
                  {w.userName}
                </span>
                <span className="font-mono text-xs font-semibold text-rose-400 block">
                  Bilet No: {w.ticketNumber}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Seed: {drawResult.seed}
            </span>
            <span>{new Date(drawResult.drawnAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN FORM */}
      {isAdding && (
        <form
          onSubmit={handleCreateCampaign}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl animate-in fade-in duration-200"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {isTr ? 'Yeni Flaş Çekiliş Kampanyası Oluştur' : 'Create New Flash Giveaway Campaign'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Başlık (TR)</label>
              <input
                type="text"
                value={titleTr}
                onChange={e => setTitleTr(e.target.value)}
                placeholder="Örn: Kapadokya 2 Gece Mağara Otel & Balon Turu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Title (EN)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Cappadocia 2-Night Cave Hotel & Balloon Flight"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Ödül Açıklaması (TR)</label>
              <input
                type="text"
                value={prizeDescTr}
                onChange={e => setPrizeDescTr(e.target.value)}
                placeholder="Örn: 2 Kişilik Lüks Cave Suite + Sıcak Hava Balon Turu (₺34.500)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Prize Description (EN)</label>
              <input
                type="text"
                value={prizeDesc}
                onChange={e => setPrizeDesc(e.target.value)}
                placeholder="e.g. 2-Night Luxury Cave Suite for 2 + Balloon Flight"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Görsel URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Süre (Saat)</label>
                <input
                  type="number"
                  value={durationHours}
                  onChange={e => setDurationHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                  min={1}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Kazanan Sayısı</label>
                <input
                  type="number"
                  value={totalWinners}
                  onChange={e => setTotalWinners(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                  min={1}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
            >
              {isTr ? 'İptal' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-bold hover:from-rose-600 hover:to-amber-600 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isTr ? 'Kampanyayı Yayınla' : 'Publish Campaign'}</span>
            </button>
          </div>
        </form>
      )}

      {/* CAMPAIGNS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(camp => (
          <div
            key={camp.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between shadow-md hover:border-slate-700 transition-all"
          >
            <div>
              <div className="relative h-36 w-full">
                <img
                  src={camp.imageUrl}
                  alt={camp.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    camp.status === 'active'
                      ? 'bg-rose-500/90 text-white animate-pulse'
                      : 'bg-slate-800/90 text-slate-300'
                  }`}
                >
                  {camp.status === 'active' ? (isTr ? 'Aktif Çekiliş' : 'Active') : (isTr ? 'Sonuçlandı' : 'Drawn')}
                </span>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-sm font-bold text-white line-clamp-1">
                  {isTr ? camp.title_tr : camp.title}
                </h4>
                <p className="text-xs text-rose-300 font-semibold line-clamp-1">
                  🏆 {isTr ? camp.prizeDescription_tr : camp.prizeDescription}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-rose-400" />
                    {camp.totalTicketsMinted} {isTr ? 'Bilet' : 'Tickets'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    {camp.totalWinners} {isTr ? 'Kazanan' : 'Winners'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              {camp.status === 'active' ? (
                <button
                  onClick={() => handleDrawWinner(camp.id)}
                  disabled={isDrawing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>{isDrawing ? (isTr ? 'Çekiliş Yapılıyor...' : 'Drawing...') : (isTr ? 'Kazananı Çek (Provably Fair)' : 'Draw Winner (Provably Fair)')}</span>
                </button>
              ) : (
                <div className="py-2 rounded-xl bg-slate-950 text-center text-xs font-bold text-emerald-400 border border-slate-800">
                  ✓ {isTr ? 'Kazanan Belirlendi' : 'Winner Drawn'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
