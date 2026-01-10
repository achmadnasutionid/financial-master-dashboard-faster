import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Connection pool optimization for Railway PostgreSQL
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool configuration
  ...(process.env.NODE_ENV === 'production' && {
    // @ts-ignore - Prisma pool configuration
    pool: {
      timeout: 20, // Wait max 20 seconds for a connection
      max: 20,     // Maximum 20 connections in pool
      min: 2,      // Minimum 2 connections always active
    },
  }),
})

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown for production
if (process.env.NODE_ENV === 'production') {
  globalForPrisma.prisma = prisma
  
  // Handle graceful shutdown
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

