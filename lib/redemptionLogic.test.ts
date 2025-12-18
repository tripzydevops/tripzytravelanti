import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMonthlyLimit } from './supabaseService';
import { supabase } from './supabaseClient';
import { SubscriptionTier } from '../types';

// Mock Supabase
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    rpc: vi.fn()
  }
}));

describe('checkMonthlyLimit', () => {
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow redemption if user is under limit', async () => {
    // Note: SubscriptionTier enum values are already uppercase string constants
    const mockUser = { id: userId, tier: SubscriptionTier.BASIC, extraRedemptions: 0 };

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
    };

    const planChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { redemptions_per_period: 120, billing_period: 'yearly' },
        error: null
      })
    };

    const walletChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
      then: (resolve: any) => resolve({ count: 5, error: null })
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain;
      if (table === 'subscription_plans') return planChain;
      if (table === 'wallet_items') return walletChain;
      return { select: vi.fn().mockReturnThis() };
    });

    const result = await checkMonthlyLimit(userId);

    // 120 / 12 = 10 monthly limit. 5 used. 5 remaining.
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(result.limit).toBe(10);
  });
});
