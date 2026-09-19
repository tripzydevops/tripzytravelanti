import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Ticket,
  Instagram,
  Share2,
  UploadCloud,
  CheckCircle2,
  Copy,
  Clock,
  Award,
  Coins,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Download
} from 'lucide-react';
import { LotteryCampaign, LotteryTicket } from '../../types';
import { lotteryService } from '../../lib/services/lotteryService';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface FlashLotteryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: LotteryCampaign | null;
  onTicketMinted?: (ticket: LotteryTicket) => void;
}

export const FlashLotteryModal: React.FC<FlashLotteryModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onTicketMinted
}) => {
  const { user } = useAuth();
  const { state: gamificationState, addXp } = useGamification();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [activeTab, setActiveTab] = useState<'share' | 'ocr' | 'points'>('share');
  const [copied, setCopied] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const [ocrErrorMsg, setOcrErrorMsg] = useState<string | null>(null);
  const [userTickets, setUserTickets] = useState<LotteryTicket[]>(campaign?.userTickets || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !campaign) return null;

  const referralCode = user?.id ? `TRPZ-${user.id.slice(0, 6).toUpperCase()}` : 'TRPZ-VIP';
  const shareUrl = `${window.location.origin}/#/deal/${campaign.dealId || 'featured'}?ref=${referralCode}&lottery=${campaign.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToInstagramStory = async () => {
    setIsMinting(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign.title_tr,
          text: `Tripzy ile ${campaign.prizeDescription_tr} çekilişine katıl! @tripzy.travel`,
          url: shareUrl
        });
      } else {
        handleCopyLink();
      }

      // Mint verified ticket
      const res = await lotteryService.claimTicket(
        campaign.id,
        user?.id || 'demo-user',
        'story_canvas'
      );

      if (res.success && res.ticket) {
        setUserTickets(prev => [res.ticket!, ...prev]);
        addXp(50);
        if (onTicketMinted) onTicketMinted(res.ticket);
      }
    } catch (err) {
      console.warn('Share cancelled or error:', err);
    } finally {
      setIsMinting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningOCR(true);
    setOcrSuccessMsg(null);
    setOcrErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await lotteryService.verifyStoryOCR(
          base64,
          campaign.id,
          user?.id || 'demo-user'
        );

        if (res.success && res.ticket) {
          setUserTickets(prev => [res.ticket!, ...prev]);
          setOcrSuccessMsg(res.message);
          addXp(75);
          if (onTicketMinted) onTicketMinted(res.ticket);
        } else {
          setOcrErrorMsg(res.message || 'Ekran görüntüsü doğrulanamadı.');
        }
      } catch {
        setOcrErrorMsg('Görsel taranırken bir hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setIsScanningOCR(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePointsExchange = async () => {
    setIsMinting(true);
    try {
      const res = await lotteryService.claimTicket(
        campaign.id,
        user?.id || 'demo-user',
        'points_exchange'
      );
      if (res.success && res.ticket) {
        setUserTickets(prev => [res.ticket!, ...prev]);
        addXp(25);
        if (onTicketMinted) onTicketMinted(res.ticket);
      }
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with image banner */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          <img
            src={campaign.imageUrl}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/70 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge & Title */}
          <div className="absolute bottom-4 left-6 right-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-bold uppercase mb-2 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-rose-300" />
              {isTr ? 'Flaş Çekiliş & %100 Ücretsiz Ödül' : 'Flash Giveaway & 100% Free Prize'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {isTr ? campaign.title_tr : campaign.title}
            </h2>
            <p className="text-xs sm:text-sm text-rose-300 font-semibold mt-0.5">
              🏆 {isTr ? campaign.prizeDescription_tr : campaign.prizeDescription}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab('share')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'share'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Instagram className="w-4 h-4" />
              {isTr ? 'Story Canvas Paylaş' : 'Share Story Canvas'}
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'ocr'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              {isTr ? 'AI Vision OCR Yükle' : 'AI Vision OCR'}
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'points'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-4 h-4 text-amber-400" />
              {isTr ? 'Puanla Bilet Al' : 'Use Points'}
            </button>
          </div>

          {/* TAB 1: STORY CANVAS SHARING */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 flex flex-col sm:flex-row items-center gap-4">
                {/* Simulated 9:16 Story Canvas Preview Card */}
                <div className="w-36 h-56 rounded-2xl bg-gradient-to-b from-indigo-900 via-rose-950 to-slate-950 p-2 border-2 border-rose-500/50 shadow-xl flex flex-col justify-between flex-shrink-0 relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[8px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase">
                      TRIPZY FLASH
                    </span>
                    <p className="text-[10px] font-black text-white leading-tight line-clamp-2">
                      {isTr ? campaign.title_tr : campaign.title}
                    </p>
                  </div>

                  <div className="my-auto text-center space-y-1">
                    <div className="w-12 h-12 mx-auto bg-white rounded-lg p-1 shadow">
                      <QrCode className="w-full h-full text-slate-900" />
                    </div>
                    <span className="text-[8px] font-mono text-amber-400 font-bold">
                      {referralCode}
                    </span>
                  </div>

                  <div className="text-[8px] text-center font-bold text-slate-300 bg-black/40 py-1 rounded">
                    @tripzy.travel
                  </div>
                </div>

                {/* Instructions & CTA */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-white">
                    {isTr ? '1. Hikayende Paylaş, Anında Bilet Kazan' : '1. Share on Story, Mint Instant Ticket'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isTr
                      ? 'Yukarıdaki Story Canvas görselini Instagram Hikayende @tripzy.travel etiketleyerek paylaş. Paylaşım tamamlandığında çekiliş biletin hesabına otomatik eklenir.'
                      : 'Share this Story Canvas to your Instagram Story tagging @tripzy.travel. Your lottery ticket will be automatically minted.'}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={handleShareToInstagramStory}
                      disabled={isMinting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg cursor-pointer transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{isMinting ? (isTr ? 'Bilet Üretiliyor...' : 'Minting Ticket...') : (isTr ? 'Hikayede Paylaş & Bilet Kazan' : 'Share & Mint Ticket')}</span>
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copied ? (isTr ? 'Kopyalandı!' : 'Copied!') : (isTr ? 'Linki Kopyala' : 'Copy Link')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI VISION OCR SCREENSHOT UPLOAD */}
          {activeTab === 'ocr' && (
            <div className="space-y-4 text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-rose-500/70 rounded-2xl p-6 bg-slate-950/40 transition-colors cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  {isScanningOCR
                    ? (isTr ? '🔍 Yapay Zeka Hikayeyi Doğruluyor...' : '🔍 AI Vision Verifying Story...')
                    : (isTr ? 'Story Ekran Görüntüsünü Yükle' : 'Upload Story Screenshot')}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {isTr
                    ? '@tripzy.travel etiketli Instagram Hikayenizin ekran görüntüsünü seçin. Vision OCR 2 saniyede doğrulayacaktır.'
                    : 'Select a screenshot of your Instagram Story tagging @tripzy.travel. Vision OCR verifies in <2 seconds.'}
                </p>
              </div>

              {ocrSuccessMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{ocrSuccessMsg}</span>
                </div>
              )}

              {ocrErrorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{ocrErrorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: POINTS EXCHANGE */}
          {activeTab === 'points' && (
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-5 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {isTr ? '50 Tripzy Puanı = 1 Flaş Çekiliş Bileti' : '50 Tripzy Points = 1 Flash Ticket'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {isTr
                    ? 'Mevcut seyahat ve check-in puanlarınızı kullanarak şansınızı katlayın.'
                    : 'Multiply your chances using your travel & check-in reward points.'}
                </p>
              </div>

              <button
                onClick={handlePointsExchange}
                disabled={isMinting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg cursor-pointer transition-all"
              >
                {isTr ? '50 Puan Karşılığında Bilet Al' : 'Redeem 50 Pts for Ticket'}
              </button>
            </div>
          )}

          {/* ACTIVE TICKETS DRAWER */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-rose-400" />
                {isTr ? 'Bu Çekilişteki Biletleriniz' : 'Your Tickets in this Draw'} ({userTickets.length})
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isTr ? 'Kriptografik Olarak Doğrulandı' : 'Provably Fair Seed'}
              </span>
            </div>

            {userTickets.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
                {isTr ? 'Henüz biletiniz yok. Yukarıdan paylaşarak ilk biletinizi ücretsiz alın!' : 'No tickets yet. Share above to mint your first ticket for free!'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {userTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-rose-400 text-xs tracking-wider">
                        {ticket.ticketNumber}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {isTr ? 'Doğrulandı' : 'Verified'} • {ticket.verificationMethod}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {isTr ? 'Aktif' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
