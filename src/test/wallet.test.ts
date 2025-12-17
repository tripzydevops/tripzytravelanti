import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMonthlyLimit, redeemDeal } from '../../lib/supabaseService';
import { supabase } from '../../lib/supabaseClient';
import { SubscriptionTier } from '../../types';

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(),
            eq: vi.fn(),
            single: vi.fn(),
            gte: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            maybeSingle: vi.fn(),
            delete: vi.fn(),
        })),
        rpc: vi.fn(),
    },
}));

describe('Wallet Logic', () => {
    const mockUserId = 'user-123';
    const mockDealId = 'deal-456';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkMonthlyLimit', () => {
        it('should return allowed if usage is under limit', async () => {
            // Mock User Profile
            const mockUser = {
                id: mockUserId,
                tier: SubscriptionTier.BASIC,
                extraRedemptions: 0,
            };

            // Mock Plan Limit
            const mockPlan = {
                redemptions_per_period: 10,
                billing_period: 'monthly',
            };

            // Mock Wallet Count (Usage)
            const mockUsageCount = 5;

            const selectMock = vi.fn();
            const eqMock = vi.fn();
            const singleMock = vi.fn();
            const gteMock = vi.fn();

            // Setup chain for profiles (first call)
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
                    };
                }
                if (table === 'subscription_plans') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockPlan, error: null }),
                    };
                }
                if (table === 'wallet_items') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockResolvedValue({ count: mockUsageCount, error: null }),
                    };
                }
                return { select: vi.fn() };
            });


            const result = await checkMonthlyLimit(mockUserId);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(5);
            expect(result.limit).toBe(10);
        });

        it('should return not allowed if usage equals limit', async () => {
            // Mock User Profile
            const mockUser = {
                id: mockUserId,
                tier: SubscriptionTier.FREE,
                extraRedemptions: 0,
            };

            // Mock Plan Limit
            const mockPlan = {
                redemptions_per_period: 3,
                billing_period: 'monthly',
            };

            // Mock Wallet Count (Usage)
            const mockUsageCount = 3;

            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
                    };
                }
                if (table === 'subscription_plans') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockPlan, error: null }),
                    };
                }
                if (table === 'wallet_items') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockResolvedValue({ count: mockUsageCount, error: null }),
                    };
                }
                return { select: vi.fn() };
            });

            const result = await checkMonthlyLimit(mockUserId);

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.limit).toBe(3);
        });
    });

    describe('redeemDeal', () => {
        it('should throw error if deal is already redeemed', async () => {
            // Mock deal status in wallet as 'redeemed'
            const mockOwnedDeal = {
                status: 'redeemed',
                deal_id: mockDealId
            };

            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'wallet_items') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: vi.fn().mockResolvedValue({ data: mockOwnedDeal, error: null }),
                        some: vi.fn(), // Note: .some is array method, not supabase
                    };
                }
                return { select: vi.fn() };
            });

            await expect(redeemDeal(mockUserId, mockDealId)).rejects.toThrow('already been redeemed');
        });
    });
});
