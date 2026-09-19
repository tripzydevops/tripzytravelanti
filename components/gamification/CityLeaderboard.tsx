import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trophy, Medal, Crown, Sparkles, MapPin, Award } from 'lucide-react';
import { fetchWeeklyLeaderboard } from '../../lib/services/gamificationService';
import { LeaderboardEntry } from '../../types';

export const CityLeaderboard: React.FC = () => {
  const { language } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyLeaderboard().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/30">
          <Crown className="w-4 h-4 fill-current" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-zinc-950 font-black">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-white font-black">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    return (
      <span className="w-8 h-8 flex items-center justify-center text-white/40 font-bold text-sm">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black shadow">
            <Trophy className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {language === 'tr' ? 'Haftalık Seyahat Liderleri' : 'Weekly Travel Leaderboard'}
            </h3>
            <p className="text-white/50 text-xs">
              {language === 'tr' ? 'Türkiye geneli en çok tasarruf sağlayan kaşifler' : 'Top savers & explorers across Turkey'}
            </p>
          </div>
        </div>

        <span className="text-[11px] text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-1 rounded-full font-bold">
          {language === 'tr' ? 'Haftalık Sıralama' : 'Weekly Live'}
        </span>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2.5">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              entry.rank === 1
                ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-amber-500/40 shadow-lg'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            {/* Rank & User Info */}
            <div className="flex items-center gap-3 min-w-0">
              {getRankBadge(entry.rank)}

              <div className="relative">
                <img
                  src={
                    entry.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={entry.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                />
                <span className="absolute -bottom-1 -right-1 text-[9px] bg-brand-primary text-black font-extrabold px-1 rounded-full">
                  L{entry.level}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-sm truncate">{entry.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-semibold uppercase">
                    {entry.tier}
                  </span>
                </div>
                {entry.city && (
                  <span className="text-white/40 text-xs flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {entry.city} • {entry.stampsUnlocked} Damga
                  </span>
                )}
              </div>
            </div>

            {/* Savings Total */}
            <div className="text-right flex-shrink-0">
              <span className="text-sm sm:text-base font-extrabold text-amber-400 block">
                {entry.totalSaved.toLocaleString('tr-TR')} ₺
              </span>
              <span className="text-[10px] text-white/40 block">
                {language === 'tr' ? 'Tasarruf' : 'Saved'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CityLeaderboard;
