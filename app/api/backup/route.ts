import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { exportDatabaseToJson } from "@/lib/backup-export"

// Backup model is in schema; PrismaClient types include it after prisma generate
const db = prisma as typeof prisma & { backup: typeof prisma.company }

const BACKUP_SECRET = process.env.BACKUP_SECRET

function isAuthorized(request: Request): boolean {
  // If no secret is set, allow all requests (convenient but insecure on a public URL)
  if (!BACKUP_SECRET) return true
  const header = request.headers.get("x-backup-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return header === BACKUP_SECRET
}

/**
 * POST /api/backup – create a new backup and save it in the DB.
 * Call this each night (e.g. from cron-job.org) with header: x-backup-token: <BACKUP_SECRET>
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { summary, data } = await exportDatabaseToJson()
    const backup = await db.backup.create({
      data: {
        summary: summary as Prisma.InputJsonValue,
        data: data as Prisma.InputJsonValue,
      },
    })
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
 * GET /api/backup – list recent backups, or download one.
 * Query: ?download=latest or ?download=<id> to get full backup JSON.
 * Same auth: x-backup-token or Authorization: Bearer <BACKUP_SECRET>
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const download = searchParams.get("download")

  if (download) {
    let backup: { id: string; data: unknown } | null
    if (download === "latest") {
      backup = await db.backup.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true, data: true },
      })
    } else {
      backup = await db.backup.findUnique({
        where: { id: download },
        select: { id: true, data: true },
      })
    }
    if (!backup) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 })
    }
    return NextResponse.json(backup.data, {
      headers: {
        "Content-Disposition": `attachment; filename="backup-${backup.id}.json"`,
      },
    })
  }

  const list = await db.backup.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, createdAt: true, summary: true },
  })
  return NextResponse.json(list)
}
