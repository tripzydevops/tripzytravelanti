import React from 'react';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sparkles, Flame, Plus } from 'lucide-react';

interface StoriesBarProps {
  onAddStoryClick?: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ onAddStoryClick }) => {
  const { storyGroups, openStoryViewer } = useGamification();
  const { language } = useLanguage();

  if (!storyGroups || storyGroups.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-3 px-4 flex items-center gap-4 select-none">
      {storyGroups.map((group) => {
        const title = language === 'tr' ? (group.title_tr || group.title) : group.title;
        const isSeen = group.isSeen;

        return (
          <button
            key={group.id}
            onClick={() => openStoryViewer(group)}
            className="flex flex-col items-center flex-shrink-0 group cursor-pointer focus:outline-none transition-transform active:scale-95"
            aria-label={`View story: ${title}`}
          >
            {/* Story Avatar Circle with Instagram Animated Gradient Ring */}
            <div className="relative p-[2.5px] rounded-full">
              <div
                className={`absolute inset-0 rounded-full transition-all duration-500 ${
                  isSeen
                    ? 'bg-white/20'
                    : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 animate-pulse-slow shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                }`}
              />
              <div className="relative p-[2px] bg-brand-bg rounded-full">
                <img
                  src={group.avatarUrl}
                  alt={title}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* Live / Flash Badge */}
              {group.isLive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-md border border-white/20 flex items-center gap-0.5 tracking-wider">
                  <Flame className="w-2.5 h-2.5 fill-current animate-bounce" />
                  FLAŞ
                </span>
              )}
            </div>

            {/* Story Title */}
            <span
              className={`text-[11px] sm:text-xs mt-1.5 font-medium tracking-tight max-w-[72px] truncate text-center transition-colors ${
                isSeen ? 'text-white/60' : 'text-white font-semibold'
              }`}
            >
              {title}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StoriesBar;
