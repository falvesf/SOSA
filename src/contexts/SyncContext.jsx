import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getQueue, saveQueueItem, removeQueueItem } from '../lib/offlineStore';

const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load offline queue on mount
  const loadQueue = useCallback(async () => {
    const queue = await getQueue();
    setOfflineQueue(queue);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Synchronize a single queue item to Supabase
  const syncItem = async (item) => {
    const { payload } = item;
    
    // 1. Database Check: Check if a record with this exact ID already exists in Supabase
    let existsInDatabase = false;
    if (payload.id && !String(payload.id).startsWith('offline_')) {
      try {
        const { data, error } = await supabase
          .from('observations')
          .select('id')
          .eq('id', payload.id)
          .maybeSingle();
        if (!error && data) {
          existsInDatabase = true;
        }
      } catch (err) {
        console.warn('Error checking if record exists in database:', err);
      }
    }

    // Clean payload for database execution by removing client-only relation fields
    const cleanPayload = { ...payload };
    delete cleanPayload.is_new_offline;
    delete cleanPayload.teachers;
    delete cleanPayload.subjects;
    delete cleanPayload.series;
    delete cleanPayload.segments;

    // Determine if it is a new record or an edit
    const isNew = !existsInDatabase && (payload.is_new_offline || !payload.id || String(payload.id).startsWith('offline_'));
    
    if (isNew) {
      // 2. Idempotency Check: see if a record with the same unique attributes already exists in Supabase.
      // We strip the time portion from both the payload date and database dates to ensure timezone robustness.
      if (payload.teacher_id && payload.visit_date && payload.bimestre) {
        const dateStr = String(payload.visit_date).substring(0, 10);
        const { data: existing, error: findError } = await supabase
          .from('observations')
          .select('id, visit_date')
          .eq('teacher_id', payload.teacher_id)
          .eq('bimestre', payload.bimestre);
          
        if (!findError && existing && existing.length > 0) {
          const duplicate = existing.find(obs => String(obs.visit_date).substring(0, 10) === dateStr);
          if (duplicate) {
            console.log(`Observation already exists in Supabase (resolved by date mismatch logic). Skipping duplicate insert.`);
            return; // Already synchronized
          }
        }
      }

      // 3. Perform insert. If it was generated offline, we keep its client-side generated UUID!
      // This guarantees that PostgreSQL will reject any duplicate insertions with a unique constraint error (23505)
      
      // If the ID was a temporary string like "offline_...", remove it so Supabase generates a real UUID.
      // If it is a real UUID generated client-side, keep it!
      if (cleanPayload.id && String(cleanPayload.id).startsWith('offline_')) {
        delete cleanPayload.id;
      }

      const { error } = await supabase.from('observations').insert([cleanPayload]);
      if (error) {
        // Unique constraint violation (23505) means it was already saved in a previous network trial
        if (error.code === '23505') {
          console.log('Record already inserted (23505 unique violation). Skipping.');
          return;
        }
        throw error;
      }
    } else {
      // It is an edit of an existing record, update by ID
      const { error } = await supabase.from('observations').update(cleanPayload).eq('id', payload.id);
      if (error) throw error;
    }
  };

  const syncLock = useRef(false);

  // Synchronize all queued items
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine || syncLock.current) return;
    
    syncLock.current = true;
    setIsSyncing(true);

    try {
      const queue = await getQueue();
      if (queue.length === 0) return;

      console.log(`Starting synchronization of ${queue.length} offline observation(s)...`);

      let syncCompletedCount = 0;

      for (const item of queue) {
        try {
          await syncItem(item);
          await removeQueueItem(item.id);
          syncCompletedCount++;
        } catch (error) {
          console.error(`Failed to synchronize offline item ${item.id}:`, error);
          // If it's a network/connection failure, stop the loop to retry later
          if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
            break;
          }
        }
      }

      if (syncCompletedCount > 0) {
        console.log(`Successfully synchronized ${syncCompletedCount} item(s).`);
        // Reload queue to update React states
        await loadQueue();
        
        // Dispatch custom event to let pages (like Dashboard) know they should refresh
        window.dispatchEvent(new CustomEvent('sosa_sync_completed'));
      }
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
    }
  }, [loadQueue]);

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check if we are online on load
    if (navigator.onLine) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineData]);

  // Add observation to the offline queue
  const addToOfflineQueue = async (payload, meta = {}) => {
    // Generate temporary ID if not existing
    const tempId = payload.id || `offline_${Date.now()}`;
    const queueItem = {
      id: tempId,
      payload: { ...payload, id: tempId },
      meta: {
        teacherName: meta.teacherName || 'N/A',
        subjectName: meta.subjectName || 'N/A',
        seriesName: meta.seriesName || 'N/A',
        schoolName: meta.schoolName || 'N/A'
      },
      timestamp: new Date().toISOString()
    };

    await saveQueueItem(queueItem);
    await loadQueue();
    return tempId;
  };

  return (
    <SyncContext.Provider value={{
      isOnline,
      offlineQueue,
      isSyncing,
      addToOfflineQueue,
      syncOfflineData,
      loadQueue
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
