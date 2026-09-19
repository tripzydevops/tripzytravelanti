import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Sparkles, Gift, CheckCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHapticFeedback } from '../../lib/hapticUtils';

export const MysteryScratchModal: React.FC = () => {
  const {
    isScratchModalOpen,
    closeScratchModal,
    claimScratchReward,
    gamificationState
  } = useGamification();
  const { language } = useLanguage();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [reward, setReward] = useState<{ type: 'xp' | 'points' | 'discount'; amount: number; title: string }>({
    type: 'points',
    amount: 50,
    title: language === 'tr' ? '50 Tripzy Puanı!' : '50 Tripzy Points!'
  });

  // Randomize prize on open
  useEffect(() => {
    if (isScratchModalOpen) {
      setIsScratched(false);
      const prizes: { type: 'xp' | 'points' | 'discount'; amount: number; title: string; title_tr: string }[] = [
        { type: 'points', amount: 50, title: '50 Tripzy Points!', title_tr: '50 Tripzy Puanı!' },
        { type: 'points', amount: 100, title: '100 Tripzy Points!', title_tr: '100 Tripzy Puanı!' },
        { type: 'xp', amount: 80, title: '+80 Explorer XP!', title_tr: '+80 Seyyah XP!' },
        { type: 'discount', amount: 15, title: '%15 Flash Boost!', title_tr: '%15 Flaş İndirim Takviyesi!' }
      ];
      const selected = prizes[Math.floor(Math.random() * prizes.length)];
      setReward({
        type: selected.type,
        amount: selected.amount,
        title: language === 'tr' ? selected.title_tr : selected.title
      });
    }
  }, [isScratchModalOpen, language]);

  // Setup scratch foil on canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Draw metallic silver/gold scratch foil
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#D4AF37');
    gradient.addColorStop(0.5, '#F3E5AB');
    gradient.addColorStop(1, '#AA7C11');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Add pattern & prompt text
    ctx.fillStyle = '#1e1e1e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      language === 'tr' ? '✨ Kazı & Ödülünü Gör ✨' : '✨ Scratch To Reveal ✨',
      rect.width / 2,
      rect.height / 2
    );
  }, [language]);

  useEffect(() => {
    if (isScratchModalOpen && !isScratched) {
      setTimeout(initCanvas, 50);
    }
  }, [isScratchModalOpen, isScratched, initCanvas]);

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2, false);
    ctx.fill();

    triggerHapticFeedback('light');

    // Check scratch completion percentage
    checkCompletion(ctx, rect.width, rect.height);
  };

  const checkCompletion = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    try {
      const imgData = ctx.getImageData(0, 0, width * 2, height * 2);
      let transparentPixels = 0;
      const totalPixels = imgData.data.length / 4;

      for (let i = 3; i < imgData.data.length; i += 16) {
        if (imgData.data[i] === 0) {
          transparentPixels += 4;
        }
      }

      if (transparentPixels / totalPixels > 0.35 && !isScratched) {
        setIsScratched(true);
        claimScratchReward(reward.type, reward.amount);
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 }
          });
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore security origin issue if any
    }
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isScratching) scratch(e.clientX, e.clientY);
  };
  const handleMouseUp = () => setIsScratching(false);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isScratching && e.touches.length > 0) {
      const touch = e.touches[0];
      scratch(touch.clientX, touch.clientY);
    }
  };
  const handleTouchEnd = () => setIsScratching(false);

  if (!isScratchModalOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-brand-primary/30 p-6 text-center space-y-5 shadow-2xl relative my-auto animate-scale-up">
        {/* Close Button */}
        <button
          onClick={closeScratchModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/30">
            <Sparkles className="w-3.5 h-3.5" />
            {language === 'tr' ? 'Günün Şanslı Kartı' : 'Daily Mystery Card'}
          </div>
          <h3 className="text-xl font-black text-white">
            {language === 'tr' ? 'Sürpriz Ödülü Aç!' : 'Reveal Your Surprise!'}
          </h3>
          <p className="text-white/60 text-xs">
            {language === 'tr'
              ? 'Kartın üzerini parmağınla veya farenle kazı'
              : 'Scratch the card surface to uncover your perk'}
          </p>
        </div>

        {/* Scratch Card Box */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500/20 via-orange-600/20 to-purple-600/20 border-2 border-brand-primary/40 flex items-center justify-center shadow-inner">
          {/* Revealed Reward Behind Foil */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-1 z-0">
            <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary mb-1">
              <Gift className="w-7 h-7" />
            </div>
            <span className="text-2xl font-black text-white drop-shadow">
              {reward.title}
            </span>
            <span className="text-xs text-brand-primary font-semibold">
              {language === 'tr' ? 'Hesabına eklendi! 🎉' : 'Added to your wallet! 🎉'}
            </span>
          </div>

          {/* Interactive Scratch Canvas */}
          {!isScratched && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          )}
        </div>

        {/* Action Button */}
        {isScratched ? (
          <button
            onClick={closeScratchModal}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary to-amber-500 text-black font-extrabold text-sm shadow-lg hover:opacity-95 transition-opacity"
          >
            {language === 'tr' ? 'Harika! Ödülü Al' : 'Awesome! Done'}
          </button>
        ) : (
          <button
            onClick={() => {
              setIsScratched(true);
              claimScratchReward(reward.type, reward.amount);
              try {
                confetti({ particleCount: 80, spread: 70 });
              } catch {}
            }}
            className="text-xs text-white/50 hover:text-white underline transition-colors"
          >
            {language === 'tr' ? 'Kazımadan direkt göster' : 'Quick reveal without scratching'}
          </button>
        )}
      </div>
    </div>,
    document.body
  ) : null;
};

export default MysteryScratchModal;
