import { NextResponse } from "next/server"
import { exportDatabaseToJson } from "@/lib/backup-export"
import { getBackupDb, isBackupConfigured, saveBackupKeepLastN } from "@/lib/backup-db"

const BACKUP_SECRET = process.env.BACKUP_SECRET

function isAuthorized(request: Request): boolean {
  if (!BACKUP_SECRET) return true
  const header = request.headers.get("x-backup-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return header === BACKUP_SECRET
}

function backupUnavailable() {
  return NextResponse.json(
    { error: "Backup not configured. Set BACKUP_DATABASE_URL to a separate Postgres (e.g. Railway)." },
    { status: 503 }
  )
}

/**
 * POST /api/backup – create a new backup and save it in the backup DB only.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isBackupConfigured()) return backupUnavailable()
  try {
    const { summary, data } = await exportDatabaseToJson()
    const backup = await saveBackupKeepLastN(summary, data)
    return NextResponse.json({
      id: backup.id,
      createdAt: backup.createdAt,
      summary: backup.summary as Record<string, number>,
    })
  } catch (e) {
    console.error("Backup failed:", e)
    return NextResponse.json({ error: "Backup failed" }, { status: 500 })
  }
}

/**
 * GET /api/backup – list recent backups from backup DB only.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isBackupConfigured()) return backupUnavailable()
  try {
    const db = getBackupDb()
    const list = await db.backup.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, createdAt: true, summary: true },
    })
    return NextResponse.json(list)
  } catch (e) {
    console.error("Backup GET failed:", e)
    return NextResponse.json({ error: "Backup failed" }, { status: 500 })
  }
}
