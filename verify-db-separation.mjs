/**
 * Verify Database Separation
 * Ensures test and production databases are on different servers
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

console.log('🔍 Verifying Database Separation\n')
console.log('='.repeat(70))

// Load production env
const prodEnv = config({ path: resolve(process.cwd(), '.env') }).parsed
// Load test env  
const testEnv = config({ path: resolve(process.cwd(), '.env.test') }).parsed

console.log('\n📊 Production Database:')
console.log(`   URL: ${prodEnv?.DATABASE_URL?.substring(0, 60)}...`)

console.log('\n🧪 Test Database:')
console.log(`   URL: ${testEnv?.DATABASE_URL?.substring(0, 60)}...`)

// Extract host and database name
function parseDbUrl(url) {
  const match = url?.match(/postgresql:\/\/[^@]+@([^:]+):(\d+)\/([^?]+)/)
  if (!match) return null
  return {
    host: match[1],
    port: match[2],
    database: match[3]
  }
}

const prodDb = parseDbUrl(prodEnv?.DATABASE_URL)
const testDb = parseDbUrl(testEnv?.DATABASE_URL)

console.log('\n📋 Parsed Details:')
console.log('\n  Production:')
console.log(`    Host: ${prodDb?.host}`)
console.log(`    Port: ${prodDb?.port}`)
console.log(`    Database: ${prodDb?.database}`)

console.log('\n  Test:')
console.log(`    Host: ${testDb?.host}`)
console.log(`    Port: ${testDb?.port}`)
console.log(`    Database: ${testDb?.database}`)

console.log('\n' + '='.repeat(70))

// Check separation
const issues = []

if (prodDb?.host === testDb?.host && prodDb?.port === testDb?.port) {
  console.log('\n⚠️  WARNING: Using SAME database server!')
  console.log('   Production and test are on the same PostgreSQL instance.')
  if (prodDb?.database === testDb?.database) {
    console.log('\n❌ CRITICAL: Using SAME database name!')
    console.log('   This is VERY dangerous - tests will affect production data!')
    issues.push('Same server AND same database')
  } else {
    console.log('\n⚠️  Using different database names (somewhat safe)')
    console.log('   But still sharing the same server - not ideal.')
    issues.push('Same server, different databases')
  }
} else {
  console.log('\n✅ GOOD: Using SEPARATE database servers!')
  console.log('   Production and test are completely isolated.')
}

// Connect and verify
console.log('\n🔌 Testing Connections...\n')

try {
  // Test production connection
  console.log('  Testing production database...')
  const prodPrisma = new PrismaClient({
    datasources: {
      db: {
        url: prodEnv?.DATABASE_URL
      }
    }
  })
  
  const prodResult = await prodPrisma.$queryRaw`SELECT current_database() as db, version()`
  console.log(`    ✅ Connected to: ${prodResult[0].db}`)
  await prodPrisma.$disconnect()

  // Test test database
  console.log('  Testing test database...')
  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: testEnv?.DATABASE_URL
      }
    }
  })
  
  const testResult = await testPrisma.$queryRaw`SELECT current_database() as db, version()`
  console.log(`    ✅ Connected to: ${testResult[0].db}`)
  await testPrisma.$disconnect()

  console.log('\n' + '='.repeat(70))
  
  if (issues.length === 0) {
    console.log('\n🎉 SUCCESS: Databases are properly separated!')
    console.log('   You can safely run integration tests without affecting production.')
  } else {
    console.log('\n⚠️  RECOMMENDATIONS:')
    console.log('\n   1. Create a NEW PostgreSQL service on Railway for testing')
    console.log('   2. Update .env.test with the new database credentials')
    console.log('   3. Run this verification script again')
    console.log('\n   See SETUP-SEPARATE-TEST-DB.md for detailed instructions.')
  }

} catch (error) {
  console.error('\n❌ Connection Error:', error.message)
}

console.log()
