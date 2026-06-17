import { test, expect } from '@playwright/test';

const useLiveApi = process.env.USE_LIVE_API === 'true';

const makeMockJWT = (userId: string, email: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: userId,
    email: email,
    role: "authenticated"
  };
  const toBase64Url = (obj: any) => {
    const json = JSON.stringify(obj);
    const base64 = typeof Buffer !== 'undefined'
      ? Buffer.from(json).toString('base64')
      : btoa(json);
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  };
  return `${toBase64Url(header)}.${toBase64Url(payload)}.dummy-signature`;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
};

const registerCommonMocks = async (page: any) => {
  await page.route(/cwmerdoqeokuufotsvmd\.supabase\.co/, async (route: any) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    console.log('MOCK INTERCEPTED:', method, url);

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: corsHeaders
      });
      return;
    }

    // Profiles mock
    if (url.includes('/rest/v1/profiles')) {
      const isSingle = request.headers()['accept']?.includes('vnd.pgrst.object') || url.includes('single') || url.includes('?id=eq.') || url.includes('&id=eq.');
      let id = '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf';
      let email = 'successofmentors@gmail.com';
      let name = 'Regular User';
      let role = 'user';

      if (url.includes('b0f3742f-858a-4e3b-9bfb-31620beef6db') || url.includes('meze') || url.includes('partner')) {
        id = 'b0f3742f-858a-4e3b-9bfb-31620beef6db';
        email = 'bispecialmeze@gmail.com';
        name = 'Bi Special Meze';
        role = 'partner';
      }

      const profileData = {
        id: id,
        email: email,
        name: name,
        role: role,
        tier: 'FREE',
        points: role === 'user' ? 100 : undefined
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(isSingle ? profileData : [profileData])
      });
      return;
    }

    // User verification mock
    if (url.includes('/auth/v1/user')) {
      const authHeader = request.headers()['authorization'] || '';
      let id = '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf';
      let email = 'successofmentors@gmail.com';

      if (authHeader.includes('b0f3742f-858a-4e3b-9bfb-31620beef6db') || authHeader.includes('meze') || authHeader.includes('partner')) {
        id = 'b0f3742f-858a-4e3b-9bfb-31620beef6db';
        email = 'bispecialmeze@gmail.com';
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          id: id,
          email: email,
          user_metadata: {
            full_name: id === 'b0f3742f-858a-4e3b-9bfb-31620beef6db' ? 'Bi Special Meze' : 'Regular User'
          }
        })
      });
      return;
    }

    // Token login mock
    if (url.includes('/auth/v1/token')) {
      const postData = request.postData();
      let email = 'successofmentors@gmail.com';
      let id = '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf';

      if (postData) {
        try {
          const body = JSON.parse(postData);
          if (body.email) {
            email = body.email;
            if (email.includes('meze') || email.includes('partner')) {
              id = 'b0f3742f-858a-4e3b-9bfb-31620beef6db';
            }
          }
        } catch (e) {}
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          access_token: makeMockJWT(id, email),
          refresh_token: `mock-refresh-token-${id}`,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: id,
            email: email,
          }
        })
      });
      return;
    }

    // Deals mock
    if (url.includes('/rest/v1/deals')) {
      const isSingle = request.headers()['accept']?.includes('vnd.pgrst.object') || url.includes('single') || url.includes('?id=eq.') || url.includes('&id=eq.');
      const isPartner = url.includes('partner_id') || url.includes('bispecialmeze') || url.includes('b0f3742f-858a-4e3b-9bfb-31620beef6db');

      const dealData = {
        id: '787c88b9-47b2-4d00-9856-11f46bf84347',
        title: isPartner ? 'Special Meze Platter Discount' : 'Historical Galata Tour',
        title_tr: isPartner ? 'Meze Tabağı İndirimi' : 'Tarihi Galata Turu',
        description: 'Walk around Galata Tower.',
        description_tr: 'Tarihi Galata Kulesi Yürüyüşü',
        image_url: 'https://picsum.photos/seed/galata/400/300',
        category: isPartner ? 'Dining' : 'Travel',
        category_tr: isPartner ? 'Yemek' : 'Seyahat',
        original_price: isPartner ? 40.0 : 50.0,
        discounted_price: isPartner ? 25.0 : 30.0,
        required_tier: 'FREE',
        vendor: isPartner ? 'Bi Special Meze' : 'Istanbul Guides',
        rating: 4.8,
        rating_count: 12,
        status: 'approved',
        is_teasable: true,
        expires_at: new Date(Date.now() + 86400000 * 5).toISOString()
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(isSingle ? dealData : [dealData])
      });
      return;
    }

    // Categories mock
    if (url.includes('/rest/v1/categories')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([
          { id: '1', name: 'Travel', name_tr: 'Seyahat', icon: 'plane' },
          { id: '2', name: 'Dining', name_tr: 'Yemek', icon: 'utensils' }
        ])
      });
      return;
    }

    // Subscription plans mock
    if (url.includes('/rest/v1/subscription_plans')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([
          {
            id: 'sub-free',
            tier: 'FREE',
            name: 'Free Tier',
            name_tr: 'Ücretsiz Üyelik',
            price: 0,
            billing_period: 'monthly',
            redemptions_per_period: 3,
            is_active: true
          },
          {
            id: 'sub-premium',
            tier: 'PREMIUM',
            name: 'Premium',
            name_tr: 'Premium',
            price: 19.99,
            billing_period: 'monthly',
            redemptions_per_period: 15,
            is_active: true
          }
        ])
      });
      return;
    }

    // Partner stats mock
    if (url.includes('/rest/v1/partner_stats')) {
      const statsData = {
        id: 'stats-111-222',
        partner_id: 'b0f3742f-858a-4e3b-9bfb-31620beef6db',
        totalViews: 100,
        total_views: 100,
        totalRedemptions: 15,
        total_redemptions: 15,
        updated_at: new Date().toISOString()
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(statsData)
      });
      return;
    }

    // Page content mock
    if (url.includes('/rest/v1/page_content')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([])
      });
      return;
    }

    // Announcements mock
    if (url.includes('/rest/v1/announcements')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([])
      });
      return;
    }

    // Vector sync mock
    if (url.includes('/functions/v1/vector-sync')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ success: true, results: [] })
      });
      return;
    }

    // Default safe fallback (returns 200 OK with empty list)
    console.log('MOCK FALLBACK:', method, url);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify([])
    });
  });
};

