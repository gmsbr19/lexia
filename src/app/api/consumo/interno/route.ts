// GET /api/consumo/interno?periodo=mes|30d|mes_passado — real-time internal usage
// (LexiaUso ledger, priced locally) with a per-feature breakdown. No billing lag.
// Guarded to sócio (admin implicit-passes).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getUsoInterno } from "@/lib/consumo/ledger"
import type { ConsumoPeriodo } from "@/lib/consumo/types"
import { log } from "@/lib/log"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PERIODOS = new Set<ConsumoPeriodo>(["mes", "30d", "mes_passado"])

export async function GET(req: Request) {
  const denied = await guardRequest(["socio"])
  if (denied) return denied

  const p = new URL(req.url).searchParams.get("periodo") ?? "mes"
  const periodo: ConsumoPeriodo = PERIODOS.has(p as ConsumoPeriodo) ? (p as ConsumoPeriodo) : "mes"

  try {
    return NextResponse.json(await getUsoInterno(periodo))
  } catch (e) {
    log.error({ err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }, "consumo interno failed")
    return NextResponse.json({ error: "Não foi possível carregar o consumo interno." }, { status: 500 })
  }
}
