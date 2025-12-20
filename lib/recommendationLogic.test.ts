import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAIRecommendations } from './recommendationLogic';
import { User, Deal, SubscriptionTier } from '../types';

// Mock vectorService
vi.mock('./vectorService', () => ({
    querySimilarDeals: vi.fn().mockResolvedValue([]),
    rankDeals: vi.fn(),
    generateText: vi.fn().mockResolvedValue('')
}));

import { rankDeals } from './vectorService';

describe('getAIRecommendations', () => {
    const mockUser: User = {
        id: 'u1',
        name: 'Test User',
        email: 'test@example.com',
        tier: SubscriptionTier.FREE,
        walletLimit: 3,
        savedDeals: [],
        redemptions: [],
        preferences: { travelStyle: 'Any', budget: 'Any' } as any
    };

    const mockDeals: Deal[] = [
        { id: '1', title: 'Beach Resort', category: 'Travel', description: 'Lovely beach', key: 'val' } as any,
        { id: '2', title: 'City Hotel', category: 'Travel', description: 'City center', key: 'val' } as any,
        { id: '3', title: 'Mountain Cabin', category: 'Travel', description: 'Snowy', key: 'val' } as any,
    ];

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should use fallback deals when rankDeals returns no results', async () => {
        // Mock rankDeals to return empty array
        vi.mocked(rankDeals).mockResolvedValue([]);

        const recommendations = await getAIRecommendations(mockUser, mockDeals);

        expect(rankDeals).toHaveBeenCalled();
        expect(recommendations).toBeDefined();
        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should use fallback deals when rankDeals fails', async () => {
        // Mock rankDeals to throw error
        vi.mocked(rankDeals).mockRejectedValue(new Error('Edge Function Error'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const recommendations = await getAIRecommendations(mockUser, mockDeals);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AI Recommendation failed'), expect.any(Error));
        expect(recommendations).toBeDefined();
        expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return AI-ranked deals when rankDeals succeeds', async () => {
        // Mock rankDeals to return specific IDs
        vi.mocked(rankDeals).mockResolvedValue(['2', '1']);

        const recommendations = await getAIRecommendations(mockUser, mockDeals);

        expect(recommendations).toHaveLength(2);
        expect(recommendations[0].id).toBe('2');
        expect(recommendations[1].id).toBe('1');
    });
});

