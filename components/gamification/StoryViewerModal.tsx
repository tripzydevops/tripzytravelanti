import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, ChevronLeft, ChevronRight, MapPin, Tag, ExternalLink, Sparkles } from 'lucide-react';
import { triggerHapticFeedback } from '../../lib/hapticUtils';

const SLIDE_DURATION_MS = 5000;

export const StoryViewerModal: React.FC = () => {
  const {
    isStoryViewerOpen,
    activeStoryGroup,
    activeSlideIndex,
    closeStoryViewer,
    nextSlide,
    prevSlide
  } = useGamification();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeSlide = activeStoryGroup?.slides[activeSlideIndex];

  // Reset & start timer on slide change
  useEffect(() => {
    if (!isStoryViewerOpen || !activeStoryGroup || !activeSlide) return;

    setProgress(0);
    const stepTime = 50;
    const totalSteps = SLIDE_DURATION_MS / stepTime;
    let currentStep = 0;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      if (!isPaused) {
        currentStep += 1;
        setProgress((currentStep / totalSteps) * 100);
        if (currentStep >= totalSteps) {
          clearInterval(progressIntervalRef.current!);
          nextSlide();
        }
      }
    }, stepTime);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isStoryViewerOpen, activeStoryGroup, activeSlideIndex, isPaused, nextSlide, activeSlide]);

  // Keyboard controls
  useEffect(() => {
    if (!isStoryViewerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStoryViewer();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === ' ') setIsPaused((p) => !p);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStoryViewerOpen, closeStoryViewer, nextSlide, prevSlide]);

  if (!isStoryViewerOpen || !activeStoryGroup || !activeSlide) {
    return null;
  }

  const slideTitle = language === 'tr' ? (activeSlide.title_tr || activeSlide.title) : activeSlide.title;
  const slideSubtitle = language === 'tr' ? (activeSlide.subtitle_tr || activeSlide.subtitle) : activeSlide.subtitle;
  const ctaLabel = language === 'tr' ? (activeSlide.ctaText_tr || activeSlide.ctaText || 'Fırsatı İncele') : (activeSlide.ctaText || 'View Deal');
  const groupTitle = language === 'tr' ? (activeStoryGroup.title_tr || activeStoryGroup.title) : activeStoryGroup.title;

  const handleCtaClick = () => {
    triggerHapticFeedback('medium');
    closeStoryViewer();
    if (activeSlide.dealId) {
      navigate(`/deal/${activeSlide.dealId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center select-none overflow-hidden animate-fade-in">
      {/* Container simulating a mobile phone screen on desktop, full screen on mobile */}
      <div
        className="relative w-full h-full md:max-w-md md:h-[88vh] md:rounded-3xl overflow-hidden bg-zinc-900 shadow-2xl flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Background Image */}
        <img
          src={activeSlide.imageUrl}
          alt={slideTitle}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 z-10 pointer-events-none" />

        {/* Top Header & Progress Bars */}
        <div className="relative z-20 pt-4 px-4 pb-2">
          {/* Segmented Progress Bars */}
          <div className="flex gap-1.5 mb-3">
            {activeStoryGroup.slides.map((slide, idx) => {
              let fillPercent = 0;
              if (idx < activeSlideIndex) fillPercent = 100;
              else if (idx === activeSlideIndex) fillPercent = progress;

              return (
                <div key={slide.id || idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeStoryGroup.avatarUrl}
                alt={groupTitle}
                className="w-9 h-9 rounded-full object-cover border-2 border-brand-primary"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-sm drop-shadow">{groupTitle}</h3>
                  {activeSlide.tag && (
                    <span className="text-[10px] bg-brand-primary/80 text-white font-bold px-2 py-0.5 rounded-full">
                      {activeSlide.tag}
                    </span>
                  )}
                </div>
                {activeSlide.location && (
                  <p className="text-white/70 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand-primary" />
                    {activeSlide.location}
                  </p>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={closeStoryViewer}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors"
              aria-label="Close story"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle Tap Zones for Navigation */}
        <div className="absolute inset-0 z-15 flex">
          {/* Left Tap Zone */}
          <div
            className="w-1/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
          />
          {/* Right Tap Zone */}
          <div
            className="w-2/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
          />
        </div>

        {/* Bottom Story Content & CTA */}
        <div className="relative z-20 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white leading-tight drop-shadow-md">
              {slideTitle}
            </h2>
            {slideSubtitle && (
              <p className="text-white/90 text-sm font-medium drop-shadow">
                {slideSubtitle}
              </p>
            )}
          </div>

          {/* Action CTA Button */}
          <button
            onClick={handleCtaClick}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-primary via-amber-500 to-brand-primary text-black font-extrabold text-base shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] flex items-center justify-center gap-2 transform active:scale-98 transition-all"
          >
            <Sparkles className="w-5 h-5 text-black" />
            <span>{ctaLabel}</span>
            <ExternalLink className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryViewerModal;
