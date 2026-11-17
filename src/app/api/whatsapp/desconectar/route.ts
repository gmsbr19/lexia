// POST /api/whatsapp/desconectar — encerra a sessão do usuário logado.
//
// Dois caminhos, de propósito:
//  • worker ONLINE  → manda o comando: ele faz `logout()` de verdade (o aparelho
//    sai de "Aparelhos conectados" no celular) e só então apaga as credenciais.
//  • worker OFFLINE → revoga AQUI mesmo (apaga WhatsappAuth + marca deslogado).
//    Quem pediu para desconectar não pode ficar com a credencial guardada só
//    porque um processo está fora do ar; o aparelho continua listado no celular
//    até o próximo logout, e a tela diz isso.
import { runMutation } from "@/lib/finance/api"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { apagarAuth, getSessaoView, mudarStatus, publicarComando } from "@/lib/whatsapp/sessoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const off = moduloDesligado()
  if (off) return off
  return runMutation(
    async () => {
      const userId = await userIdDaSessao()
      const { workerOnline } = await getSessaoView(userId)
      if (workerOnline) {
        await publicarComando({ tipo: "desconectar", userId })
        return { userId, revogadoLocalmente: false }
      }
      await apagarAuth(userId)
      await mudarStatus(userId, "deslogado", { numero: null, conectadoEm: null, pareamento: null, ultimoErro: null })
      return { userId, revogadoLocalmente: true }
    },
    { action: "whatsapp.desconectar", entity: "WhatsappSessao" },
  )
}
