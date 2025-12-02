-- Verification Script for Automatic Deal Suspension
-- 1. Insert a test deal that is already expired
INSERT INTO deals (
        title,
        description,
        original_price,
        discounted_price,
        expires_at,
        status,
        category,
        image_url,
        vendor,
        required_tier,
        description_tr,
        category_tr,
        title_tr
    )
VALUES (
        'Test Expired Deal',
        'This deal should be expired',
        100,
        50,
        NOW() - INTERVAL '1 day',
        'approved',
        'Dining',
        'https://example.com/image.jpg',
        'Test Vendor',
        'FREE',
        'Bu fırsatın süresi dolmuş olmalı',
        'Yeme İçme',
        'Test Süresi Dolmuş Fırsat'
    );
-- 2. Insert a test deal that is NOT expired
INSERT INTO deals (
        title,
        description,
        original_price,
        discounted_price,
        expires_at,
        status,
        category,
        image_url,
        vendor,
        required_tier,
        description_tr,
        category_tr,
        title_tr
    )
VALUES (
        'Test Active Deal',
        'This deal should remain approved',
        100,
        50,
        NOW() + INTERVAL '1 day',
        'approved',
        'Dining',
        'https://example.com/image.jpg',
        'Test Vendor',
        'FREE',
        'Bu fırsat onaylı kalmalı',
        'Yeme İçme',
        'Test Aktif Fırsat'
    );
-- 3. Run the function manually
SELECT handle_expired_deals();
-- 4. Check the results
SELECT title,
    status,
    expires_at
FROM deals
WHERE title IN ('Test Expired Deal', 'Test Active Deal');
-- 5. Cleanup (optional, but good for repeatability)
-- DELETE FROM deals WHERE title IN ('Test Expired Deal', 'Test Active Deal');