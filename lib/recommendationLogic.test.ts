import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAIRecommendations } from './recommendationLogic';
import { User, Deal, SubscriptionTier } from '../types';

// Mock GoogleGenAI to ensure we don't actually call it (though we expect it not to be called)
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn(),
}));

describe('getAIRecommendations', () => {
    const mockUser: User = {
        id: 'u1',
        name: 'Test User',
        email: 'test@example.com',
        subscriptionTier: SubscriptionTier.FREE,
        walletLimit: 3,
        savedDeals: [],
        redemptions: [],
        preferences: { travelStyle: 'Any', budget: 'Any' }
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

    it('should gracefully handle missing API key and return fallback deals', async () => {
        // Mock environment variable to be empty
        vi.stubEnv('VITE_GEMINI_API_KEY', '');

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const recommendations = await getAIRecommendations(mockUser, mockDeals);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Gemini API Key is missing or invalid'));
        expect(recommendations).toBeDefined();
        expect(recommendations.length).toBeGreaterThan(0);
        // Ensure it didn't crash
    });

    it('should gracefully handle PLACEHOLDER_API_KEY and return fallback deals', async () => {
        // Mock environment variable to be placeholder
        vi.stubEnv('VITE_GEMINI_API_KEY', 'PLACEHOLDER_API_KEY');

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const recommendations = await getAIRecommendations(mockUser, mockDeals);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Gemini API Key is missing or invalid'));
        expect(recommendations).toBeDefined();
        expect(recommendations.length).toBeGreaterThan(0);
    });
});