test.describe('Deals and Coupon Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Disable service workers
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'serviceWorker', {
        get() {
          return {
            register: () => Promise.resolve({ active: true }),
            addEventListener: () => {},
            removeEventListener: () => {},
            getRegistrations: () => Promise.resolve([])
          };
        }
      });
    });

    // Console and error listeners
    page.on('console', msg => console.log('DEALS BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('DEALS BROWSER ERROR:', err.message));

    if (useLiveApi) {
      return;
    }

    // Register common mocks including OPTIONS handler
    await registerCommonMocks(page);

    // Go to login page first to establish the origin context for localStorage
    await page.goto('/login');

    // Set mock local session storage
    const mockSession = {
      access_token: makeMockJWT('500f14fb-0d04-4ea0-a3cf-63a9ea561ddf', 'successofmentors@gmail.com'),
      refresh_token: 'mock-refresh-token-500f14fb-0d04-4ea0-a3cf-63a9ea561ddf',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf',
        email: 'successofmentors@gmail.com'
      }
    };
    await page.evaluate((session) => {
      window.localStorage.setItem('sb-cwmerdoqeokuufotsvmd-auth-token', JSON.stringify(session));
    }, mockSession);
  });

  test('should display active deals and support details modal', async ({ page }) => {
    await page.goto('/');

    if (useLiveApi) {
      // In live testing, wait for any deal card, check it is visible, and click it
      const dealLink = page.locator('a[href^="/deals/"]').first();
      await expect(dealLink).toBeVisible();
      await dealLink.click();
      await expect(page).toHaveURL(/\/deals\/.+/);
    } else {
      // Check deal title is visible (use .first() to avoid strict mode violations if rendered in carousel/main list)
      const dealTitle = page.locator('text=Tarihi Galata Turu').first();
      await dealTitle.waitFor({ state: 'visible', timeout: 15000 });
      await expect(dealTitle).toBeVisible();

      // Click on the deal card to open detail page/view
      await dealTitle.click();

      // Verify detail page has correct details
      await expect(page.locator('h2').first()).toContainText('Tarihi Galata Turu');
      await expect(page.locator('text=Istanbul Guides')).toBeVisible();
      await expect(page.locator('text=30')).toBeVisible();
    }
  });

  test('should support applying promo coupon codes', async ({ page }) => {
    if (useLiveApi) {
      // Live coupon testing requires pre-existing campaign/coupon data.
      // We check for coupon element presence on a live deal page or skip if live verification is manual.
      console.log('Skipping mock-specific coupon discount logic on live API test.');
      return;
    }

    // Mock coupon code lookup
    await page.route(/\/rest\/v1\/coupon_codes/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([
          {
            id: 'abc788b9-47b2-4d00-9856-11f46bf84347',
            status: 'active',
            code: 'WELCOME10',
            campaign: {
              id: 'camp788b9-47b2-4d00-9856-11f46bf84347',
              title: 'Welcome Discount',
              discount_type: 'percentage',
              discount_value: 10.0,
              max_per_user: 1,
              is_active: true,
              deal_id: null
            }
          }
        ])
      });
    });

    // Go directly to deal details page (the /deals/:id or /deal/:id path is routed by react router)
    await page.goto('/deals/787c88b9-47b2-4d00-9856-11f46bf84347');

    // Click "Have a Coupon Code?"
    await page.locator('text=Kupon Kodun Var Mı?').first().click({ force: true });

    // Enter coupon code
    await page.locator('input[type="text"]').fill('WELCOME10');

    // Click Apply
    await page.locator('text=Uygula').first().click({ force: true });

    // Verify discount applied text
    await expect(page.locator('text=Welcome Discount')).toBeVisible();
    
    // Original price 30.0 TL should be discounted by 10% (3.0 TL) -> 27.0 TL
    await expect(page.locator('text=27')).toBeVisible();
  });
});
