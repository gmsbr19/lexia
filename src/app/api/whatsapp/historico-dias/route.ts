// PUT /api/whatsapp/historico-dias — quantos dias de histórico gravar quando o
// aparelho despeja o passado no pareamento.
//
// É preferência do DONO da sessão: o userId vem da sessão do servidor, como em
// todo o módulo, e não há como mexer na janela de outra pessoa.
import { readJson, runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { historicoDiasSchema } from "@/lib/whatsapp/schemas"
import { definirHistoricoDias } from "@/lib/whatsapp/sessoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(req: Request) {
  const off = moduloDesligado()
  if (off) return off
  const body = await readJson(req)
  return runMutation(
    async () => {
      const { dias } = parseBody(historicoDiasSchema, body)
      return { dias: await definirHistoricoDias(await userIdDaSessao(), dias) }
    },
    { action: "whatsapp.historico-dias", entity: "WhatsappSessao", payload: body },
  )
}
