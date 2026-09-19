import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useUserActivity } from './UserActivityContext';
import { triggerHapticFeedback } from '../lib/hapticUtils';
import {
  StoryGroup,
  StorySlide,
  UserGamificationState,
  Raffle,
  TravelPassportStamp
} from '../types';
import {
  fetchStories,
  markStoryAsSeen,
  getLocalGamificationState,
  saveLocalGamificationState,
  claimDailyStreakReward,
  fetchRaffles,
  DEFAULT_STAMPS
} from '../lib/services/gamificationService';
import { addUserPoints, burnUserPoints } from '../lib/services/loyaltyService';

export interface GamificationContextType {
  // Stories State
  storyGroups: StoryGroup[];
  activeStoryGroup: StoryGroup | null;
  activeSlideIndex: number;
  isStoryViewerOpen: boolean;
  openStoryViewer: (group: StoryGroup, slideIndex?: number) => void;
  closeStoryViewer: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  markGroupSeen: (groupId: string) => void;

  // Gamification Profile & Passport
  gamificationState: UserGamificationState;
  claimStreak: () => Promise<{ xpEarned: number; pointsEarned: number } | null>;
  claimScratchReward: (rewardType: 'xp' | 'points' | 'discount', amount: number) => Promise<void>;
  unlockStamp: (stampSlug: string) => void;

  // Social Raffles State
  raffles: Raffle[];
  completeRaffleQuest: (raffleId: string, questId: string) => Promise<boolean>;
  buyRaffleTicketWithPoints: (raffleId: string, questId: string, pointsCost: number) => Promise<boolean>;

  // Scratch Modal & Celebrations
  isScratchModalOpen: boolean;
  openScratchModal: () => void;
  closeScratchModal: () => void;
  isStreakModalOpen: boolean;
  openStreakModal: () => void;
  closeStreakModal: () => void;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { bufferSignal } = useUserActivity();

