import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { MAX_CSV_BYTES } from "@/lib/comercial/import/limits"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { importLeadsMapeadoFromText } from "@/lib/comercial/import/leads-mapeado"
import type { ColumnMapping } from "@/lib/comercial/import/mapeado-core"
import { getPipelineConfig } from "@/lib/settings"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Imports leads from an arbitrary CSV using a user-confirmed header→field
// mapping (see /preview). Body: { csv: string, mapping: Record<header,field> }.
export async function POST(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const email = (await sessionEmail()) ?? "anon"
  if (!rateLimit(`${email}:import`, 5, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  try {
    const body = (await req.json()) as { csv?: unknown; mapping?: unknown }
    const csv = typeof body.csv === "string" ? body.csv : ""
    if (!csv.trim()) return NextResponse.json({ error: "Arquivo CSV vazio" }, { status: 400 })
    if (csv.length > MAX_CSV_BYTES) return NextResponse.json({ error: "Arquivo muito grande (máx. 5 MB)" }, { status: 413 })
    const mapping = (body.mapping && typeof body.mapping === "object" ? body.mapping : {}) as ColumnMapping
    const hasNome = Object.values(mapping).some((f) => f === "nome")
    if (!hasNome) return NextResponse.json({ error: "Mapeie ao menos a coluna do nome do lead" }, { status: 400 })

    const { stages } = await getPipelineConfig()
    const summary = await importLeadsMapeadoFromText(prisma, csv, mapping, stages.map((s) => ({ key: s.key, nome: s.nome })))

    await prisma.auditLog
      .create({
        data: {
          actorEmail: email,
          action: "comercial.leads.importar-mapeado",
          entity: "Lead",
          payload: JSON.stringify(summary).slice(0, 10_000),
        },
      })
      .catch(() => {})

    return NextResponse.json({ ok: true, result: summary })
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error("[comercial] import mapeado error:", e)
    return NextResponse.json({ error: "Erro ao importar o CSV" }, { status: 500 })
  }
}
