// Liveness/readiness probe — excluded from the auth gate in `src/proxy.ts` so
// an uptime pinger (UptimeRobot / healthchecks.io) can hit it without a cookie.
// Returns 503 when the database is unreachable.
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const uptime = Math.round(process.uptime())
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, db: true, uptime })
  } catch (e) {
    console.error("[health] db check failed:", e)
    return NextResponse.json({ ok: false, db: false, uptime }, { status: 503 })
  }
}
