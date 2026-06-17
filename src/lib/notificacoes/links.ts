// Deep-link de uma notificação → rota interna do app. PURO (sem deps) para ser
// client-safe e testável. As convenções espelham a whitelist de navegação
// (src/lib/lexia/agent/tools/navegacao.ts) e os deep-links da LexIA (agent/links.ts).
//
// O `link` final é PRÉ-RESOLVIDO no momento da criação (coluna Notificacao.link),
// porque o trigger conhece o processoId/contexto. Esta função é o FALLBACK quando
// `link` é null (notificações antigas) — derivada de refTipo/refId/módulo.
import type { Modulo } from "./types"

export function linkParaNotificacao(
  modulo: Modulo | null,
  refTipo: string | null,
  refId: number | null,
  extra?: { processoId?: number | null },
): string | null {
  switch (refTipo) {
    case "tarefa":
      return refId ? `/tarefas?tarefa=${refId}` : "/tarefas"
    case "evento":
      return "/agenda"
    case "prazo": {
      const pid = extra?.processoId
      return pid ? `/processos/${pid}` : "/processos?view=prazos"
    }
    case "publicacao":
      return "/processos?view=andamentos"
    case "processo":
      return refId ? `/processos/${refId}` : "/processos"
    case "lead":
      return "/comercial?tab=leads"
    case "documento":
      return refId ? `/contratos?contrato=${refId}` : "/documents"
    case "captura":
      return "/processos?view=captura"
    default:
      break
  }
  // Sem refTipo reconhecido → cai no índice do módulo.
  switch (modulo) {
    case "tarefas":
      return "/tarefas"
    case "agenda":
      return "/agenda"
    case "processos":
      return "/processos"
    case "comercial":
      return "/comercial"
    case "documentos":
      return "/documents"
    case "ia":
      return "/lexia"
    default:
      return null
  }
}
