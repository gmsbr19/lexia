// POST /api/notificacoes/relatorio-teste — envia AGORA o relatório diário de
// tarefas para o próprio usuário da sessão, ignorando hora/opt-in/marcador.
// Serve p/ conferir o e-mail sem esperar o cron (botão em Configurações →
// Notificações). Qualquer usuário autenticado pode disparar o SEU próprio.
import { requireUser } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { enviarRelatoriosDiarios } from "@/lib/tarefas/relatorio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  return runMutation(
    async () => {
      const me = await requireUser()
      const r = await enviarRelatoriosDiarios({ somenteEmail: me.email })
      return { ok: true, ...r }
    },
    { action: "notificacao.relatorio-teste", entity: "Notificacao" },
  )
}
