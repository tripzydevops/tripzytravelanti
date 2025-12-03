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
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-brand-surface shadow-2xl border border-brand-primary/20">
                {/* Animated Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary via-purple-500 to-brand-secondary opacity-10 animate-pulse"></div>

                <div className="relative flex flex-col md:flex-row">
                    {/* Image Section */}
                    <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
                        <div className="absolute top-4 left-4 z-10 bg-red-600 text-white px-4 py-1 rounded-full font-bold text-sm animate-bounce shadow-lg">
                            FLASH DEAL ⚡
                        </div>
                        <img
                            src={deal.imageUrl}
                            alt={title}
                            className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r"></div>
                    </div>

                    {/* Content Section */}
                    <div className="md:w-1/2 p-8 flex flex-col justify-between relative">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {language === 'tr' ? deal.category_tr : deal.category}
                                </span>
                                <div className="flex items-center text-red-500 font-bold bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                                    <ClockIcon className="w-5 h-5 mr-2 animate-pulse" />
                                    <span className="tabular-nums text-lg">
                                        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                                {title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 line-clamp-2 text-lg">
                                {description}
                            </p>
                        </div>

                        <div className="flex items-end justify-between mt-auto">
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-sm line-through font-medium">
                                    ${deal.originalPrice}
                                </span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-extrabold text-brand-primary">
                                        ${deal.discountedPrice}
                                    </span>
                                    {deal.discountPercentage && (
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-sm font-bold">
                                            -{deal.discountPercentage}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            <Link
                                to={`/deal/${deal.id}`}
                                className="group flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary dark:hover:text-white transition-all duration-300 shadow-lg hover:shadow-brand-primary/30"
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
