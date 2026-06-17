import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { guardRequest } from "@/lib/auth/session"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_LIMIT = 200

/**
 * GET /api/audit?limit=&entity=&q= — read-only audit trail for Configurações ·
 * LGPD & Auditoria (admin). `q` matches actor e-mail / action / entityId.
 */
export async function GET(req: Request) {
  const denied = await guardRequest(["admin"])
  if (denied) return denied

  const url = new URL(req.url)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 100))
  const entity = url.searchParams.get("entity")?.trim() || undefined
  const q = url.searchParams.get("q")?.trim() || undefined

  const where: Prisma.AuditLogWhereInput = {}
  if (entity) where.entity = entity
  if (q) {
    where.OR = [{ actorEmail: { contains: q } }, { action: { contains: q } }, { entityId: { contains: q } }]
  }

  const rows = await prisma.auditLog.findMany({
    where,
    select: { id: true, ts: true, actorEmail: true, action: true, entity: true, entityId: true },
    orderBy: { ts: "desc" },
    take: limit,
  })
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      ts: r.ts.toISOString(),
      actorEmail: r.actorEmail,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
    })),
  )
}
