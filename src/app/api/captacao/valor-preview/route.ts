import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { previsaoValorEvento } from "@/lib/captacao/eventos"
import { UserError } from "@/lib/errors"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EVENTOS = new Set(["formulario_enviado", "lead_qualificado", "reuniao_realizada", "contrato_assinado"])

/** GET /api/captacao/valor-preview?leadId=&evento= — "dado um lead real, qual
 *  valor seria enviado e por quê" (§5.1 do plano). Só leitura. */
export async function GET(req: Request) {
  const denied = await guardRequest(["admin"])
  if (denied) return denied
  const url = new URL(req.url)
  const leadId = Number(url.searchParams.get("leadId"))
  const evento = url.searchParams.get("evento") ?? ""
  if (!Number.isInteger(leadId) || leadId <= 0) return NextResponse.json({ error: "leadId inválido" }, { status: 400 })
  if (!EVENTOS.has(evento)) return NextResponse.json({ error: "evento inválido" }, { status: 400 })
  try {
    const resultado = await previsaoValorEvento(leadId, evento as Parameters<typeof previsaoValorEvento>[1])
    return NextResponse.json(resultado)
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
