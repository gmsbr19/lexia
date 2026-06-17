// PUT /api/consumo/orcamento — save the manual monthly budget + optional USD→BRL rate.
import { z } from "zod"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { setOrcamento } from "@/lib/consumo/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const orcamentoSchema = z.object({
  orcamentoUsd: z.number().min(0).max(1_000_000).nullable(),
  brlRate: z.number().min(0).max(100).nullable(),
  autoDowngrade: z.boolean().default(false),
  limiarPct: z.number().min(50).max(100).default(90),
})

export async function PUT(req: Request) {
  const body = await readJson(req)
  return runMutation(() => setOrcamento(parseBody(orcamentoSchema, body)), {
    action: "consumo.orcamento",
    entity: "AppSetting",
    entityId: "consumo_orcamento",
    payload: body,
    roles: ["socio"],
  })
}
