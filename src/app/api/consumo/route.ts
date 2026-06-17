// GET /api/consumo?periodo=mes|30d|mes_passado[&force=1] — real Anthropic API spend
// (Admin Cost API) + manual budget. Guarded to sócio (admin implicit-passes).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getConsumo } from "@/lib/consumo/queries"
import type { ConsumoPeriodo } from "@/lib/consumo/types"
import { log } from "@/lib/log"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PERIODOS = new Set<ConsumoPeriodo>(["mes", "30d", "mes_passado"])

export async function GET(req: Request) {
  const denied = await guardRequest(["socio"])
  if (denied) return denied

  const url = new URL(req.url)
  const p = url.searchParams.get("periodo") ?? "mes"
  const periodo: ConsumoPeriodo = PERIODOS.has(p as ConsumoPeriodo) ? (p as ConsumoPeriodo) : "mes"
  const force = url.searchParams.get("force") === "1"

  try {
    return NextResponse.json(await getConsumo(periodo, force))
  } catch (e) {
    log.error({ err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }, "consumo failed")
    return NextResponse.json({ error: "Não foi possível carregar o consumo." }, { status: 500 })
  }
}
