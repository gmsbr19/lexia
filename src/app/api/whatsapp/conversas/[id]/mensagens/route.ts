// DELETE /api/whatsapp/conversas/[id]/mensagens — apaga o que já foi gravado
// desta conversa (as mídias vão junto, pelo cascade de WhatsappMidia).
//
// É o que a página oferece ao desmarcar "Monitorar": minimização é regra do
// módulo, e guardar conversa que o usuário decidiu não monitorar contrariaria o
// motivo de a marcação existir. Irreversível — a confirmação é na interface.
import { runMutation } from "@/lib/finance/api"
import { UserError } from "@/lib/errors"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { apagarMensagens } from "@/lib/whatsapp/conversas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const off = moduloDesligado()
  if (off) return off
  const { id } = await ctx.params
  return runMutation(
    async () => {
      const chatId = Number(id)
      if (!Number.isInteger(chatId) || chatId <= 0) throw new UserError("Conversa não encontrada")
      const userId = await userIdDaSessao()
      const apagadas = await apagarMensagens(userId, chatId)
      return { apagadas }
    },
    { action: "whatsapp.conversa.apagar", entity: "WhatsappChat", entityId: id },
  )
}
