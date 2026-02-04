/**
 * CRITICAL FEATURES - SANITY TEST CHECKLIST
 * 
 * Run these tests before deploying any changes to critical features.
 * All tests should pass before pushing to production.
 */

export const CRITICAL_FEATURES = {
  '1. Transaction Safety & Data Loss Prevention': {
    priority: 'CRITICAL 🔴',
    description: 'Ensures no data is lost if updates fail mid-transaction',
    testFile: 'tests/critical/transaction-safety.test.ts',
    tests: [
      'Transaction rolls back completely on error',
      'UPSERT pattern preserves existing data',
      'No partial updates when errors occur',
      'Can retry failed operations safely'
    ],
    affectedEndpoints: [
      'POST/PUT /api/quotation/[id]',
      'POST/PUT /api/invoice/[id]',
      'POST/PUT /api/planning/[id]',
      'POST/PUT /api/expense/[id]',
      'POST/PUT /api/erha/[id]',
      'POST/PUT /api/paragon/[id]'
    ]
  },

  '2. Optimistic Locking & Concurrent Edits': {
    priority: 'CRITICAL 🔴',
    description: 'Prevents users from overwriting each other\'s changes',
    testFile: 'tests/critical/optimistic-locking.test.ts',
    tests: [
      'Detects when record was modified by another user',
      'Returns 409 Conflict when version mismatch',
      'Allows save when version matches',
      'Provides clear error message to user'
    ],
    affectedEndpoints: [
      'PUT /api/quotation/[id]',
      'PUT /api/invoice/[id]'
    ]
  },

  '3. Performance & Batch Operations': {
    priority: 'HIGH 🟡',
    description: 'Ensures updates are fast and efficient',
    testFile: 'tests/critical/performance.test.ts',
    tests: [
      'Large updates complete in < 2 seconds',
      'Uses Promise.all for parallel operations',
      'Uses createMany for bulk inserts',
      'Uses deleteMany for bulk deletes'
    ],
    affectedEndpoints: [
      'All update endpoints'
    ]
  },

  '4. All Endpoints Use Safe Patterns': {
    priority: 'CRITICAL 🔴',
    description: 'Verifies all endpoints follow UPSERT pattern (no delete-then-create)',
    testFile: 'tests/critical/all-endpoints.test.ts',
    tests: [
      'Planning endpoint uses UPSERT',
      'Expense endpoint uses UPSERT',
      'Quotation handles nested updates safely',
      'All endpoints use transactions'
    ],
    affectedEndpoints: [
      'All update endpoints'
    ]
  },

  '5. Smart Auto-Save': {
    priority: 'CRITICAL 🔴',
    description: 'Ensures auto-save works reliably without data loss or user frustration',
    testFile: 'tests/critical/auto-save.test.ts',
    tests: [
      'Validates mandatory fields before saving',
      'Saves successfully when all fields filled',
      'Respects rate limiting (10s between saves)',
      'Detects concurrent edits (optimistic locking)',
      'Always saves as "draft" status',
      'Handles complex saves (items + remarks UPSERT)',
      'Performs well (< 2s for 10 items)'
    ],
    affectedEndpoints: [
      'PUT /api/quotation/[id] (auto-save)',
      'PUT /api/invoice/[id] (auto-save)'
    ],
    features: [
      'Railway-friendly timeout (15s)',
      'Max 2 retry attempts',
      'Silent non-critical errors',
      'Coordination with manual saves',
      'Debouncing (5s after typing)',
      'No validation error spam'
    ]
  },

  '6. PDF Generation': {
    priority: 'CRITICAL 🔴',
    description: 'Ensures PDFs are generated correctly with all data rendered accurately',
    testFile: 'tests/critical/pdf-generation.test.ts',
    tests: [
      'Generates valid PDF bytes',
      'PDF has correct structure (header, sections)',
      'Renders all items with nested details',
      'Renders remarks in correct order',
      'Renders custom signatures',
      'PPH calculations displayed correctly',
      'Performance (< 3s for complex documents)',
      'Handles optional fields gracefully',
      'PDF file format valid (%PDF header)'
    ],
    affectedEndpoints: [
      'GET /api/quotation/[id] → PDF component',
      'GET /api/invoice/[id] → PDF component',
      'GET /api/planning/[id] → PDF component',
      'GET /api/expense/[id] → PDF component'
    ],
    features: [
      '@react-pdf/renderer integration',
      'Complex nested data rendering',
      'Indonesian currency formatting',
      'Multi-page support',
      'Signature image handling',
      'Custom styling and layout'
    ]
  }
}

/**
 * HOW TO RUN TESTS
 * 
 * 1. Run all critical tests:
 *    npm run test:critical
 * 
 * 2. Run tests in watch mode (auto-rerun on changes):
 *    npm run test:watch
 * 
 * 3. Run tests with UI (visual dashboard):
 *    npm run test:ui
 * 
 * 4. Run all tests:
 *    npm test
 */

/**
 * WHEN TO RUN TESTS
 * 
 * - ✅ Before every deployment to production
 * - ✅ After modifying any API route
 * - ✅ After changing database operations
 * - ✅ After updating Prisma schema
 * - ✅ When adding new features
 * - ✅ Weekly sanity check
 */

/**
 * WHAT TO DO IF TESTS FAIL
 * 
 * 1. Read the error message - it will tell you what broke
 * 2. Check the affected file/endpoint
 * 3. Fix the issue
 * 4. Re-run tests
 * 5. DO NOT deploy until all tests pass
 */

/**
 * TEST RESULTS GUIDE
 * 
 * ✅ PASS - Feature working correctly
 * ❌ FAIL - Critical issue, DO NOT deploy
 * ⏭️  SKIP - Test skipped (check why)
 */
