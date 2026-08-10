import { Deal } from '../types';

const DB_NAME = 'tripzy_offline_db';
const DB_VERSION = 1;

export function initOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Failed to open offline database:', event);
      reject(new Error('Failed to open offline database'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store deals
      if (!db.objectStoreNames.contains('deals')) {
        db.createObjectStore('deals', { keyPath: 'id' });
      }

      // Store wallet items / claimed deals
      if (!db.objectStoreNames.contains('wallet')) {
        db.createObjectStore('wallet', { keyPath: 'id' });
      }

      // Store user profile
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // Store metadata (e.g. sync timestamps)
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
}

// Promisified transaction helper
function runInTransaction(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | void
): Promise<any> {
  return initOfflineDb().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      let request: IDBRequest | undefined;
      
      transaction.oncomplete = () => {
        resolve(request ? request.result : undefined);
      };
      
      transaction.onerror = (e) => {
        console.error(`IndexedDB transaction error on ${storeName}:`, e);
        reject(transaction.error || new Error('Transaction failed'));
      };
      
      const req = callback(store);
      if (req) request = req;
    });
  });
}

// Deals Store Operations
export function saveDealsToOfflineCache(deals: Deal[]): Promise<void> {
  return initOfflineDb().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('deals', 'readwrite');
      const store = transaction.objectStore('deals');
      
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        deals.forEach((deal) => {
          store.put(deal);
        });
      };
      
      transaction.oncomplete = () => {
        saveMetadata('deals_last_sync', Date.now()).catch(() => {});
        resolve();
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  });
}

export function getCachedDeals(): Promise<Deal[]> {
  return runInTransaction('deals', 'readonly', (store) => store.getAll())
    .then((result) => result || []);
}

// Wallet Store Operations
export function saveWalletToOfflineCache(walletItems: any[]): Promise<void> {
  return initOfflineDb().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('wallet', 'readwrite');
      const store = transaction.objectStore('wallet');
      
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        walletItems.forEach((item) => {
          store.put(item);
        });
      };
      
      transaction.oncomplete = () => {
        saveMetadata('wallet_last_sync', Date.now()).catch(() => {});
        resolve();
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  });
}

export function getCachedWallet(): Promise<any[]> {
  return runInTransaction('wallet', 'readonly', (store) => store.getAll())
    .then((result) => result || []);
}

// Profile Store Operations
export function saveProfileToOfflineCache(profile: any): Promise<void> {
  if (!profile || !profile.id) return Promise.resolve();
  return runInTransaction('profile', 'readwrite', (store) => store.put(profile))
    .then(() => {
      saveMetadata('profile_last_sync', Date.now()).catch(() => {});
    });
}

export function getCachedProfile(userId: string): Promise<any | null> {
  return runInTransaction('profile', 'readonly', (store) => store.get(userId))
    .then((result) => result || null);
}

// Metadata Operations
export function saveMetadata(key: string, value: any): Promise<void> {
  return runInTransaction('metadata', 'readwrite', (store) => store.put({ key, value }))
    .then(() => {});
}

export function getMetadata(key: string): Promise<any> {
  return runInTransaction('metadata', 'readonly', (store) => store.get(key))
    .then((result) => result ? result.value : null);
}

export function clearOfflineCache(): Promise<void> {
  return initOfflineDb().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['deals', 'wallet', 'profile', 'metadata'], 'readwrite');
      transaction.objectStore('deals').clear();
      transaction.objectStore('wallet').clear();
      transaction.objectStore('profile').clear();
      transaction.objectStore('metadata').clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}
