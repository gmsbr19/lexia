// POST /api/whatsapp/conversas/[id]/historico — pede ao WhatsApp as mensagens
// anteriores às que já estão gravadas nesta conversa.
//
// É um PEDIDO, não uma leitura: quem fala com o WhatsApp é o worker, e a
// resposta chega depois pela ingestão (o mesmo caminho do histórico do
// pareamento). A rota devolve assim que o comando é publicado — a página avisa
// o usuário e recarrega depois.
//
// O id da conversa vem da URL, o do usuário vem da SESSÃO: conversa de outra
// pessoa responde "não encontrada", como no resto do módulo.
import { UserError } from "@/lib/errors"
import { runMutation } from "@/lib/finance/api"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { pedirHistorico } from "@/lib/whatsapp/conversas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const off = moduloDesligado()
  if (off) return off
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const chatId = Number(id)
      if (!Number.isInteger(chatId) || chatId <= 0) throw new UserError("Conversa não encontrada")
      return pedirHistorico(await userIdDaSessao(), chatId)
    },
    // Auditoria sem conteúdo: quem pediu o histórico de qual conversa.
    { action: "whatsapp.conversa.historico", entity: "WhatsappChat", entityId: id },
  )
}
