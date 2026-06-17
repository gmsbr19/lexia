import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { MAX_CSV_BYTES, rejectNonCsvBody } from "@/lib/comercial/import/limits"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { importLeadsFromText } from "@/lib/comercial/import/leads"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Accepts the raw text of a Genions "Relatório de atendimentos" CSV (sent as the
// request body) and upserts the leads idempotently. Returns the import summary.
export async function POST(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const email = (await sessionEmail()) ?? "anon"
  if (!rateLimit(`${email}:import`, 5, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  const rejected = rejectNonCsvBody(req)
  if (rejected) return rejected

  try {
    const text = await req.text()
    if (!text || !text.trim()) return NextResponse.json({ error: "Arquivo CSV vazio" }, { status: 400 })
    if (text.length > MAX_CSV_BYTES) return NextResponse.json({ error: "Arquivo muito grande (máx. 5 MB)" }, { status: 413 })
    const summary = await importLeadsFromText(prisma, text)
    // Best-effort audit entry — sources the "última importação" status in Configurações.
    await prisma.auditLog
      .create({
        data: {
          actorEmail: email,
          action: "comercial.leads.importar",
          entity: "Lead",
          payload: JSON.stringify(summary).slice(0, 10_000),
        },
      })
      .catch(() => {})
    return NextResponse.json({ ok: true, result: summary })
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error("[comercial] import leads error:", e)
    return NextResponse.json({ error: "Erro ao importar o CSV" }, { status: 500 })
  }
}
