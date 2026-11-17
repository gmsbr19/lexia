// POST /api/whatsapp/conectar — pede ao worker que abra a sessão do usuário
// logado e comece a emitir QR. Qualquer usuário ativo pode conectar o PRÓPRIO
// WhatsApp (sem gate de papel: o módulo é pessoal, não administrativo).
import { runMutation } from "@/lib/finance/api"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { publicarComando } from "@/lib/whatsapp/sessoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const off = moduloDesligado()
  if (off) return off
  return runMutation(
    async () => {
      const userId = await userIdDaSessao()
      await publicarComando({ tipo: "iniciar", userId })
      return { userId }
    },
    { action: "whatsapp.conectar", entity: "WhatsappSessao" },
  )
}
