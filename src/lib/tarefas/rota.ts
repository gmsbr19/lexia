// Tarefas — helper das rotas de escrita: resolve o ATOR da sessão e passa pelo
// choke point `runMutation` (sessão → papel → rate-limit → mutação → auditoria),
// com a origem da requisição disponível p/ os links de e-mail das notificações.
// SERVER ONLY.
import { sessionEmail } from "@/lib/auth/session"
import { runMutation, type MutationMeta } from "@/lib/finance/api"
import { resolveRequestOrigin, withRequestOrigin } from "@/lib/request-origin"
import { resolverAtor, type Ator } from "./mutations"

export function mutacaoTarefa(
  req: Request,
  meta: MutationMeta,
  fn: (ator: Ator) => Promise<unknown>,
): Promise<Response> {
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(async () => fn(await resolverAtor(await sessionEmail())), { entity: "Tarefa", ...meta }),
  )
}

export type RotaItem = { params: Promise<{ id: string; item: string }> }
export type RotaAnexo = { params: Promise<{ id: string; anexoId: string }> }
