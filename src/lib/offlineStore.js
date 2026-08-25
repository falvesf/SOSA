const DB_NAME = 'sosa_offline_db';
const STORE_NAME = 'observations_queue';
const METADATA_STORE = 'metadata_cache';
const QUEUE_BACKUP_KEY = 'sosa_offline_queue_backup';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

// Queue operations
export const saveQueueItem = async (item) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);
    request.onsuccess = () => {
      syncQueueBackup();
      resolve();
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

export const getQueue = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
};

export const removeQueueItem = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => {
      syncQueueBackup();
      resolve();
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

// ── localStorage Backup Layer ──────────────────────────────────────────
// Persists a synchronous JSON mirror of the queue so that even if the
// browser is closed before IndexedDB async writes complete, the data
// survives in localStorage (which is synchronous and instant).

export const syncQueueBackup = async () => {
  try {
    const queue = await getQueue();
    localStorage.setItem(QUEUE_BACKUP_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to sync queue backup:', err);
  }
};

export const restoreQueueFromBackup = async () => {
  try {
    const raw = localStorage.getItem(QUEUE_BACKUP_KEY);
    if (!raw) return;
    const backup = JSON.parse(raw);
    if (!Array.isArray(backup) || backup.length === 0) return;

    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const existing = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });

    const existingIds = new Set(existing.map(i => i.id));
    let restored = 0;
    for (const item of backup) {
      if (!existingIds.has(item.id)) {
        store.put(item);
        restored++;
      }
    }

    if (restored > 0) {
      console.log(`Restored ${restored} offline queue item(s) from localStorage backup.`);
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('Failed to restore queue from backup:', err);
  }
};

export const clearQueueBackup = () => {
  localStorage.removeItem(QUEUE_BACKUP_KEY);
};

// Metadata caching operations
export const cacheMetadata = async (key, data) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(METADATA_STORE, 'readwrite');
      const store = tx.objectStore(METADATA_STORE);
      const request = store.put({ key, data });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error('Failed to cache metadata:', error);
  }
};

export const getCachedMetadata = async (key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(METADATA_STORE, 'readonly');
      const store = tx.objectStore(METADATA_STORE);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error('Failed to read metadata cache:', error);
    return null;
  }
};

// A helper to race a promise against a rapid network timeout
export const withTimeout = (promise, ms = 2500) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout of ${ms}ms exceeded`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

// Scan the cached metadata observations to find an already synchronized observation offline
export const findCachedObservation = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(METADATA_STORE, 'readonly');
      const store = tx.objectStore(METADATA_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const allCaches = request.result || [];
        for (const cacheItem of allCaches) {
          if (Array.isArray(cacheItem.data)) {
            const found = cacheItem.data.find(obs => obs.id === id);
            if (found) {
              resolve(found);
              return;
            }
          }
        }
        resolve(null);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error('Error finding cached observation:', error);
    return null;
  }
};
