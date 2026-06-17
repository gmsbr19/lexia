// Tipos compartilhados do módulo de notificações. PURO (sem Prisma/env) — pode
// ser importado tanto no servidor quanto no cliente (store/UI/testes).

export type Modulo = "tarefas" | "agenda" | "processos" | "comercial" | "documentos" | "ia" | "sistema"
export const MODULOS: readonly Modulo[] = ["tarefas", "agenda", "processos", "comercial", "documentos", "ia", "sistema"]

export type Prioridade = "baixa" | "normal" | "alta" | "critica"
export const PRIORIDADES: readonly Prioridade[] = ["baixa", "normal", "alta", "critica"]

/** Rótulos pt-BR para a UI (preferências, histórico, filtros). */
export const MODULO_LABEL: Record<Modulo, string> = {
  tarefas: "Tarefas",
  agenda: "Agenda",
  processos: "Processos & Prazos",
  comercial: "Comercial",
  documentos: "Documentos",
  ia: "LexIA",
  sistema: "Sistema",
}

/** Severidade ordinal — usada pelo limiar `emailMinPrioridade` das preferências. */
export function prioridadeRank(p: Prioridade | null | undefined): number {
  switch (p) {
    case "critica":
      return 3
    case "alta":
      return 2
    case "baixa":
      return 0
    default:
      return 1 // 'normal'
  }
}

/** Linha serializada (wire shape) — sino, toast, histórico e frames do SSE. */
export interface NotificacaoRow {
  id: number
  tipo: string
  modulo: Modulo | null
  prioridade: Prioridade
  refTipo: string | null
  refId: number | null
  mensagem: string
  link: string | null
  actorEmail: string | null
  contador: number
  lida: boolean
  createdAt: string // ISO
}

/** Evento publicado no bus em processo e enviado pelo SSE. */
export type NotificacaoEvent =
  | { kind: "nova"; notif: NotificacaoRow }
  | { kind: "atualizada"; notif: NotificacaoRow }
  // mudanças de leitura → sincronizam o badge entre abas do mesmo usuário
  | { kind: "lida"; id: number }
  | { kind: "todasLidas" }
