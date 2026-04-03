/**
 * Offline queue — stores pending ball events in IndexedDB.
 * When online, flushes them to /api/sync/offline-batch.
 */
import { openDB } from 'idb';
import { syncApi } from '../api';

const DB_NAME = 'crickarena-offline';
const STORE   = 'pending-matches';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientId' });
      }
    },
  });
}

/** Save or update an offline match document */
export async function saveOfflineMatch(match) {
  const db = await getDb();
  await db.put(STORE, { ...match, savedAt: new Date().toISOString() });
}

/** Retrieve all pending offline matches */
export async function getPendingMatches() {
  const db = await getDb();
  return db.getAll(STORE);
}

/** Remove a synced match */
export async function removePendingMatch(clientId) {
  const db = await getDb();
  await db.delete(STORE, clientId);
}

/** Flush all pending matches to server — call on reconnect */
export async function flushOfflineQueue() {
  const pending = await getPendingMatches();
  if (!pending.length) return { synced: 0 };

  try {
    const { data } = await syncApi.batchSync(pending);
    const synced = data.results.filter((r) => r.status === 'synced');
    for (const r of synced) {
      await removePendingMatch(r.clientId);
    }
    return { synced: synced.length, total: pending.length };
  } catch {
    return { synced: 0, total: pending.length };
  }
}

/** Count of items waiting to sync */
export async function getPendingCount() {
  const db = await getDb();
  return db.count(STORE);
}
