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
  // Mock FastAPI backend endpoints
  await page.route(/localhost:8000\/api\/v1/, async (route: any) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    console.log('MOCK FASTAPI INTERCEPTED:', method, url);

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: corsHeaders
      });
      return;
    }

    if (url.includes('/api/v1/recommendations')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          user_id: '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf',
          recommendations: [
            {
              id: '787c88b9-47b2-4d00-9856-11f46bf84347',
              title: 'Historical Galata Tour',
              title_tr: 'Tarihi Galata Turu',
              description: 'Walk around Galata Tower.',
              description_tr: 'Tarihi Galata Kulesi Yürüyüşü',
              image_url: 'https://picsum.photos/seed/galata/400/300',
              category: 'Travel',
              category_tr: 'Seyahat',
              original_price: 50.0,
              discounted_price: 30.0,
              required_tier: 'FREE',
              vendor: 'Istanbul Guides',
              rating: 4.8,
              rating_count: 12,
              recommendation_score: 9.5,
              reason_tr: 'Cunku bunu seversiniz',
              reason_en: 'Because you would love this'
            }
          ],
          explanation: 'Mocked FastAPI recommendation explanation'
        })
      });
      return;
    }

    if (url.includes('/api/v1/signals')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Signal recorded successfully' })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify([])
    });
  });

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

    // Partner redemption trends mock
    if (url.includes('/rest/v1/partner_redemption_trends')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([{
          partner_id: 'b0f3742f-858a-4e3b-9bfb-31620beef6db',
          redemptions_last_30: 15,
          redemptions_prev_30: 10,
          views_last_30: 100,
          views_prev_30: 80
        }])
      });
      return;
    }

    // Geofence zones mock
    if (url.includes('/rest/v1/geofence_zones')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([
          {
            id: 'zone-111-222',
            partner_id: 'b0f3742f-858a-4e3b-9bfb-31620beef6db',
            deal_id: '787c88b9-47b2-4d00-9856-11f46bf84347',
            name: 'Karaköy Branch Geofence',
            radius_meters: 500,
            is_active: true,
            created_at: new Date().toISOString()
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify([])
    });
  });
};

test.describe('Partner Geofencing & Analytics Flow', () => {
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
    page.on('console', msg => console.log('PARTNER BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('PARTNER BROWSER ERROR:', err.message));

    if (useLiveApi) {
      return;
    }

    // Register common mocks including OPTIONS handler
    await registerCommonMocks(page);

    // Go to login page first to establish the origin context for localStorage
    await page.goto('/login');

    // Set mock local session storage matching partner ID
    const mockSession = {
      access_token: makeMockJWT('b0f3742f-858a-4e3b-9bfb-31620beef6db', 'bispecialmeze@gmail.com'),
      refresh_token: 'mock-refresh-token-b0f3742f-858a-4e3b-9bfb-31620beef6db',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'b0f3742f-858a-4e3b-9bfb-31620beef6db',
        email: 'bispecialmeze@gmail.com'
      }
    };
    await page.evaluate((session) => {
      window.localStorage.setItem('sb-cwmerdoqeokuufotsvmd-auth-token', JSON.stringify(session));
    }, mockSession);
  });

  test('should display partner dashboard analytics widgets', async ({ page }) => {
    await page.goto('/partner/dashboard');

    // Check header (use specific text locator to avoid sidebar header collision)
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();

    if (useLiveApi) {
      // Verify dashboard content is visible generally
      await expect(page.locator('text=Aktif Kampanyalar').first()).toBeVisible().catch(() => 
        expect(page.locator('text=Active Campaigns').first()).toBeVisible()
      );
    } else {
      // Verify views metric is visible and has growth percentage
      await expect(page.locator('text=100').first()).toBeVisible();
      await expect(page.locator('text=+25%').first()).toBeVisible(); // views growth: (100-80)/80 = 25%

      // Verify redemptions count and growth
      await expect(page.locator('text=15').first()).toBeVisible();
      await expect(page.locator('text=+50%').first()).toBeVisible(); // redemptions growth: (15-10)/10 = 50%
    }
  });

  test('should support managing geofence zones', async ({ page }) => {
    await page.goto('/partner/geofence');

    if (useLiveApi) {
      // Verify the CRUD form elements exist
      await expect(page.locator('input[placeholder*="Adı"]').first()).toBeVisible().catch(() =>
        expect(page.locator('input[placeholder*="Name"]').first()).toBeVisible()
      );
    } else {
      // Verify geofence zone name is visible
      await expect(page.locator('text=Karaköy Branch Geofence').first()).toBeVisible();
      await expect(page.locator('text=500m').first()).toBeVisible();

      // Click Create Zone button to open the form
      await page.locator('text=Create Zone').click();

      // Verify the CRUD form elements exist (English placeholders on GeofencePage)
      await expect(page.locator('input[placeholder*="Entrance"]').first()).toBeVisible();
      await expect(page.locator('input[type="range"]').first()).toBeVisible(); // radius slider
    }
  });
});
