import React, { useState, useEffect } from 'react';
import { Deal } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ClockIcon, ArrowRightIcon, HeartIcon } from './Icons';
import { Link } from 'react-router-dom';
import { logEngagementEvent } from '../lib/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { getThumbnailUrl } from '../lib/imageUtils';
import { useUserActivity } from '../contexts/UserActivityContext';

interface FlashDealCardProps {
    deal: Deal;
}

const FlashDealCard: React.FC<FlashDealCardProps> = ({ deal }) => {
    const { user } = useAuth();
    const { language, t } = useLanguage();
    const { saveDeal, unsaveDeal, isDealSaved } = useUserActivity();
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

    const isSaved = isDealSaved(deal.id);

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

    const handleSaveToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        if (isSaved) {
            unsaveDeal(deal.id);
        } else {
            saveDeal(deal.id);
        }
    };

    if (!timeLeft) return null;

    const title = language === 'tr' ? deal.title_tr : deal.title;
    const description = language === 'tr' ? deal.description_tr : deal.description;

    return (
        <div className="w-full max-w-5xl mx-auto mb-16 transform hover:scale-[1.005] transition-all duration-500">
            <div className="relative overflow-hidden rounded-[2.5rem] glass-premium shadow-2xl group">
                {/* Save Button (Floating) */}
                {user && (
                    <button
                        onClick={handleSaveToggle}
                        className="absolute top-6 right-6 z-30 p-3.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 hover:bg-black/60 transition-all duration-300 group/heart shadow-2xl"
                    >
                        <HeartIcon
                            className={`w-6 h-6 transition-all duration-500 ${isSaved
                                    ? 'text-gold-500 fill-gold-500 scale-110'
                                    : 'text-white group-hover/heart:scale-110 group-hover/heart:text-gold-400'
                                }`}
                        />
                    </button>
                )}

                <div className="relative flex flex-col lg:flex-row">
                    {/* Image Section - Landscape Immersive */}
                    <div className="lg:w-3/5 relative h-80 lg:h-auto overflow-hidden">
                        <div className="absolute top-6 left-6 z-10 bg-red-600 text-white px-4 py-1.5 rounded-lg font-black text-xs tracking-tighter shadow-2xl border border-white/20 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            {language === 'tr' ? 'FLAŞ FIRSAT' : 'FLASH DEAL'}
                        </div>

                        <img
                            src={getThumbnailUrl(deal.imageUrl)}
                            alt={title}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s] ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/60"></div>
                    </div>

                    {/* Content Section */}
                    <div className="lg:w-2/5 p-8 lg:p-12 flex flex-col justify-between relative">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[10px] font-black text-gold-500 uppercase tracking-[0.2em] border-b border-gold-500/30 pb-1">
                                    {language === 'tr' ? deal.category_tr : deal.category}
                                </span>
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                                    <ClockIcon className="w-5 h-5 text-gold-400 animate-pulse" />
                                    <span className="tabular-nums text-xl font-black text-white tracking-widest leading-none">
                                        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mb-4 opacity-60">
                                {deal.companyLogoUrl ? (
                                    <img src={deal.companyLogoUrl} alt={deal.vendor} className="w-6 h-6 rounded-full object-cover grayscale" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                        {deal.vendor.substring(0, 1)}
                                    </div>
                                )}
                                <span className="text-xs font-semibold tracking-widest uppercase">{deal.vendor}</span>
                            </div>

                            <h3 className="text-3xl lg:text-4xl font-heading font-black text-white mb-4 leading-[1.15]">
                                {title}
                            </h3>
                            <p className="text-white/60 mb-8 line-clamp-3 text-lg font-medium leading-relaxed">
                                {description}
                            </p>
                        </div>

                        <div className="flex flex-col gap-8 mt-auto">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-4 mb-1">
                                    <span className="text-5xl font-black text-white">
                                        ₺{deal.discountedPrice.toLocaleString()}
                                    </span>
                                    {deal.discountPercentage && (
                                        <span className="bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-1 rounded text-xs font-black">
                                            -{deal.discountPercentage}%
                                        </span>
                                    )}
                                </div>
                                <span className="text-white/30 text-lg line-through font-medium">
                                    ₺{deal.originalPrice.toLocaleString()}
                                </span>
                            </div>

                            <Link
                                to={`/deals/${deal.id}`}
                                onClick={() => logEngagementEvent(user?.id, 'click', deal.id, { source: 'FlashDealCard' })}
                                className="group w-full flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black text-lg hover:bg-gold-500 hover:text-white transition-all duration-300 transform active:scale-[0.98] shadow-2xl shadow-gold-500/10"
                            >
                                {language === 'tr' ? 'FIRSATI YAKALA' : 'SECURE DEAL'}
                                <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlashDealCard;
