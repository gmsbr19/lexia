import { createHonorarioLancamento } from "@/lib/finance/mutations"
import { honorarioCreateSchema } from "@/lib/finance/schemas"
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// A honorário is a Lancamento entrada (subTipo='honorario'). This endpoint keeps
// its legacy URL but now creates a fee-lançamento (the Honorario table is dormant).
export async function POST(req: Request) {
  const body = await readJson(req)
  const p = parseBody(honorarioCreateSchema, body)
  return runMutation(
    () =>
      createHonorarioLancamento({
        descricao: p.descricao,
        valorCents: p.valorCents,
        dataVencimento: p.dataVencimento ?? null,
        tipoHonorario: p.tipo ?? null,
        clienteId: p.clienteId ?? null,
        casoId: p.casoId ?? null,
      }),
    { action: "lancamento.criar", entity: "Lancamento", payload: body },
  )
}
