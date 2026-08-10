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

test.describe('Geofence breach and push notifications flow', () => {
  let mockNotifications: any[] = [];
  let isBreached = false;

  test.use({
    geolocation: { latitude: 41.0, longitude: 28.9 }, // Istanbul outer coords
    permissions: ['geolocation']
  });

  test.beforeEach(async ({ page }) => {
    mockNotifications = [];
    isBreached = false;

    // Disable service workers to prevent service worker caching or interference
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

    page.on('console', msg => console.log('GEOFENCE BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('GEOFENCE BROWSER ERROR:', err.message));

    if (useLiveApi) return;

    // Register mocks
    await page.route(/localhost:8000\/api\/v1/, async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      if (url.includes('/api/v1/location-update')) {
        const body = request.postData() ? JSON.parse(request.postData()!) : {};
        console.log('[E2E Interceptor] Location update received:', body);
        
        // When location is updated, simulate appending a new notification record to our mock array
        isBreached = true;
        mockNotifications.push({
          id: 'mock-notification-id-123',
          user_id: '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf',
          title: 'Exclusive Deal Nearby!',
          message: 'You are close to Test Restaurant! Claim "Free Dessert" now.',
          type: 'geofence_deal',
          is_read: false,
          created_at: new Date().toISOString(),
          link: '#/deal/898c88b9-47b2-4d00-9856-11f46bf84348'
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({
            triggered: true,
            match_probability: 0.95,
            notification_sent: true,
            message: 'Location update processed. Match probability: 0.95. Push notification triggered and delivered.'
          })
        });
        return;
      }

      await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
    });

    await page.route(/cwmerdoqeokuufotsvmd\.supabase\.co/, async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      if (url.includes('/rest/v1/geofence_zones')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify([
            {
              id: '787c88b9-47b2-4d00-9856-11f46bf84347',
              partner_id: 'b0f3742f-858a-4e3b-9bfb-31620beef6db',
              deal_id: '898c88b9-47b2-4d00-9856-11f46bf84348',
              name: 'Mock Geofence Istanbul',
              radius_meters: 500,
              centroid: 'POINT(28.9784 41.0082)', // Istanbul coordinates (lng lat)
              is_active: true
            }
          ])
        });
        return;
      }

      if (url.includes('/rest/v1/notifications')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify(mockNotifications)
        });
        return;
      }

      if (url.includes('/rest/v1/profiles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({
            id: '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf',
            email: 'successofmentors@gmail.com',
            name: 'Regular User',
            role: 'user',
            tier: 'FREE'
          })
        });
        return;
      }

      if (url.includes('/auth/v1/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({
            id: '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf',
            email: 'successofmentors@gmail.com',
            user_metadata: { full_name: 'Regular User' }
          })
        });
        return;
      }

      // Default fallback
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([])
      });
    });

    // Write mock session to localStorage
    await page.goto('/login');
    const session = {
      access_token: makeMockJWT('500f14fb-0d04-4ea0-a3cf-63a9ea561ddf', 'successofmentors@gmail.com'),
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '500f14fb-0d04-4ea0-a3cf-63a9ea561ddf', email: 'successofmentors@gmail.com' }
    };
    await page.evaluate((sess) => {
      window.localStorage.setItem('sb-cwmerdoqeokuufotsvmd-auth-token', JSON.stringify(sess));
    }, session);
  });

  test('should trigger location update on geofence breach and render notification', async ({ page, context }) => {
    // Go to profile page to enable location watch
    await page.goto('/profile');

    // Enable location via the toggle
    const toggleButton = page.locator('p', { hasText: /Location Services|Konum Servisleri/ }).first().locator('xpath=../..//button[@role="switch"]');
    await toggleButton.waitFor({ state: 'visible' });
    
    // Check if it is currently off (we expect it is, but let's click it)
    await toggleButton.click();

    // Now, change coordinate to breach geofence: Istanbul coordinates 41.0082, 28.9784 (dist = 0m < 500m)
    console.log('[E2E Test] Changing geolocation to geofence centroid...');
    await context.setGeolocation({ latitude: 41.0082, longitude: 28.9784 });

    // Wait for the local location-update API to trigger
    console.log('[E2E Test] Waiting for /api/v1/location-update endpoint...');
    const locationResponse = await page.waitForResponse(
      response => response.url().includes('/api/v1/location-update') && response.status() === 200,
      { timeout: 15000 }
    );
    expect(locationResponse).toBeTruthy();

    // Verify it breached correctly
    expect(isBreached).toBe(true);

    // Navigate to the home page to fetch notifications and show the bell
    console.log('[E2E Test] Navigating to home page...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the notification bell to open it
    const bellBtn = page.locator('button:has(.lucide-bell)');
    await bellBtn.waitFor({ state: 'visible' });
    await bellBtn.click();

    // Check if the mock notification appears
    console.log('[E2E Test] Checking notification details inside bell dropdown...');
    const dropdown = page.locator('text=Exclusive Deal Nearby!');
    await expect(dropdown).toBeVisible();

    const dropdownMsg = page.locator('text=Claim "Free Dessert" now.');
    await expect(dropdownMsg).toBeVisible();
  });
});
