import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { redactBundle } from "@/lib/comercial/lgpd"
import { getExportBundle } from "@/lib/comercial/queries"
import { bundleToCsv, buildRelatorioPrompt } from "@/lib/comercial/report"
import { currentMes, normalizePeriodo } from "@/lib/finance/periodo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Returns the period's aggregates + a paste-ready AI prompt + a CSV string the
// Exportar tab offers for download. `?redact=1` strips lead PII (LGPD): names
// → initials, telefone/email removed. The prompt itself is aggregate-only.
export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const url = new URL(req.url)
  const mes = url.searchParams.get("mes") ?? currentMes()
  const periodo = normalizePeriodo(url.searchParams.get("periodo") ?? undefined)
  const redact = url.searchParams.get("redact") === "1"
  const raw = await getExportBundle(mes, periodo)
  const bundle = redact ? redactBundle(raw) : raw
  return NextResponse.json({ bundle, prompt: buildRelatorioPrompt(bundle), csv: bundleToCsv(bundle) })
}
