import { PrismaClient } from '@prisma/client'

// Single PrismaClient instance for the process lifetime.
// PrismaClient manages its own connection pool — do not instantiate per-request.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export default prisma
