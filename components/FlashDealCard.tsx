import React, { useState, useEffect } from 'react';
import { Deal } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ClockIcon, ArrowRightIcon } from './Icons';
import { Link } from 'react-router-dom';

interface FlashDealCardProps {
    deal: Deal;
}

const FlashDealCard: React.FC<FlashDealCardProps> = ({ deal }) => {
    const { language, t } = useLanguage();
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        if (!deal.flash_end_time) return;

        const calculateTimeLeft = () => {
            const difference = +new Date(deal.flash_end_time!) - +new Date();

            if (difference > 0) {
                return {
                    hours: Math.floor((difference / (1000 * 60 * 60))),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            }
            return null;
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [deal.flash_end_time]);

    if (!timeLeft) return null; // Don't show if expired or no time set

    const title = language === 'tr' ? deal.title_tr : deal.title;
    const description = language === 'tr' ? deal.description_tr : deal.description;

    return (
        <div className="w-full max-w-4xl mx-auto mb-12 transform hover:scale-[1.01] transition-all duration-300">
            <div className="relative overflow-hidden rounded-3xl bg-[#0f172a]/80 backdrop-blur-md shadow-2xl border border-gold-500/30 group">
                {/* Animated Gold Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-gold-500/10 via-purple-500/10 to-gold-500/10 animate-pulse pointer-events-none"></div>

                <div className="relative flex flex-col md:flex-row">
                    {/* Image Section */}
                    <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden group">
                        <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-1.5 rounded-full font-bold text-sm animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-white/20 backdrop-blur-md">
                            FLASH DEAL ⚡
                        </div>
                        <img
                            src={deal.imageUrl}
                            alt={title}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0f172a]/90"></div>
                    </div>

                    {/* Content Section */}
                    <div className="md:w-1/2 p-8 flex flex-col justify-between relative bg-[#0f172a]/40">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="bg-gold-500/10 border border-gold-500/20 text-gold-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                    {language === 'tr' ? deal.category_tr : deal.category}
                                </span>
                                <div className="flex items-center text-gold-500 font-bold bg-[#0f172a]/60 px-3 py-1.5 rounded-xl border border-gold-500/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                                    <ClockIcon className="w-5 h-5 mr-2 animate-pulse text-gold-400" />
                                    <span className="tabular-nums text-lg font-mono tracking-widest text-gold-300">
                                        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-3xl font-heading font-bold text-white mb-3 leading-tight drop-shadow-md">
                                {title}
                            </h3>
                            <p className="text-white/70 mb-6 line-clamp-2 text-lg font-light">
                                {description}
                            </p>
                        </div>

                        <div className="flex items-end justify-between mt-auto">
                            <div className="flex flex-col">
                                <span className="text-white/40 text-sm line-through font-medium mb-1">
                                    ₺{deal.originalPrice}
                                </span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-500 to-gold-400 shadow-sm">
                                        ₺{deal.discountedPrice}
                                    </span>
                                    {deal.discountPercentage && (
                                        <span className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 px-2 py-1 rounded-lg text-sm font-bold backdrop-blur-sm">
                                            -{deal.discountPercentage}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            <Link
                                to={`/deal/${deal.id}`}
                                className="group flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 text-white px-8 py-3 rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95"
                            >
                                {t('viewDeal') || 'View Deal'}
                                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlashDealCard;
