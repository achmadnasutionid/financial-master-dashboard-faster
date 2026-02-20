/**
 * Export master data from current DATABASE_URL to master-data.json,
 * or import master-data.json into current DATABASE_URL.
 *
 * Use case: copy master data from local DB to production.
 *
 * 1. Export (run locally with .env pointing to local DB):
 *    node master-data-export-import.mjs export
 *    → writes master-data.json
 *
 * 2. Import (run with DATABASE_URL pointing to production):
 *    set DATABASE_URL=<production-url>
 *    node master-data-export-import.mjs import
 *    Or: dotenv -e .env.production -- node master-data-export-import.mjs import
 *
 * Master data: Company, Billing, Signature, Product, ProductDetail,
 *              QuotationTemplate, QuotationTemplateItem, QuotationTemplateItemDetail
 */

import { PrismaClient } from '@prisma/client'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const OUT_FILE = join(process.cwd(), 'master-data.json')

function getPrismaForExport() {
  const url = process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL
  return new PrismaClient({ datasourceUrl: url })
}

function getPrismaForImport() {
  return new PrismaClient()
}

const MASTER_MODELS = [
  'company',
  'billing',
  'signature',
  'product',
  'productDetail',
  'quotationTemplate',
  'quotationTemplateItem',
  'quotationTemplateItemDetail',
]

function serialize(value) {
  if (value instanceof Date) return value.toISOString()
  return value
}

function deserialize(key, value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
  }
  return value
}

async function exportMasterData() {
  const prisma = getPrismaForExport()
  const source = process.env.DATABASE_URL_LOCAL ? 'DATABASE_URL_LOCAL (local)' : 'DATABASE_URL'
  console.log(`Exporting master data from ${source}...\n`)
  const data = {}
  for (const name of MASTER_MODELS) {
    const model = prisma[name]
    if (!model?.findMany) {
      console.log(`  ⚠ ${name}: not found, skip`)
      data[name] = []
      continue
    }
    const rows = await model.findMany({})
    const normalized = rows.map((r) => {
      const o = {}
      for (const k of Object.keys(r)) o[k] = serialize(r[k])
      return o
    })
    data[name] = normalized
    console.log(`  ✓ ${name}: ${normalized.length} rows`)
  }
  await writeFile(OUT_FILE, JSON.stringify(data, null, 2), 'utf8')
  await prisma.$disconnect()
  console.log(`\n✓ Written to ${OUT_FILE}\n`)
}

const MASTER_MODELS_DELETE_ORDER = [...MASTER_MODELS].reverse()

async function importMasterData(replace = false) {
  const prisma = getPrismaForImport()
  console.log('Importing master data into DATABASE_URL (production)...\n')
  let raw
  try {
    raw = await readFile(OUT_FILE, 'utf8')
  } catch (e) {
    console.error('Missing master-data.json. Run "node master-data-export-import.mjs export" first.')
    process.exit(1)
  }
  const data = JSON.parse(raw)

  if (replace) {
    console.log('Replacing existing master data (delete then insert)...\n')
    for (const name of MASTER_MODELS_DELETE_ORDER) {
      const model = prisma[name]
      if (!model?.deleteMany) continue
      const r = await model.deleteMany({})
      if (r.count > 0) console.log(`  deleted ${name}: ${r.count} rows`)
    }
    console.log('')
  }

  for (const name of MASTER_MODELS) {
    const rows = data[name] || []
    if (rows.length === 0) {
      console.log(`  ○ ${name}: 0 rows, skip`)
      continue
    }
    const model = prisma[name]
    if (!model?.create) {
      console.log(`  ⚠ ${name}: no create, skip`)
      continue
    }
    let done = 0
    for (const row of rows) {
      const obj = { ...row }
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[k]))
          obj[k] = new Date(obj[k])
      }
      try {
        await model.create({ data: obj })
        done++
      } catch (e) {
        if (e.code === 'P2002') {
          await model.upsert({
            where: { id: obj.id },
            create: obj,
            update: obj,
          })
          done++
        } else throw e
      }
    }
    console.log(`  ✓ ${name}: ${done} rows`)
  }
  await prisma.$disconnect()
  console.log('\n✓ Import done.\n')
}

async function main() {
  const cmd = process.argv[2]?.toLowerCase()
  const replace = process.argv.includes('--replace')
  if (cmd === 'export') {
    await exportMasterData()
  } else if (cmd === 'import') {
    await importMasterData(replace)
  } else {
    console.log('Usage: node master-data-export-import.mjs <export|import> [--replace]')
    console.log('  export      – read from DATABASE_URL_LOCAL (or DATABASE_URL), write master-data.json')
    console.log('  import      – read master-data.json, write to DATABASE_URL')
    console.log('  import --replace – delete existing master data in target DB, then insert (use when prod has stale/conflicting rows)')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
