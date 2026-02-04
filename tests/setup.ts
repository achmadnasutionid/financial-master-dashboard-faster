import { beforeAll, afterAll } from 'vitest'

// Setup runs before all tests
beforeAll(async () => {
  // Ensure we're using test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    console.warn('⚠️  Warning: Not using test database!')
  }
})

// Cleanup runs after all tests
afterAll(async () => {
  // Add any cleanup here if needed
})
