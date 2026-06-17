// POST /api/notificacoes/marcar-todas — marca todas as notificações do usuário como lidas.
import { sessionEmail } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { marcarTodasLidas } from "@/lib/notificacoes/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const email = (await sessionEmail()) ?? ""
  return runMutation(() => marcarTodasLidas(email), { action: "notificacao.marcarTodas", entity: "Notificacao" })
}
