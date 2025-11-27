import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, ChevronRightIcon } from './Icons';

interface OnboardingProps {
    onComplete: (preferences: UserPreferences) => void;
}

export interface UserPreferences {
    travelStyle: 'beach' | 'mountain' | 'city' | 'adventure';
    budget: 'budget' | 'moderate' | 'luxury';
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [preferences, setPreferences] = useState<UserPreferences>({
        travelStyle: 'beach',
        budget: 'moderate',
    });

    const totalSteps = 5;

    // Preload images
    useEffect(() => {
        const images = [
            'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop', // General/Start
            'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop', // Nature
            '/assets/onboarding/beach.jpg', // Beach
            '/assets/onboarding/mountain.jpg', // Mountain
            '/assets/onboarding/city.jpg', // City
            '/assets/onboarding/adventure.jpg', // Adventure
        ];
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    const travelStyles = [
        { key: 'beach' as const, emoji: '🏖️', label: t('travelStyleBeach') || 'Beach & Relaxation', image: '/assets/onboarding/beach.jpg' },
        { key: 'mountain' as const, emoji: '🏔️', label: t('travelStyleMountain') || 'Mountain & Nature', image: '/assets/onboarding/mountain.jpg' },
        { key: 'city' as const, emoji: '🏙️', label: t('travelStyleCity') || 'City & Culture', image: '/assets/onboarding/city.jpg' },
        { key: 'adventure' as const, emoji: '🪂', label: t('travelStyleAdventure') || 'Adventure & Sports', image: '/assets/onboarding/adventure.jpg' },
    ];

    const budgetOptions = [
        { key: 'budget' as const, emoji: '💰', label: t('budgetBudget') || 'Budget Friendly', description: t('budgetBudgetDesc') || 'Best value deals' },
        { key: 'moderate' as const, emoji: '💎', label: t('budgetModerate') || 'Moderate', description: t('budgetModerateDesc') || 'Quality & comfort' },
        { key: 'luxury' as const, emoji: '👑', label: t('budgetLuxury') || 'Luxury', description: t('budgetLuxuryDesc') || 'Premium experiences' },
    ];

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            onComplete(preferences);
        }
    };

    const handleSkip = () => {
        onComplete(preferences);
    };

    const getBackgroundImage = () => {
        if (step === 4 && preferences.travelStyle) {
            const style = travelStyles.find(s => s.key === preferences.travelStyle);
            if (style) return style.image;
        }
        switch (step) {
            case 1: return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';
            case 2: return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop';
            case 3: return 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop';
            default: return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2070&auto=format&fit=crop';
        }
    };

    const variants = {
        enter: { opacity: 0, y: 20 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black font-sans">
            {/* Dynamic Background */}
            <motion.div
                key={step}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 z-0"
            >
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                    style={{ backgroundImage: `url(${getBackgroundImage()})` }}
                />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[4px]" />
            </motion.div>

            {/* Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-4xl mx-4 md:mx-0 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                <div className="p-8 md:p-12 flex flex-col items-center text-center">

                    {/* Progress Bar */}
                    <div className="flex gap-2 mb-8">
                        {[...Array(totalSteps)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 <= step ? 'w-12 bg-white' : 'w-12 bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="w-full max-w-2xl min-h-[400px] flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="w-full"
                            >
                                {step === 1 && (
                                    <div className="flex flex-col items-center">
                                        <div className="text-8xl mb-6 animate-bounce-slow">🌍</div>
                                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                                            {t('onboardingBenefit1Title')}
                                        </h2>
                                        <p className="text-xl text-white/90 leading-relaxed max-w-lg mx-auto drop-shadow-md">
                                            {t('onboardingBenefit1Desc')}
                                        </p>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="flex flex-col items-center">
                                        <div className="text-8xl mb-6 animate-bounce-slow">🎟️</div>
                                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                                            {t('onboardingBenefit2Title')}
                                        </h2>
                                        <p className="text-xl text-white/90 leading-relaxed max-w-lg mx-auto drop-shadow-md">
                                            {t('onboardingBenefit2Desc')}
                                        </p>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="flex flex-col items-center">
                                        <div className="text-8xl mb-6 animate-bounce-slow">⭐</div>
                                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                                            {t('onboardingBenefit3Title')}
                                        </h2>
                                        <p className="text-xl text-white/90 leading-relaxed max-w-lg mx-auto drop-shadow-md">
                                            {t('onboardingBenefit3Desc')}
                                        </p>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="flex flex-col items-center w-full">
                                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                                            {t('onboardingTravelStyleQuestion')}
                                        </h2>
                                        <p className="text-white/80 mb-8 text-lg drop-shadow-md">
                                            {t('onboardingTravelStyleSubtitle')}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                            {travelStyles.map((style) => (
                                                <button
                                                    key={style.key}
                                                    onClick={() => setPreferences({ ...preferences, travelStyle: style.key })}
                                                    className={`group relative p-6 rounded-2xl border transition-all duration-300 overflow-hidden flex items-center gap-4 ${preferences.travelStyle === style.key
                                                        ? 'border-white bg-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                                                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                                                        {style.emoji}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-lg font-bold text-white block">{style.label}</span>
                                                    </div>
                                                    {preferences.travelStyle === style.key && (
                                                        <div className="absolute top-4 right-4 text-white">
                                                            <CheckCircle className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="flex flex-col items-center w-full">
                                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                                            {t('onboardingBudgetQuestion')}
                                        </h2>
                                        <p className="text-white/80 mb-8 text-lg drop-shadow-md">
                                            {t('onboardingBudgetSubtitle')}
                                        </p>
                                        <div className="space-y-4 w-full max-w-lg mx-auto">
                                            {budgetOptions.map((option) => (
                                                <button
                                                    key={option.key}
                                                    onClick={() => setPreferences({ ...preferences, budget: option.key })}
                                                    className={`w-full flex items-center p-5 rounded-2xl border transition-all duration-300 ${preferences.budget === option.key
                                                        ? 'border-white bg-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)]'
                                                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <span className="text-4xl mr-5">{option.emoji}</span>
                                                    <div className="flex-1 text-left">
                                                        <div className="text-white font-bold text-lg">{option.label}</div>
                                                        <div className="text-white/60 text-sm">{option.description}</div>
                                                    </div>
                                                    {preferences.budget === option.key && (
                                                        <div className="text-white">
                                                            <CheckCircle className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer Navigation */}
                    <div className="w-full flex items-center justify-between mt-12 pt-6 border-t border-white/10">
                        <button
                            onClick={handleSkip}
                            className="text-white/70 hover:text-white text-base font-medium transition-colors px-6 py-2"
                        >
                            {t('skip')}
                        </button>

                        <div className="text-white/50 text-sm italic hidden md:block">
                            "{t('onboardingQuote')}"
                        </div>

                        <button
                            onClick={handleNext}
                            className="group flex items-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 hover:scale-105"
                        >
                            {step === totalSteps ? t('getStarted') : t('next')}
                            <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
