import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { MAX_CSV_BYTES, rejectNonCsvBody } from "@/lib/comercial/import/limits"
import { parseCsvText } from "@/lib/finance/import/parse-csv"
import { suggestMapping } from "@/lib/comercial/import/mapeado-core"
import { UserError } from "@/lib/errors"
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Parses an arbitrary CSV (sent as the request body) and returns its headers, a
// few sample rows, and an auto-suggested header→field mapping — powering the
// column-mapping UI. Nothing is written; the confirmed import goes through
// /api/comercial/leads/import/mapeado.
export async function POST(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const email = (await sessionEmail()) ?? "anon"
  if (!rateLimit(`${email}:import-preview`, 20, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 })
  }

  const rejected = rejectNonCsvBody(req)
  if (rejected) return rejected

  try {
    const text = await req.text()
    if (!text || !text.trim()) return NextResponse.json({ error: "Arquivo CSV vazio" }, { status: 400 })
    if (text.length > MAX_CSV_BYTES) return NextResponse.json({ error: "Arquivo muito grande (máx. 5 MB)" }, { status: 413 })
    const rows = parseCsvText(text)
    const headers = rows.length ? Object.keys(rows[0]) : []
    if (!headers.length) return NextResponse.json({ error: "Não foi possível ler as colunas do CSV" }, { status: 400 })
    return NextResponse.json({
      ok: true,
      headers,
      sample: rows.slice(0, 5),
      suggested: suggestMapping(headers),
      count: rows.length,
    })
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error("[comercial] import preview error:", e)
    return NextResponse.json({ error: "Erro ao ler o CSV" }, { status: 500 })
  }
}
