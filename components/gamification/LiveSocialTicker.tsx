import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sparkles, Flame, CheckCircle, Gift } from 'lucide-react';

const LIVE_EVENTS = [
  {
    icon: 'flame',
    user: 'Ayşe K.',
    city: 'Kadıköy, İstanbul',
    action: 'saved 180₺ at Bi Special Meze',
    action_tr: 'Bi Special Meze\'de 180₺ tasarruf etti',
    time: '2 dk önce'
  },
  {
    icon: 'stamp',
    user: 'Emre T.',
    city: 'Kapadokya',
    action: 'unlocked Cappadocia Wanderer Stamp',
    action_tr: 'Kapadokya Seyyahı damgasını kazandı',
    time: '5 dk önce'
  },
  {
    icon: 'gift',
    user: 'Deniz A.',
    city: 'Bodrum',
    action: 'joined Bodrum Luxury Getaway Raffle',
    action_tr: 'Bodrum Tatili Çekilişine 3 biletle katıldı',
    time: '8 dk önce'
  },
  {
    icon: 'flame',
    user: 'Burak Y.',
    city: 'Beşiktaş, İstanbul',
    action: 'saved 250₺ on Bosphorus Sunset Dinner',
    action_tr: 'Boğaz Yemeğinde 250₺ indirim kullandı',
    time: '12 dk önce'
  }
];

export const LiveSocialTicker: React.FC = () => {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const current = LIVE_EVENTS[currentIndex];

  return (
    <div className="mx-4 my-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-between gap-2 overflow-hidden shadow-sm transition-all">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-2 w-2 relative flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>

        <p className="text-white/80 text-[11px] sm:text-xs truncate">
          <span className="font-bold text-white">{current.user}</span>{' '}
          <span className="text-white/50">({current.city})</span>{' '}
          <span className="text-amber-400 font-medium">
            {language === 'tr' ? current.action_tr : current.action}
          </span>
        </p>
      </div>

      <span className="text-[10px] text-white/40 flex-shrink-0 font-medium">
        {current.time}
      </span>
    </div>
  );
};

export default LiveSocialTicker;
