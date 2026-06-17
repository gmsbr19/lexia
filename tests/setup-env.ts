// Provide the env vars `src/lib/env.ts` requires so importing modules that reach
// the DB/auth layer doesn't throw at load time. Prisma connects lazily (on first
// query), so no database is touched by importing these modules in tests.
process.env.DATABASE_URL ||= "file:./dev.db"
process.env.AUTH_SECRET ||= "test-secret-test-secret-test-secret-0123456789"
