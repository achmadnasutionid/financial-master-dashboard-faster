/**
 * Global Test Setup
 * 
 * This file runs ONCE before all tests
 * - Ensures test database has correct schema
 * - Cleans up test data after all tests complete
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Safety check: Ensure we're using test database
const databaseUrl = process.env.DATABASE_URL || ''
if (process.env.NODE_ENV !== 'test' && !databaseUrl.includes('test')) {
  console.error('❌ ERROR: Test suite must use test database!')
  console.error('Current DATABASE_URL:', databaseUrl)
  console.error('Make sure you are running tests with: npm run test')
  process.exit(1)
}

console.log('🧪 Test Environment Check:')
console.log('  - NODE_ENV:', process.env.NODE_ENV)
console.log('  - Database:', databaseUrl.includes('test') ? '✅ TEST DB' : '⚠️  WARNING: NOT TEST DB')

// Run ONCE before all tests
beforeAll(async () => {
  console.log('\n🗄️  Setting up test database...')
  
  try {
    // Apply migrations to test database
    console.log('  - Applying migrations...')
    execSync('npx prisma migrate deploy', {
      env: { 
        ...process.env, 
        DATABASE_URL: process.env.DATABASE_URL 
      },
      stdio: 'inherit'
    })
    
    console.log('✅ Test database ready\n')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    process.exit(1)
  }
}, 60000) // 60 second timeout for migrations

// Run ONCE after all tests
afterAll(async () => {
  console.log('\n🧹 Cleaning up test database...')
  
  try {
    // Truncate all tables (faster than deleting)
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "ProductionTracker",
        "Invoice",
        "InvoiceItem",
        "InvoiceItemDetail",
        "InvoiceRemark",
        "InvoiceSignature",
        "Quotation",
        "QuotationItem",
        "QuotationItemDetail",
        "QuotationRemark",
        "QuotationSignature",
        "Expense",
        "ExpenseItem",
        "Planning",
        "PlanningItem",
        "ParagonTicket",
        "ParagonTicketItem",
        "ParagonTicketItemDetail",
        "ParagonTicketRemark",
        "ErhaTicket",
        "ErhaTicketItem",
        "ErhaTicketItemDetail",
        "ErhaTicketRemark",
        "Company",
        "Billing",
        "Signature",
        "Product",
        "ProductDetail"
      CASCADE
    `)
    
    console.log('✅ Test database cleaned')
  } catch (error) {
    console.error('⚠️  Failed to clean test database:', error)
    // Don't fail the test run if cleanup fails
  } finally {
    await prisma.$disconnect()
    console.log('👋 Disconnected from test database\n')
  }
}, 30000) // 30 second timeout for cleanup