  // Stories
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);

  // Gamification Profile
  const [gamificationState, setGamificationState] = useState<UserGamificationState>(() =>
    getLocalGamificationState(user?.id || 'guest-user')
  );

  // Raffles
  const [raffles, setRaffles] = useState<Raffle[]>([]);

  // Modals
  const [isScratchModalOpen, setIsScratchModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchStories([]).then(setStoryGroups).catch(console.error);
    fetchRaffles().then(setRaffles).catch(console.error);
  }, []);

  // Sync state when user changes
  useEffect(() => {
    const state = getLocalGamificationState(user?.id || 'guest-user');
    setGamificationState(state);
  }, [user]);

  // =====================================================
  // STORIES ACTIONS
  // =====================================================
  const openStoryViewer = useCallback((group: StoryGroup, slideIndex: number = 0) => {
    setActiveStoryGroup(group);
    setActiveSlideIndex(slideIndex);
    setIsStoryViewerOpen(true);
    triggerHapticFeedback('light');

    // Mark as seen
    markStoryAsSeen(group.id);
    setStoryGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, isSeen: true } : g))
    );

    // Buffer signal for recommendation engine
    bufferSignal('story_view', group.id, {
      category: group.category,
      slideCount: group.slides.length
    });
  }, [bufferSignal]);

  const closeStoryViewer = useCallback(() => {
    setIsStoryViewerOpen(false);
    setActiveStoryGroup(null);
    setActiveSlideIndex(0);
  }, []);

  const nextSlide = useCallback(() => {
    if (!activeStoryGroup) return;
    if (activeSlideIndex < activeStoryGroup.slides.length - 1) {
      setActiveSlideIndex((prev) => prev + 1);
    } else {
      // Find next story group
      const currentIdx = storyGroups.findIndex((g) => g.id === activeStoryGroup.id);
      if (currentIdx !== -1 && currentIdx < storyGroups.length - 1) {
        const nextGroup = storyGroups[currentIdx + 1];
        setActiveStoryGroup(nextGroup);
        setActiveSlideIndex(0);
        markStoryAsSeen(nextGroup.id);
        setStoryGroups((prev) =>
          prev.map((g) => (g.id === nextGroup.id ? { ...g, isSeen: true } : g))
        );
      } else {
        closeStoryViewer();
      }
    }
  }, [activeStoryGroup, activeSlideIndex, storyGroups, closeStoryViewer]);

  const prevSlide = useCallback(() => {
    if (!activeStoryGroup) return;
    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1);
    } else {
      // Go to previous story group
      const currentIdx = storyGroups.findIndex((g) => g.id === activeStoryGroup.id);
      if (currentIdx > 0) {
        const prevGroup = storyGroups[currentIdx - 1];
        setActiveStoryGroup(prevGroup);
        setActiveSlideIndex(prevGroup.slides.length - 1);
      }
    }
  }, [activeStoryGroup, activeSlideIndex, storyGroups]);

  const markGroupSeen = useCallback((groupId: string) => {
    markStoryAsSeen(groupId);
    setStoryGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isSeen: true } : g))
    );
  }, []);

  // =====================================================
  // STREAK & SCRATCH ACTIONS
  // =====================================================
  const claimStreak = useCallback(async () => {
    if (!gamificationState.canClaimDailyStreak) return null;

    const userId = user?.id || 'guest-user';
    const { updatedState, xpEarned, pointsEarned } = claimDailyStreakReward(userId, gamificationState);
    setGamificationState(updatedState);
    triggerHapticFeedback('medium');

    // Award real loyalty points to user profile in Supabase
    if (user && pointsEarned > 0) {
      try {
        await addUserPoints(
          user.id,
          pointsEarned,
          'earn_streak',
          'streak_day',
          String(updatedState.streakDays),
          undefined,
          { streakDays: updatedState.streakDays }
        );
      } catch (e) {
        console.warn('Failed to sync streak points to ledger:', e);
      }
    }

    bufferSignal('daily_streak_claim', `streak-${updatedState.streakDays}`, {
      streakDays: updatedState.streakDays,
      xpEarned,
      pointsEarned
    });

    return { xpEarned, pointsEarned };
  }, [gamificationState, user, bufferSignal]);

  const claimScratchReward = useCallback(async (rewardType: 'xp' | 'points' | 'discount', amount: number) => {
    const userId = user?.id || 'guest-user';
    const newXP = rewardType === 'xp' ? gamificationState.xp + amount : gamificationState.xp + 10;
    const { calculateLevelFromXP } = await import('../lib/services/gamificationService');
    const levelInfo = calculateLevelFromXP(newXP);

    const updatedState: UserGamificationState = {
      ...gamificationState,
      xp: newXP,
      level: levelInfo.level,
      levelTitle: levelInfo.levelTitle,
      levelTitle_tr: levelInfo.levelTitle_tr,
      xpForNextLevel: levelInfo.xpForNextLevel,
      canScratchCard: false
    };

    setGamificationState(updatedState);
    saveLocalGamificationState(userId, updatedState);
    triggerHapticFeedback('heavy');

    if (user && rewardType === 'points') {
      try {
        await addUserPoints(
          user.id,
          amount,
          'earn_campaign',
          'mystery_scratch',
          new Date().toISOString(),
          undefined,
          { rewardType, amount }
        );
      } catch (e) {
        console.warn('Failed to sync scratch points:', e);
      }
    }

    bufferSignal('scratch_reward_claimed', `scratch-${rewardType}`, { rewardType, amount });
  }, [gamificationState, user, bufferSignal]);

  const unlockStamp = useCallback((stampSlug: string) => {
    const userId = user?.id || 'guest-user';
    const updatedStamps = gamificationState.stamps.map((s) => {
      if (s.slug === stampSlug && !s.isUnlocked) {
        return {
          ...s,
          isUnlocked: true,
          unlockedAt: new Date().toISOString()
        };
      }
      return s;
    });

    const targetStamp = gamificationState.stamps.find((s) => s.slug === stampSlug);
    const addedXP = targetStamp?.xpReward || 50;

    const newTotalXP = gamificationState.xp + addedXP;
    import('../lib/services/gamificationService').then(({ calculateLevelFromXP }) => {
      const levelInfo = calculateLevelFromXP(newTotalXP);
      const updatedState: UserGamificationState = {
        ...gamificationState,
        stamps: updatedStamps,
        xp: newTotalXP,
        level: levelInfo.level,
        levelTitle: levelInfo.levelTitle,
        levelTitle_tr: levelInfo.levelTitle_tr,
        xpForNextLevel: levelInfo.xpForNextLevel
      };
      setGamificationState(updatedState);
      saveLocalGamificationState(userId, updatedState);
      triggerHapticFeedback('heavy');
    });

    bufferSignal('passport_stamp_unlocked', stampSlug, { stampSlug });
  }, [gamificationState, user, bufferSignal]);

  // =====================================================
  // RAFFLE ACTIONS
  // =====================================================
  const completeRaffleQuest = useCallback(async (raffleId: string, questId: string): Promise<boolean> => {
    let ticketsEarned = 0;

    setRaffles((prevRaffles) =>
      prevRaffles.map((raffle) => {
        if (raffle.id !== raffleId) return raffle;

        const updatedQuests = raffle.quests.map((q) => {
          if (q.id === questId && !q.isCompleted) {
            ticketsEarned = q.ticketsReward;
            return { ...q, isCompleted: true };
          }
          return q;
        });

        return {
          ...raffle,
          quests: updatedQuests,
          userTickets: raffle.userTickets + ticketsEarned,
          totalTickets: raffle.totalTickets + ticketsEarned
        };
      })
    );

    if (ticketsEarned > 0) {
      triggerHapticFeedback('medium');
      bufferSignal('raffle_quest_completed', `${raffleId}:${questId}`, {
        raffleId,
        questId,
        ticketsEarned
      });
      return true;
    }
    return false;
  }, [bufferSignal]);

  const buyRaffleTicketWithPoints = useCallback(async (
    raffleId: string,
    questId: string,
    pointsCost: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      await burnUserPoints(
        user.id,
        pointsCost,
        'burn_reward',
        'raffle_ticket',
        raffleId,
        { raffleId, questId, pointsCost }
      );

      setRaffles((prevRaffles) =>
        prevRaffles.map((raffle) => {
          if (raffle.id !== raffleId) return raffle;

          const updatedQuests = raffle.quests.map((q) => {
            if (q.id === questId) {
              return { ...q, isCompleted: true };
            }
            return q;
          });

          return {
            ...raffle,
            quests: updatedQuests,
            userTickets: raffle.userTickets + 1,
            totalTickets: raffle.totalTickets + 1
          };
        })
      );

      triggerHapticFeedback('heavy');
      bufferSignal('raffle_points_ticket_purchased', raffleId, { pointsCost });
      return true;
    } catch (err) {
      console.error('Failed to buy raffle ticket with points:', err);
      return false;
    }
  }, [user, bufferSignal]);

  const openScratchModal = useCallback(() => setIsScratchModalOpen(true), []);
  const closeScratchModal = useCallback(() => setIsScratchModalOpen(false), []);
  const openStreakModal = useCallback(() => setIsStreakModalOpen(true), []);
  const closeStreakModal = useCallback(() => setIsStreakModalOpen(false), []);

  return (
    <GamificationContext.Provider
      value={{
        storyGroups,
        activeStoryGroup,
        activeSlideIndex,
        isStoryViewerOpen,
        openStoryViewer,
        closeStoryViewer,
        nextSlide,
        prevSlide,
        markGroupSeen,
        gamificationState,
        claimStreak,
        claimScratchReward,
        unlockStamp,
        raffles,
        completeRaffleQuest,
        buyRaffleTicketWithPoints,
        isScratchModalOpen,
        openScratchModal,
        closeScratchModal,
        isStreakModalOpen,
        openStreakModal,
        closeStreakModal
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = (): GamificationContextType => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
