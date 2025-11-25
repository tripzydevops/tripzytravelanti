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
        if (step === 1) {
            setStep(2);
        } else {
            onComplete(preferences);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-bg z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full">
                {/* Progress Indicator */}
                <div className="flex gap-2 mb-8">
                    <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-brand-primary' : 'bg-brand-surface'}`}></div>
                    <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-brand-primary' : 'bg-brand-surface'}`}></div>
                </div>

                {step === 1 && (
                    <div className="animate-slide-up">
                        <h2 className="text-3xl font-heading font-bold text-brand-text-light mb-2">
                            {t('onboardingWelcome') || 'Welcome to Tripzy! ✨'}
                        </h2>
                        <p className="text-brand-text-muted mb-8">
                            {t('onboardingTravelStyleQuestion') || 'What\'s your ideal travel style?'}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {travelStyles.map((style) => (
                                <button
                                    key={style.key}
                                    onClick={() => setPreferences({ ...preferences, travelStyle: style.key })}
                                    className={`card text-center p-6 transition-all duration-300 hover:scale-105 ${preferences.travelStyle === style.key
                                            ? 'ring-2 ring-brand-primary shadow-lg shadow-brand-primary/30'
                                            : 'hover:border-brand-primary/50'
                                        }`}
                                >
                                    <div className="text-5xl mb-3">{style.emoji}</div>
                                    <div className="text-sm font-semibold text-brand-text-light">{style.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-slide-up">
                        <h2 className="text-3xl font-heading font-bold text-brand-text-light mb-2">
                            {t('onboardingBudgetQuestion') || 'What\'s your budget preference?'}
                        </h2>
                        <p className="text-brand-text-muted mb-8">
                            {t('onboardingBudgetSubtitle') || 'We\'ll show you the best deals for your style'}
                        </p>

                        <div className="space-y-4 mb-8">
                            {budgetOptions.map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => setPreferences({ ...preferences, budget: option.key })}
                                    className={`card w-full text-left p-6 transition-all duration-300 hover:scale-[1.02] ${preferences.budget === option.key
                                            ? 'ring-2 ring-brand-primary shadow-lg shadow-brand-primary/30'
                                            : 'hover:border-brand-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-4xl">{option.emoji}</div>
                                        <div className="flex-1">
                                            <div className="text-lg font-semibold text-brand-text-light mb-1">{option.label}</div>
                                            <div className="text-sm text-brand-text-muted">{option.description}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 rounded-xl font-semibold text-brand-text-light bg-brand-surface hover:bg-brand-surface/80 transition-all"
                        >
                            {t('back') || 'Back'}
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        className="btn-primary flex-1"
                    >
                        {step === 2 ? (t('getStarted') || 'Get Started') : (t('next') || 'Next')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
