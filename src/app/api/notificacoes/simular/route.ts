// POST /api/notificacoes/simular — ferramenta de DEBUG (somente admin) que dispara
// uma notificação simulada pelo caminho REAL (service → bus → SSE → toast → e-mail).
// Estritamente admin: gate server-side via runMutation roles + requireUser interno.
import { requireUser } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { simularNotificacaoSchema } from "@/lib/notificacoes/schemas"
import { criarNotificacao } from "@/lib/notificacoes/service"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(
    async () => {
      const me = await requireUser()
      const v = parseBody(simularNotificacaoSchema, body)
      const userEmail = v.destinatario === "me" ? me.email : v.destinatario.trim()
      const row = await criarNotificacao({
        userEmail,
        tipo: "simulada",
        modulo: v.modulo ?? "sistema",
        prioridade: v.prioridade ?? "normal",
        mensagem: v.mensagem,
        link: v.link?.trim() || null,
        actorEmail: me.email,
        forcarEmail: v.enviarEmail === true,
      })
      return row ?? { ok: true, silenciada: true }
    },
    { action: "notificacao.simular", entity: "Notificacao", payload: body, roles: ["admin"] },
  )
}
