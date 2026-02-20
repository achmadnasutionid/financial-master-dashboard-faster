/**
 * Client-side backup cache in IndexedDB (1-day TTL).
 * Used when first landing triggers a backup and we receive the payload to keep a copy off the DB.
 */

const DB_NAME = "dashboard-backup"
const STORE = "cache"
const KEY_BACKUP = "latest"
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export type CachedBackup = {
  data: unknown
  storedAt: string
  expiresAt: number
  sizeBytes?: number
}

export async function saveBackupToCache(backupPayload: unknown): Promise<void> {
  if (typeof indexedDB === "undefined") return
  const now = Date.now()
  const expiresAt = now + ONE_DAY_MS
  const payload: CachedBackup = {
    data: backupPayload,
    storedAt: new Date(now).toISOString(),
    expiresAt,
    sizeBytes: typeof backupPayload === "string" ? new Blob([backupPayload]).size : undefined,
  }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    const req = store.put(payload, KEY_BACKUP)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function getCachedBackup(): Promise<CachedBackup | null> {
  if (typeof indexedDB === "undefined") return null
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(KEY_BACKUP)
    req.onsuccess = () => {
      const payload = req.result as CachedBackup | undefined
      if (!payload || Date.now() > payload.expiresAt) {
        resolve(null)
      } else {
        resolve(payload)
      }
    }
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}
