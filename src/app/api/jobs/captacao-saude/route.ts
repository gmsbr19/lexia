// POST /api/jobs/captacao-saude — checagem diária de saúde da captação (ver
// DEPLOY.md §6c). Não há mais worker de envio: o Google Ads LÊ o feed CSV
// (GET /feeds/google-ads/*.csv), não há nada para retentar deste lado. Este
// job só recalcula o alarme de "% de leads sem gclid" e notifica os gestores
// se cruzou o limiar configurado.
import { NextResponse } from "next/server"
import { verificarAlertaCaptacao } from "@/lib/captacao/fila"
import { guardJob } from "@/lib/jobs/guard"
import { log } from "@/lib/log"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const denied = guardJob(req)
  if (denied) return denied
  try {
    const resultado = await verificarAlertaCaptacao()
    log.info({ job: "captacao-saude", ...resultado }, "job de saúde da captação rodou")
    return NextResponse.json({ ok: true, ...resultado })
  } catch (e) {
    log.error({ job: "captacao-saude", err: e instanceof Error ? e.message : String(e) }, "job de saúde da captação falhou")
    return NextResponse.json({ error: "Erro ao checar a saúde da captação" }, { status: 500 })
  }
}
