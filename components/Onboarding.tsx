import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronRightIcon, CheckCircle, SunIcon, MountainIcon, BuildingOfficeIcon, Compass } from './Icons';

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
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop', // Beach
            'https://images.unsplash.com/photo-1519677100203-a0e668c92439?q=80&w=2072&auto=format&fit=crop', // Mountain
            'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop', // City
        ];
        images.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    const travelStyles = [
        { key: 'beach' as const, icon: SunIcon, label: t('travelStyleBeach') || 'Beach & Relaxation', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop' },
        { key: 'mountain' as const, icon: MountainIcon, label: t('travelStyleMountain') || 'Mountain & Nature', image: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?q=80&w=2072&auto=format&fit=crop' },
        { key: 'city' as const, icon: BuildingOfficeIcon, label: t('travelStyleCity') || 'City & Culture', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop' },
        { key: 'adventure' as const, icon: Compass, label: t('travelStyleAdventure') || 'Adventure & Sports', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=2070&auto=format&fit=crop' },
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
        enter: { opacity: 0, x: 50 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
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
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            </motion.div>

            {/* Content Card */}
            <div className="relative z-10 w-full max-w-5xl h-full md:h-auto md:min-h-[600px] flex flex-col md:flex-row bg-white/10 backdrop-blur-xl rounded-none md:rounded-3xl shadow-2xl overflow-hidden border border-white/20">

                {/* Left Panel - Progress & Info */}
                <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col justify-between bg-black/20 text-white border-b md:border-b-0 md:border-r border-white/10">
                    <div>
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center font-bold text-white">
                                T
                            </div>
                            <span className="font-bold text-xl tracking-tight">Tripzy</span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-2">
                                {[...Array(totalSteps)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 <= step ? 'w-8 bg-brand-primary' : 'w-2 bg-white/20'
                                            }`}
                                    />
                                ))}
                            </div>
                            <p className="text-white/60 text-sm font-medium">
                                {t('step')} {step} / {totalSteps}
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <p className="text-white/80 text-sm leading-relaxed">
                            "{t('onboardingQuote') || 'Travel is the only thing you buy that makes you richer.'}"
                        </p>
                    </div>
                </div>

                {/* Right Panel - Interactive Content */}
                <div className="w-full md:w-2/3 p-8 md:p-12 flex flex-col bg-white/5">
                    <div className="flex-1 flex items-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="w-full"
                            >
                                {step === 1 && (
                                    <div className="text-center md:text-left">
                                        <div className="text-6xl mb-6 animate-bounce-slow inline-block">🌍</div>
                                        <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                                            {t('onboardingBenefit1Title')}
                                        </h2>
                                        <p className="text-xl text-white/80 leading-relaxed">
                                            {t('onboardingBenefit1Desc')}
                                        </p>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="text-center md:text-left">
                                        <div className="text-6xl mb-6 animate-bounce-slow inline-block">🎟️</div>
                                        <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                                            {t('onboardingBenefit2Title')}
                                        </h2>
                                        <p className="text-xl text-white/80 leading-relaxed">
                                            {t('onboardingBenefit2Desc')}
                                        </p>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="text-center md:text-left">
                                        <div className="text-6xl mb-6 animate-bounce-slow inline-block">⭐</div>
                                        <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                                            {t('onboardingBenefit3Title')}
                                        </h2>
                                        <p className="text-xl text-white/80 leading-relaxed">
                                            {t('onboardingBenefit3Desc')}
                                        </p>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div>
                                        <h2 className="text-3xl font-bold text-white mb-2 text-center md:text-left">
                                            {t('onboardingTravelStyleQuestion')}
                                        </h2>
                                        <p className="text-white/60 mb-8 text-center md:text-left">
                                            {t('onboardingTravelStyleSubtitle') || 'Select your preferred way to travel'}
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {travelStyles.map((style) => (
                                                <button
                                                    key={style.key}
                                                    onClick={() => setPreferences({ ...preferences, travelStyle: style.key })}
                                                    className={`group relative p-4 rounded-xl border transition-all duration-300 overflow-hidden ${preferences.travelStyle === style.key
                                                        ? 'border-brand-primary bg-brand-primary/20 shadow-[0_0_20px_rgba(0,169,145,0.3)]'
                                                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="flex flex-col items-center justify-center relative z-10">
                                                        <style.icon className={`w-12 h-12 mb-3 transition-transform duration-300 group-hover:scale-110 ${preferences.travelStyle === style.key ? 'text-brand-primary' : 'text-white'
                                                            }`} />
                                                        <span className="text-sm font-semibold text-white">{style.label}</span>
                                                    </div>
                                                    {preferences.travelStyle === style.key && (
                                                        <div className="absolute top-2 right-2 text-brand-primary">
                                                            <CheckCircle className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div>
                                        <h2 className="text-3xl font-bold text-white mb-2 text-center md:text-left">
                                            {t('onboardingBudgetQuestion')}
                                        </h2>
                                        <p className="text-white/60 mb-8 text-center md:text-left">
                                            {t('onboardingBudgetSubtitle')}
                                        </p>
                                        <div className="space-y-4">
                                            {budgetOptions.map((option) => (
                                                <button
                                                    key={option.key}
                                                    onClick={() => setPreferences({ ...preferences, budget: option.key })}
                                                    className={`w-full flex items-center p-4 rounded-xl border transition-all duration-300 ${preferences.budget === option.key
                                                        ? 'border-brand-primary bg-brand-primary/20 shadow-[0_0_20px_rgba(0,169,145,0.3)]'
                                                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <span className="text-3xl mr-4">{option.emoji}</span>
                                                    <div className="flex-1 text-left">
                                                        <div className="text-white font-semibold">{option.label}</div>
                                                        <div className="text-white/50 text-sm">{option.description}</div>
                                                    </div>
                                                    {preferences.budget === option.key && (
                                                        <div className="text-brand-primary">
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

                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                        <button
                            onClick={handleSkip}
                            className="text-white/50 hover:text-white text-sm font-medium transition-colors px-4 py-2"
                        >
                            {t('skip')}
                        </button>
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
