/**
 * Backup-only database client. Uses BACKUP_DATABASE_URL.
 * No other operations run against this DB — only backup write/read.
 * If BACKUP_DATABASE_URL is not set, getBackupDb() throws (backup not configured).
 */

import { PrismaClient } from "./generated/backup-client"

const globalForBackup = globalThis as unknown as { backupPrisma: PrismaClient | undefined }

function getBackupPrisma(): PrismaClient {
  if (!process.env.BACKUP_DATABASE_URL) {
    throw new Error(
      "BACKUP_DATABASE_URL is not set. Add a separate Postgres (e.g. Railway) for backups only."
    )
  }
  if (globalForBackup.backupPrisma) return globalForBackup.backupPrisma
  const client = new PrismaClient()
  if (process.env.NODE_ENV !== "production") globalForBackup.backupPrisma = client
  return client
}

export function getBackupDb(): PrismaClient {
  return getBackupPrisma()
}

export function isBackupConfigured(): boolean {
  return Boolean(process.env.BACKUP_DATABASE_URL)
}

const DEFAULT_BACKUP_KEEP_COUNT = 5
const MIN_KEEP = 1
const MAX_KEEP = 20

function getBackupKeepCount(): number {
  const n = parseInt(process.env.BACKUP_KEEP_COUNT || String(DEFAULT_BACKUP_KEEP_COUNT), 10)
  if (!Number.isFinite(n)) return DEFAULT_BACKUP_KEEP_COUNT
  return Math.min(MAX_KEEP, Math.max(MIN_KEEP, n))
}

/** Save a new backup row, then delete older rows so only the last N backups remain (avoids unbounded growth, keeps a small history if today's backup fails). */
export async function saveBackupKeepLastN(
  summary: Record<string, number>,
  data: Record<string, unknown[]>,
  keepCount?: number
): Promise<{ id: string; createdAt: Date; summary: Record<string, number> }> {
  const n = keepCount ?? getBackupKeepCount()
  const db = getBackupPrisma()
  const created = await db.backup.create({
    data: {
      summary: summary as object,
      data: data as object,
    },
  })

  const toKeep = await db.backup.findMany({
    orderBy: { createdAt: "desc" },
    take: n,
    select: { id: true },
  })
  const keepIds = new Set(toKeep.map((r: { id: string }) => r.id))
  if (keepIds.size > 0) {
    await db.backup.deleteMany({
      where: { id: { notIn: [...keepIds] } },
    })
  }

  return {
    id: created.id,
    createdAt: created.createdAt,
    summary: created.summary as Record<string, number>,
  }
}
