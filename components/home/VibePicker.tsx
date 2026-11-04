import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { signalCollector } from '../../lib/signalCollector';
import { Coffee, Palmtree, Compass, Landmark, Sparkles, ShoppingBag, Check } from 'lucide-react';

export interface VibeItem {
  id: string;
  key: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const TURKEY_VIBES: VibeItem[] = [
  { id: 'vibe-gourmet', key: 'vibeGourmet', category: 'food', icon: Coffee, color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30' },
  { id: 'vibe-coast', key: 'vibeCoast', category: 'hotel', icon: Palmtree, color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'vibe-adventure', key: 'vibeAdventure', category: 'activity', icon: Compass, color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30' },
  { id: 'vibe-history', key: 'vibeHistory', category: 'tour', icon: Landmark, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'vibe-spa', key: 'vibeSpa', category: 'activity', icon: Sparkles, color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30' },
  { id: 'vibe-bazaar', key: 'vibeBazaar', category: 'transport', icon: ShoppingBag, color: 'from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30' },
];

interface VibePickerProps {
  onVibeChange: (category: string | null) => void;
  selectedCategory: string | null;
}

export const VibePicker: React.FC<VibePickerProps> = ({ onVibeChange, selectedCategory }) => {
  const { t } = useLanguage();
  const [activeVibeId, setActiveVibeId] = useState<string | null>(null);

  useEffect(() => {
    // Check if there is already an active cold start vibe stored
    const stored = signalCollector.getActiveVibe();
    if (stored && !selectedCategory) {
      setActiveVibeId(stored.vibeId);
      if (stored.category) {
        onVibeChange(stored.category);
      }
    }
  }, []);

  const handleVibeClick = (vibe: VibeItem) => {
    if (activeVibeId === vibe.id) {
      // Toggle off
      setActiveVibeId(null);
      onVibeChange(null);
    } else {
      setActiveVibeId(vibe.id);
      signalCollector.recordVibe(vibe.id, t(vibe.key), vibe.category);
      onVibeChange(vibe.category);
    }
  };

  const handleClear = () => {
    setActiveVibeId(null);
    onVibeChange(null);
  };

  return (
    <div className="w-full my-3 px-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {t('vibePickerTitle')}
          </span>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            • {t('vibePickerSubtitle')}
          </span>
        </div>
        {activeVibeId && (
          <button
            onClick={handleClear}
            className="text-[11px] text-gray-400 hover:text-amber-300 transition-colors underline cursor-pointer"
          >
            {t('vibeAll')}
          </button>
        )}
      </div>

      {/* Horizontal Scroll Pill Container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none scroll-smooth">
        {TURKEY_VIBES.map((vibe) => {
          const Icon = vibe.icon;
          const isActive = activeVibeId === vibe.id || selectedCategory === vibe.category;

          return (
            <button
              key={vibe.id}
              onClick={() => handleVibeClick(vibe)}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-400 text-white shadow-lg shadow-amber-500/10 scale-102'
                  : 'bg-gray-800/60 hover:bg-gray-800 border-gray-700/60 text-gray-300 hover:border-gray-600'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-gray-700/50 text-gray-400'}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span>{t(vibe.key)}</span>
              {isActive && <Check className="w-3 h-3 text-amber-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
