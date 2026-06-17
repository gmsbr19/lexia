// POST /api/processos/propor-prazos — roda a auto-proposta de prazos no escopo do
// usuário: arquiva movimentos de rotina e propõe prazos RASCUNHO (status 'proposto')
// nos relevantes via IA. Processa também o backlog já capturado. (cron faz na captura)
import { requireUser } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { proporPrazosDeAndamentos } from "@/lib/processos/triagem-ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  return runMutation(
    async () => {
      const user = await requireUser()
      return proporPrazosDeAndamentos({ user })
    },
    { action: "processo.propor-prazos", entity: "Prazo", roles: ["socio", "advogado"] },
  )
}
