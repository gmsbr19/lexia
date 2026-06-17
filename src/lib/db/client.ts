import { PrismaClient } from "@prisma/client"
import "@/lib/env"

// Reuse a single PrismaClient across HMR reloads in dev (Next.js re-evaluates
// modules on every change, which would otherwise exhaust the connection pool).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (!globalForPrisma.prisma) {
  // WAL + busy_timeout: concurrency-friendly journaling (and dev parity with
  // production, where Litestream flips WAL on anyway). Fire-and-forget — a
  // failure here must not block boot.
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {})
  prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {})
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
