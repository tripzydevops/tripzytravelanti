import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateLevelFromXP,
  claimDailyStreakReward,
  fetchStories,
  getSeenStoryIds,
  markStoryAsSeen,
  DEFAULT_STAMPS,
  DEFAULT_RAFFLES
} from '../../lib/services/gamificationService';
import { UserGamificationState, Deal, SubscriptionTier } from '../../types';

describe('Gamification & Social Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('calculateLevelFromXP', () => {
    it('should correctly assign Level 1 for 0 - 199 XP', () => {
      const res = calculateLevelFromXP(50);
      expect(res.level).toBe(1);
      expect(res.levelTitle).toBe('Bronze Wanderer');
      expect(res.levelTitle_tr).toBe('Bronz Gezgin');
      expect(res.xpForNextLevel).toBe(200);
    });

    it('should correctly assign Level 2 for 200 - 499 XP', () => {
      const res = calculateLevelFromXP(250);
      expect(res.level).toBe(2);
      expect(res.levelTitle).toBe('Silver Adventurer');
      expect(res.levelTitle_tr).toBe('Gümüş Gezgin');
      expect(res.xpForNextLevel).toBe(500);
    });

    it('should correctly assign Level 3 for 500 - 999 XP', () => {
      const res = calculateLevelFromXP(750);
      expect(res.level).toBe(3);
      expect(res.levelTitle).toBe('Gold Explorer');
      expect(res.levelTitle_tr).toBe('Altın Kaşif');
      expect(res.xpForNextLevel).toBe(1000);
    });

    it('should correctly assign Level 4 VIP for 1000+ XP', () => {
      const res = calculateLevelFromXP(1200);
      expect(res.level).toBe(4);
      expect(res.levelTitle).toBe('VIP Jetsetter');
      expect(res.levelTitle_tr).toBe('VIP Seyyah');
    });
  });

  describe('claimDailyStreakReward', () => {
    it('should award streak XP and update streak count on consecutive day', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const initialState: UserGamificationState = {
        level: 1,
        levelTitle: 'Bronze Wanderer',
        levelTitle_tr: 'Bronz Gezgin',
        xp: 100,
        xpForNextLevel: 200,
        streakDays: 3,
        lastStreakClaimDate: yesterday,
        canClaimDailyStreak: true,
        canScratchCard: false,
        stamps: DEFAULT_STAMPS,
        totalSavedAmount: 0
      };

      const { updatedState, xpEarned, pointsEarned } = claimDailyStreakReward('test-user', initialState);

      expect(updatedState.streakDays).toBe(4);
      expect(xpEarned).toBeGreaterThan(25);
      expect(pointsEarned).toBe(10);
      expect(updatedState.canClaimDailyStreak).toBe(false);
      expect(updatedState.canScratchCard).toBe(true);
      expect(updatedState.xp).toBe(100 + xpEarned);
    });

    it('should reset broken streak if user missed more than 1 day', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const initialState: UserGamificationState = {
        level: 1,
        levelTitle: 'Bronze Wanderer',
        levelTitle_tr: 'Bronz Gezgin',
        xp: 100,
        xpForNextLevel: 200,
        streakDays: 5,
        lastStreakClaimDate: fourDaysAgo,
        canClaimDailyStreak: true,
        canScratchCard: false,
        stamps: DEFAULT_STAMPS,
        totalSavedAmount: 0
      };

      const { updatedState } = claimDailyStreakReward('test-user', initialState);
      expect(updatedState.streakDays).toBe(1);
    });
  });

  describe('Stories & Seen State', () => {
    it('should track and mark seen story IDs in localStorage', () => {
      expect(getSeenStoryIds()).toEqual([]);
      markStoryAsSeen('story-flash-drops');
      expect(getSeenStoryIds()).toContain('story-flash-drops');
    });

    it('should generate dynamic stories from active deals with seen state', async () => {
      const mockDeals: Deal[] = [
        {
          id: 'deal-1',
          title: '40% Off Dining',
          title_tr: '%40 Yemek İndirimi',
          description: 'Great meal',
          description_tr: 'Harika yemek',
          imageUrl: 'https://example.com/meal.jpg',
          category: 'Dining',
          category_tr: 'Yemek',
          originalPrice: 200,
          discountedPrice: 120,
          discountPercentage: 40,
          requiredTier: SubscriptionTier.FREE,
          isExternal: false,
          vendor: 'Bosphorus Grill',
          expiresAt: '2026-12-31',
          rating: 4.8,
          ratingCount: 15,
          usageLimit: '1',
          usageLimit_tr: '1',
          validity: '1 year',
          validity_tr: '1 yıl',
          termsUrl: '',
          redemptionCode: 'BOSPHORUS40'
        }
      ];

      markStoryAsSeen('story-flash-drops');
      const stories = await fetchStories(mockDeals);

      expect(stories.length).toBeGreaterThan(0);
      const flashGroup = stories.find((s) => s.id === 'story-flash-drops');
      expect(flashGroup).toBeDefined();
      expect(flashGroup?.isSeen).toBe(true);
    });
  });

  describe('Catalog & Raffles Integrity', () => {
    it('should have properly structured Turkish and English default stamps', () => {
      expect(DEFAULT_STAMPS.length).toBeGreaterThanOrEqual(4);
      DEFAULT_STAMPS.forEach((stamp) => {
        expect(stamp.id).toBeDefined();
        expect(stamp.name).toBeDefined();
        expect(stamp.name_tr).toBeDefined();
        expect(stamp.xpReward).toBeGreaterThan(0);
      });
    });

    it('should have properly structured default social media raffles with quests', () => {
      expect(DEFAULT_RAFFLES.length).toBeGreaterThanOrEqual(2);
      DEFAULT_RAFFLES.forEach((raffle) => {
        expect(raffle.title).toBeDefined();
        expect(raffle.title_tr).toBeDefined();
        expect(raffle.quests.length).toBeGreaterThan(0);
        expect(raffle.quests.some((q) => q.actionType === 'instagram_follow')).toBe(true);
      });
    });
  });
});
