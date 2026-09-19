import React, { useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Share2,
  Copy,
  Check,
  Instagram,
  Sparkles,
  Download,
  Compass,
  Ticket
} from 'lucide-react';
import { triggerHapticFeedback } from '../../lib/hapticUtils';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareType: 'deal' | 'passport' | 'raffle' | 'referral';
  title: string;
  subtitle?: string;
  discountPercentage?: number;
  dealImageUrl?: string;
  referralCode?: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  shareType,
  title,
  subtitle,
  discountPercentage,
  dealImageUrl,
  referralCode
}) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const code = referralCode || user?.referralCode || 'TRIPZY';
  const shareUrl = `${window.location.origin}/?ref=${code}`;
  const shareText = language === 'tr'
    ? `Tripzy.travel ile Türkiye'nin en iyi otel, restoran ve seyahat fırsatlarında indirim kazandım! Kodumla katıl: ${code}`
    : `I just unlocked exclusive travel discounts with Tripzy! Join with my code: ${code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    triggerHapticFeedback('light');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    triggerHapticFeedback('medium');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tripzy.travel',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-brand-primary/30 p-6 space-y-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/30">
            <Instagram className="w-3.5 h-3.5" />
            {language === 'tr' ? 'Instagram Hikayende Paylaş' : 'Share to Instagram Story'}
          </div>
          <h3 className="text-xl font-black text-white">
            {language === 'tr' ? 'Arkadaşlarınla Paylaş & Kazan' : 'Share & Earn Rewards'}
          </h3>
        </div>

        {/* Visual Story Voucher Card Preview */}
        <div
          ref={cardRef}
          className="relative w-full rounded-2xl overflow-hidden p-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border-2 border-brand-primary/40 shadow-xl space-y-4 text-center"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center text-black font-black text-sm">
                T
              </div>
              <span className="text-white font-extrabold text-sm tracking-wider">TRIPZY.TRAVEL</span>
            </div>
            {discountPercentage && (
              <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow">
                -%{discountPercentage}
              </span>
            )}
          </div>

          {dealImageUrl && (
            <div className="relative h-32 rounded-xl overflow-hidden">
              <img src={dealImageUrl} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          )}

          <div className="space-y-1 text-left">
            <h4 className="text-white font-extrabold text-base leading-snug">{title}</h4>
            {subtitle && <p className="text-white/70 text-xs">{subtitle}</p>}
          </div>

          {/* Referral Banner in Story */}
          <div className="p-2.5 rounded-xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-wider text-brand-primary block font-bold">
                {language === 'tr' ? 'DAVET KODUM' : 'REFERRAL CODE'}
              </span>
              <span className="text-sm font-black text-white">{code}</span>
            </div>
            <span className="text-[10px] text-white/80 bg-white/10 px-2 py-1 rounded-lg">
              +100 Puan
            </span>
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleNativeShare}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-extrabold text-sm shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {language === 'tr' ? 'Hikayede veya WhatsApp\'ta Paylaş' : 'Share to Story / WhatsApp'}
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? (language === 'tr' ? 'Bağlantı Kopyalandı!' : 'Link Copied!') : (language === 'tr' ? 'Davet Bağlantısını Kopyala' : 'Copy Referral Link')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialShareModal;
