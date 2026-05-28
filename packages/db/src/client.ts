import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the monorepo root or local directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // During prisma generate / schema loading, DATABASE_URL might not be strictly needed, but client needs it
  if (process.env.NODE_ENV !== 'production' && !process.env.PRISMA_GENERATE_SKIP) {
    // Provide a fallback only to prevent load-time crash during generation if env isn't loaded yet
    process.env.DATABASE_URL = 'postgresql://kirkphillip:Jameson5475@localhost:5432/singr_dev?schema=public'
  }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const basePrisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Define models that support soft delete
const SOFT_DELETE_MODELS = ['User', 'Venue', 'Show', 'System', 'Request']

/**
 * Extended Prisma Client implementing soft-delete.
 * Automatically filters out records where deletedAt is not null,
 * and intercepts delete/deleteMany calls to update deletedAt instead.
 */
export const prisma = basePrisma.$extends({
  name: 'softDelete',
  query: {
    $allModels: {
      async findMany({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = { deletedAt: null, ...args.where }
        }
        return query(args)
      },
      async findFirst({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = { deletedAt: null, ...args.where }
        }
        return query(args)
      },
      async findUnique({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = { deletedAt: null, ...args.where }
        }
        return query(args)
      },
      async count({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = { deletedAt: null, ...args.where }
        }
        return query(args)
      },
      async delete({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          const clientName = model.charAt(0).toLowerCase() + model.slice(1)
          return (basePrisma as any)[clientName].update({
            ...args,
            data: { deletedAt: new Date() },
          })
        }
        return query(args)
      },
      async deleteMany({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          const clientName = model.charAt(0).toLowerCase() + model.slice(1)
          return (basePrisma as any)[clientName].updateMany({
            ...args,
            data: { deletedAt: new Date() },
          })
        }
        return query(args)
      },
    },
  },
})

// Export basePrisma in case soft-delete bypass is required (e.g., admin reporting or restore operations)
export const rawPrisma = basePrisma

export * from '@prisma/client'

