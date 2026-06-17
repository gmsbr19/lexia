import { NextResponse } from "next/server"
import { existsSync } from "node:fs"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { importAstrea } from "@/lib/finance/import/run"
import { log } from "@/lib/log"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"

// Prisma's engine needs the Node runtime (not edge).
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied

  const email = (await sessionEmail()) ?? "anon"
  if (!rateLimit(`${email}:reimport`, 2, 600_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  const dir = process.env.ASTREA_BACKUP_DIR
  if (!dir || !existsSync(dir)) {
    return NextResponse.json({ error: "ASTREA_BACKUP_DIR não configurado ou inexistente." }, { status: 400 })
  }
  try {
    const summary = await importAstrea(prisma, dir)
    // Best-effort audit entry — sources the "última importação" status in Configurações.
    await prisma.auditLog
      .create({
        data: {
          actorEmail: email,
          action: "financeiro.reimport",
          entity: "ImportAstrea",
          payload: JSON.stringify(summary).slice(0, 10_000),
        },
      })
      .catch(() => {})
    return NextResponse.json({ ok: true, summary })
  } catch (e) {
    log.error({ action: "financeiro.reimport", actor: email, err: e instanceof Error ? e.message : String(e) }, "reimport failed")
    return NextResponse.json({ error: "Falha ao importar o backup." }, { status: 500 })
  }
}
