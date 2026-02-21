/**
 * Production database backup script
 *
 * Creates timestamped backups so production data can be restored if a cleanup
 * or other script is run by mistake.
 *
 * Usage:
 *   BACKUP_PRODUCTION=1 node backup-production-db.mjs
 *   BACKUP_PRODUCTION=1 node backup-production-db.mjs --json-only   # JSON export only (no pg_dump)
 *
 * Requires BACKUP_PRODUCTION=1 to avoid accidental runs.
 * Backups are written to ./backups/ (gitignored).
 */

import { PrismaClient } from '@prisma/client'
import { mkdir, writeFile, readdir, readFile } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

const REQUIRED_ENV = 'BACKUP_PRODUCTION'
const BACKUP_DIR = join(process.cwd(), 'backups')

// Safety: refuse to run unless explicitly opted in
if (process.env[REQUIRED_ENV] !== '1') {
  console.error(`❌ Refusal: set ${REQUIRED_ENV}=1 to create a backup.`)
  console.error('   Example: BACKUP_PRODUCTION=1 node backup-production-db.mjs')
  process.exit(1)
}

const jsonOnly = process.argv.includes('--json-only')

function serialize(value) {
  if (value instanceof Date) return value.toISOString()
  return value
}

async function exportTablesToJson() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = join(BACKUP_DIR, `json-${timestamp}`)
  await mkdir(outDir, { recursive: true })

  const modelNames = [
    'company', 'billing', 'signature', 'product', 'productDetail',
    'quotation', 'quotationItem', 'quotationItemDetail', 'quotationRemark', 'quotationSignature',
    'quotationTemplate', 'quotationTemplateItem', 'quotationTemplateItemDetail',
    'invoice', 'invoiceItem', 'invoiceItemDetail', 'invoiceRemark', 'invoiceSignature',
    'expense', 'expenseItem',
    'paragonTicket', 'paragonTicketItem', 'paragonTicketItemDetail', 'paragonTicketRemark',
    'erhaTicket', 'erhaTicketItem', 'erhaTicketItemDetail', 'erhaTicketRemark',
    'gearExpense', 'bigExpense',
    'productionTracker'
  ]

  const summary = {}
  for (const name of modelNames) {
    const model = prisma[name]
    if (!model || typeof model.findMany !== 'function') continue
    try {
      const rows = await model.findMany({})
      const normalized = rows.map((r) => {
        const o = {}
        for (const k of Object.keys(r)) o[k] = serialize(r[k])
        return o
      })
      summary[name] = normalized.length
      await writeFile(
        join(outDir, `${name}.json`),
        JSON.stringify(normalized, null, 0),
        'utf8'
      )
    } catch (e) {
      console.warn(`  ⚠️  ${name}: ${e.message}`)
      summary[name] = `error: ${e.message}`
    }
  }

  await writeFile(
    join(outDir, '_summary.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), tables: summary }, null, 2),
    'utf8'
  )
  return { outDir, summary }
}

async function runPgDump() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL
  if (!url || !url.startsWith('postgres')) {
    console.log('  (pg_dump skipped: DATABASE_URL not set or not PostgreSQL)')
    return null
  }
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    console.warn('  (pg_dump skipped: invalid DATABASE_URL)')
    return null
  }
  const db = (parsed.pathname || '').slice(1) || 'postgres'
  const user = parsed.username || ''
  const host = parsed.hostname || 'localhost'
  const port = parsed.port || '5432'
  const password = parsed.password || ''

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outPath = join(BACKUP_DIR, `dump-${timestamp}.sql`)
  await mkdir(BACKUP_DIR, { recursive: true })

  const { spawn } = await import('child_process')
  const env = { ...process.env, PGPASSWORD: password }
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pg_dump',
      ['-h', host, '-p', port, '-U', user, '-d', db, '-F', 'p', '-f', outPath],
      { env, stdio: ['ignore', 'pipe', 'pipe'] }
    )
    let stderr = ''
    child.stderr.on('data', (c) => { stderr += c })
    child.on('close', (code) => {
      if (code === 0) {
        console.log('  pg_dump:', outPath)
        resolve(outPath)
      } else {
        console.warn('  pg_dump failed:', stderr.slice(0, 200))
        resolve(null)
      }
    })
    child.on('error', (e) => {
      console.warn('  pg_dump not available:', e.message)
      resolve(null)
    })
  })
}

/** Upload backups to S3 when BACKUP_S3_BUCKET (+ AWS creds) are set. Optional: needs @aws-sdk/client-s3. */
async function uploadToS3() {
  const bucket = process.env.BACKUP_S3_BUCKET
  if (!bucket) return

  let S3Client, PutObjectCommand
  try {
    const s3 = await import('@aws-sdk/client-s3')
    S3Client = s3.S3Client
    PutObjectCommand = s3.PutObjectCommand
  } catch (e) {
    console.log('  (S3 upload skipped: install @aws-sdk/client-s3 and set AWS credentials to upload to S3)')
    return
  }

  const prefix = process.env.BACKUP_S3_PREFIX || 'db-backups'
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

  const dirs = await readdir(BACKUP_DIR, { withFileTypes: true })
  let uploaded = 0
  for (const ent of dirs) {
    if (!ent.isDirectory()) continue
    const dirPath = join(BACKUP_DIR, ent.name)
    const files = await readdir(dirPath)
    for (const f of files) {
      const key = `${prefix}/${date}/${ent.name}/${f}`
      const body = await readFile(join(dirPath, f))
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }))
      uploaded++
    }
  }
  const sqlFiles = (await readdir(BACKUP_DIR)).filter((f) => f.endsWith('.sql'))
  for (const f of sqlFiles) {
    const key = `${prefix}/${date}/${f}`
    const body = await readFile(join(BACKUP_DIR, f))
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }))
    uploaded++
  }
  console.log(`  S3 upload: ${uploaded} files → s3://${bucket}/${prefix}/${date}/`)
}

async function main() {
  console.log('📦 Production DB backup\n')
  await mkdir(BACKUP_DIR, { recursive: true })

  const { outDir, summary } = await exportTablesToJson()
  console.log('  JSON export:', outDir)
  console.log('  Counts:', summary)
  if (!jsonOnly) await runPgDump()
  await uploadToS3()
  console.log('\n✅ Backup done. Store ./backups/ safely (e.g. off this machine).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
