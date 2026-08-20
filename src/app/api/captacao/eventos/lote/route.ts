import { descartarEventos, reativarEventos } from "@/lib/captacao/eventos"
import { conversoesLoteSchema } from "@/lib/captacao/schemas"
import { UserError } from "@/lib/errors"
import { runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json()
  return runMutation(
    () => {
      const { ids, acao, motivo } = parseBody(conversoesLoteSchema, body)
      if (acao === "descartar") {
        if (!motivo?.trim()) throw new UserError("Informe o motivo do descarte")
        return descartarEventos(ids, motivo.trim())
      }
      return reativarEventos(ids)
    },
    { action: "captacao.eventos.lote", entity: "ConversaoEvento", payload: body, roles: ["admin", "socio"] },
  )
}
