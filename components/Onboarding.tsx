import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

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

    const travelStyles = [
        { key: 'beach' as const, emoji: '🏖️', label: t('travelStyleBeach') || 'Beach & Relaxation' },
        { key: 'mountain' as const, emoji: '⛰️', label: t('travelStyleMountain') || 'Mountain & Nature' },
        { key: 'city' as const, emoji: '🏙️', label: t('travelStyleCity') || 'City & Culture' },
        { key: 'adventure' as const, emoji: '🎒', label: t('travelStyleAdventure') || 'Adventure & Sports' },
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

    const renderBenefitSlide = (titleKey: string, descKey: string, emoji: string) => (
        <div className="animate-slide-up text-center">
            <div className="text-6xl mb-6 animate-bounce-slow">{emoji}</div>
            <h2 className="text-3xl font-heading font-bold text-brand-text-light mb-4">
                {t(titleKey)}
            </h2>
            <p className="text-lg text-brand-text-muted mb-8">
                {t(descKey)}
            </p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-brand-bg/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full bg-white dark:bg-brand-surface rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary to-brand-secondary"></div>

                {/* Progress Indicator */}
                <div className="flex gap-2 mb-8 justify-center">
                    {[...Array(totalSteps)].map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 === step ? 'w-8 bg-brand-primary' :
                                i + 1 < step ? 'w-2 bg-brand-primary/50' : 'w-2 bg-gray-200 dark:bg-gray-700'
                                }`}
                        ></div>
                    ))}
                </div>

                {/* Content */}
                <div className="min-h-[300px] flex flex-col justify-center">
                    {step === 1 && renderBenefitSlide('onboardingBenefit1Title', 'onboardingBenefit1Desc', '🌍')}
                    {step === 2 && renderBenefitSlide('onboardingBenefit2Title', 'onboardingBenefit2Desc', '🎟️')}
                    {step === 3 && renderBenefitSlide('onboardingBenefit3Title', 'onboardingBenefit3Desc', '⭐')}

                    {step === 4 && (
                        <div className="animate-slide-up">
                            <h2 className="text-2xl font-heading font-bold text-brand-text-light mb-2 text-center">
                                {t('onboardingWelcome')}
                            </h2>
                            <p className="text-brand-text-muted mb-6 text-center">
                                {t('onboardingTravelStyleQuestion')}
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {travelStyles.map((style) => (
                                    <button
                                        key={style.key}
                                        onClick={() => setPreferences({ ...preferences, travelStyle: style.key })}
                                        className={`card text-center p-4 transition-all duration-300 hover:scale-105 ${preferences.travelStyle === style.key
                                            ? 'ring-2 ring-brand-primary shadow-lg shadow-brand-primary/30 bg-brand-primary/5'
                                            : 'hover:border-brand-primary/50'
                                            }`}
                                    >
                                        <div className="text-4xl mb-2">{style.emoji}</div>
                                        <div className="text-sm font-semibold text-brand-text-light">{style.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="animate-slide-up">
                            <h2 className="text-2xl font-heading font-bold text-brand-text-light mb-2 text-center">
                                {t('onboardingBudgetQuestion')}
                            </h2>
                            <p className="text-brand-text-muted mb-6 text-center">
                                {t('onboardingBudgetSubtitle')}
                            </p>

                            <div className="space-y-3">
                                {budgetOptions.map((option) => (
                                    <button
                                        key={option.key}
                                        onClick={() => setPreferences({ ...preferences, budget: option.key })}
                                        className={`card w-full text-left p-4 transition-all duration-300 hover:scale-[1.02] ${preferences.budget === option.key
                                            ? 'ring-2 ring-brand-primary shadow-lg shadow-brand-primary/30 bg-brand-primary/5'
                                            : 'hover:border-brand-primary/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">{option.emoji}</div>
                                            <div className="flex-1">
                                                <div className="text-base font-semibold text-brand-text-light">{option.label}</div>
                                                <div className="text-xs text-brand-text-muted">{option.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-4 mt-8">
                    <button
                        onClick={handleSkip}
                        className="px-4 py-3 rounded-xl font-medium text-brand-text-muted hover:text-brand-text-light transition-colors"
                    >
                        {t('skip')}
                    </button>
                    <button
                        onClick={handleNext}
                        className="btn-primary flex-1 shadow-lg shadow-brand-primary/25"
                    >
                        {step === totalSteps ? t('getStarted') : t('next')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
