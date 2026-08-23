import React, { useState } from 'react';
import { Deal } from '../types';
import { CheckCircle, CalendarIcon, CopyIcon, CheckIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface RedeemedVoucherCardProps {
    deal: Deal & {
        walletStatus?: string;
        acquiredAt?: string;
        redemptionCode?: string;
    };
}

export const RedeemedVoucherCard: React.FC<RedeemedVoucherCardProps> = ({ deal }) => {
    const { t, language } = useLanguage();
    const [copied, setCopied] = useState(false);

    const title = language === 'tr' && deal.title_tr ? deal.title_tr : deal.title;
    const redemptionCode = deal.redemptionCode || deal.redemption_code || 'TRIPZY-VERIFIED';

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(redemptionCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const savings = (deal.originalPrice || 0) - (deal.discountedPrice || 0);

    return (
        <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/15 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-gold-500/50 hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] group">
            {/* Top Verification Banner */}
            <div className="bg-gradient-to-r from-emerald-600/90 via-emerald-500/90 to-emerald-600/90 px-4 py-2 flex items-center justify-between text-white text-xs font-bold tracking-wider uppercase">
                <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-white drop-shadow" />
                    <span>{language === 'tr' ? 'KULLANILDI & ONAYLANDI' : 'REDEEMED & VERIFIED'}</span>
                </div>
                {savings > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-black">
                        +{savings.toLocaleString()} ₺ {language === 'tr' ? 'Tasarruf' : 'Saved'}
                    </span>
                )}
            </div>

            {/* Main Ticket Body */}
            <div className="p-5 flex flex-col justify-between h-[calc(100%-36px)]">
                <div>
                    {/* Merchant & Title */}
                    <div className="flex items-start gap-3.5 mb-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-white/15 bg-black/40 shadow-inner">
                            <img src={deal.imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-gold-400 font-bold uppercase tracking-wider block mb-1">
                                {deal.vendor}
                            </span>
                            <h3 className="text-base font-bold text-white leading-snug truncate">
                                {title}
                            </h3>
                            <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5 text-gold-500/80" />
                                <span>{deal.acquiredAt ? new Date(deal.acquiredAt).toLocaleDateString() : 'Recently Used'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Perforated Stub Divider */}
                    <div className="relative my-3 flex items-center justify-between">
                        <div className="w-4 h-8 bg-brand-bg rounded-r-full -ml-5 border-r border-t border-b border-white/10" />
                        <div className="flex-1 border-t-2 border-dashed border-white/15 mx-2" />
                        <div className="w-4 h-8 bg-brand-bg rounded-l-full -mr-5 border-l border-t border-b border-white/10" />
                    </div>

                    {/* Voucher Code Box */}
                    <div className="bg-black/40 border border-gold-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-inner">
                        <div>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">
                                {language === 'tr' ? 'Kullanım Kodu' : 'Voucher Code'}
                            </span>
                            <span className="font-mono text-sm font-black text-gold-400 tracking-wider">
                                {redemptionCode}
                            </span>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-xl bg-white/10 hover:bg-gold-500 hover:text-white text-white/80 transition-all active:scale-95"
                            title={language === 'tr' ? 'Kodu Kopyala' : 'Copy Code'}
                        >
                            {copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Bottom Footer Note */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                    <span>TRIPZY GUARANTEE</span>
                    <span className="text-emerald-400 font-bold">✓ Complete</span>
                </div>
            </div>
        </div>
    );
};

export default RedeemedVoucherCard;
