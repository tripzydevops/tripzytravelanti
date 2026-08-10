import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  saveDealsToOfflineCache, 
  getCachedDeals, 
  saveWalletToOfflineCache, 
  getCachedWallet,
  saveProfileToOfflineCache, 
  getCachedProfile,
  saveMetadata, 
  getMetadata,
  clearOfflineCache
} from './offlineStorage';
import { Deal } from '../types';

// Simple mock for IndexedDB
const mockDBStore: Record<string, Record<string, any>> = {
  deals: {},
  wallet: {},
  profile: {},
  metadata: {}
};

const createMockRequest = (result?: any) => {
  const req: any = {
    onsuccess: null,
    onerror: null,
    result
  };
  return req;
};

const mockIDBStore = (storeName: string) => {
  return {
    put: vi.fn((val: any) => {
      const key = val.id || val.key;
      mockDBStore[storeName][key] = val;
      return createMockRequest(key);
    }),
    get: vi.fn((key: any) => {
      return createMockRequest(mockDBStore[storeName][key]);
    }),
    getAll: vi.fn(() => {
      return createMockRequest(Object.values(mockDBStore[storeName]));
    }),
    clear: vi.fn(() => {
      mockDBStore[storeName] = {};
      const req = createMockRequest();
      // Schedule success callback
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({} as any);
      }, 0);
      return req;
    }),
    delete: vi.fn((key: any) => {
      delete mockDBStore[storeName][key];
      return createMockRequest();
    })
  };
};

const mockTransaction = (storeNames: string | string[], mode: string) => {
  const transaction: any = {
    objectStore: vi.fn((name: string) => mockIDBStore(name)),
    oncomplete: null,
    onerror: null
  };
  setTimeout(() => {
    if (transaction.oncomplete) {
      transaction.oncomplete({} as any);
    }
  }, 5);
  return transaction;
};

const mockDB = {
  objectStoreNames: {
    contains: (name: string) => ['deals', 'wallet', 'profile', 'metadata'].includes(name)
  },
  transaction: vi.fn((storeNames: string | string[], mode: string) => mockTransaction(storeNames, mode)),
  close: vi.fn()
};

beforeEach(() => {
  mockDBStore.deals = {};
  mockDBStore.wallet = {};
  mockDBStore.profile = {};
  mockDBStore.metadata = {};

  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => {
      const req: any = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB
      };
      setTimeout(() => {
        if (req.onsuccess) {
          req.onsuccess({ target: { result: mockDB } } as any);
        }
      }, 5);
      return req;
    })
  });
});

describe('offlineStorage Unit Tests', () => {
  const dummyDeal: Deal = {
    id: 'deal-123',
    title: 'Galata Tour',
    title_tr: 'Galata Turu',
    description: 'Beautiful historical tour',
    description_tr: 'Harika tarihi tur',
    category: 'Travel',
    category_tr: 'Seyahat',
    originalPrice: 100,
    discountedPrice: 80,
    requiredTier: 'FREE' as any,
    vendor: 'Guides LLC',
    rating: 4.5,
    ratingCount: 10,
    expiresAt: '2026-12-31T23:59:59Z'
  };

  it('should successfully save and load deals cache', async () => {
    await saveDealsToOfflineCache([dummyDeal]);
    const cached = await getCachedDeals();
    expect(cached.length).toBe(1);
    expect(cached[0].title).toBe('Galata Tour');
  });

  it('should successfully save and load wallet items', async () => {
    const walletItem = { id: 'wallet_state', savedDeals: ['deal-123'] };
    await saveWalletToOfflineCache([walletItem]);
    const cached = await getCachedWallet();
    expect(cached.length).toBe(1);
    expect(cached[0].savedDeals).toContain('deal-123');
  });

  it('should successfully save and load user profile', async () => {
    const profile = { id: 'user-456', name: 'John Doe', email: 'john@example.com' };
    await saveProfileToOfflineCache(profile);
    const cached = await getCachedProfile('user-456');
    expect(cached).not.toBeNull();
    expect(cached.name).toBe('John Doe');
  });

  it('should save and fetch metadata', async () => {
    await saveMetadata('test_key', 'test_value');
    const value = await getMetadata('test_key');
    expect(value).toBe('test_value');
  });

  it('should clear all stores in database cache', async () => {
    await saveDealsToOfflineCache([dummyDeal]);
    await clearOfflineCache();
    const cached = await getCachedDeals();
    expect(cached.length).toBe(0);
  });
});
