// Mapeamento da linha do banco → wire shape (NotificacaoRow). Usado pelo serviço
// (emit no bus) e pelas queries (histórico/sino). PURO o bastante (só links.ts).
import { linkParaNotificacao } from "./links"
import type { Modulo, NotificacaoRow, Prioridade } from "./types"

export interface NotificacaoDb {
  id: number
  tipo: string
  modulo: string | null
  prioridade: string | null
  refTipo: string | null
  refId: number | null
  mensagem: string
  link: string | null
  actorEmail: string | null
  contador: number
  lida: boolean
  createdAt: Date
}

export function toRow(n: NotificacaoDb): NotificacaoRow {
  const modulo = (n.modulo as Modulo | null) ?? null
  return {
    id: n.id,
    tipo: n.tipo,
    modulo,
    prioridade: (n.prioridade as Prioridade) ?? "normal",
    refTipo: n.refTipo,
    refId: n.refId,
    mensagem: n.mensagem,
    // `link` é pré-resolvido na criação; o fallback cobre linhas antigas (null).
    link: n.link ?? linkParaNotificacao(modulo, n.refTipo, n.refId),
    actorEmail: n.actorEmail,
    contador: n.contador,
    lida: n.lida,
    createdAt: n.createdAt.toISOString(),
  }
}
