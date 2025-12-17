import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDeal, getFlashDeals } from '../../lib/supabaseService';
import { supabase } from '../../lib/supabaseClient';
import { SubscriptionTier, Deal } from '../../types';

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(),
            insert: vi.fn(),
            eq: vi.fn(),
            gt: vi.fn(),
            order: vi.fn(),
            single: vi.fn(),
        })),
    },
}));

describe('Deal Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createDeal', () => {
        it('should correctly transform app model to DB snake_case on insert', async () => {
            const newDeal: Omit<Deal, 'id' | 'rating' | 'ratingCount'> = {
                title: 'Tasty Burger',
                title_tr: 'Lezzetli Burger',
                description: 'Best burger in town',
                description_tr: 'Şehirdeki en iyi burger',
                imageUrl: 'http://example.com/burger.jpg',
                category: 'Food',
                category_tr: 'Yemek',
                originalPrice: 100,
                discountedPrice: 50,
                discountPercentage: 50,
                requiredTier: SubscriptionTier.FREE,
                isExternal: false,
                vendor: 'Burger King',
                expiresAt: '2025-12-31',
                usageLimit: '1 per person',
                usageLimit_tr: 'Kişi başı 1',
                validity: 'Weekdays',
                validity_tr: 'Hafta içi',
                termsUrl: 'http://terms.com',
                redemptionCode: 'BURGER50',
                latitude: 41.0082,
                longitude: 28.9784,
                is_flash_deal: true, // Mixed case in type def, checking passthrough
                flash_end_time: '2025-01-01',
            };

            // Mock successful insert return
            const mockDbResponse = {
                id: 'new-deal-123',
                ...newDeal,
                image_url: newDeal.imageUrl, // DB field name
                original_price: newDeal.originalPrice,
                discounted_price: newDeal.discountedPrice,
                discount_percentage: newDeal.discountPercentage,
                required_tier: newDeal.requiredTier,
                is_external: newDeal.isExternal,
                expires_at: newDeal.expiresAt,
                usage_limit: newDeal.usageLimit,
                usage_limit_tr: newDeal.usageLimit_tr,
                validity_tr: newDeal.validity_tr,
                terms_url: newDeal.termsUrl,
                redemption_code: newDeal.redemptionCode,
                // ... include other transformations implicitly checked by "transform" tests or return
            };

            const selectMock = vi.fn().mockResolvedValue({ data: mockDbResponse, error: null });
            const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: selectMock }) });

            (supabase.from as any).mockReturnValue({
                insert: insertMock
            });

            const result = await createDeal(newDeal);

            // Verify Insert Payload is SNAKE_CASE
            expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Tasty Burger',
                image_url: 'http://example.com/burger.jpg', // Transformed
                discounted_price: 50, // Transformed
                latitude: 41.0082, // Passthrough
                is_flash_deal: true, // Passthrough
            }));

            // Verify Result is transformed back to CamelCase (relying on transformDealFromDB logic which uses raw DB response)
            // Since we mocked the DB response to include snake_case keys for the transform function to pick up (logic inside service),
            // we need to ensure our mockDbResponse actually LOOKS like what the DB returns.
            // The service code: `return transformDealFromDB(data);`
            // So checking `result.imageUrl` ensures `transformDealFromDB` read `image_url` from `mockDbResponse`.
            expect(result.imageUrl).toBe('http://example.com/burger.jpg');
        });
    });

    describe('getFlashDeals', () => {
        it('should query only active future flash deals', async () => {
            const eqMock = vi.fn().mockReturnThis();
            const gtMock = vi.fn().mockReturnThis(); // Greater Than (future)
            const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });

            (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: eqMock,
                gt: gtMock,
                order: orderMock,
            });

            await getFlashDeals();

            // Verify filters
            expect(eqMock).toHaveBeenCalledWith('is_flash_deal', true);
            expect(eqMock).toHaveBeenCalledWith('status', 'approved');
            expect(eqMock).toHaveBeenCalledWith('is_sold_out', false);
            // Verify time check
            // Expect gt('flash_end_time', [ISO string])
            // Since ISO string changes, check for string existence
            expect(gtMock).toHaveBeenCalledWith('flash_end_time', expect.any(String));
        });
    });
});
