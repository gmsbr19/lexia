// LexIA chat — view-model shapes for the floating popup. Conversations are
// per-user (scoped by session e-mail). Pure module — safe on client and server.
import type { DocOp } from "@/lib/documents/model/ops"
import type { CampoDetectado } from "@/lib/documents/model/campos"

export type LexiaMsgRole = "user" | "assistant"

// ── UI blocks: the rich render units of an assistant turn (persisted as JSON on
// LexiaMensagem.blocks; streamed live as SSE events). ──
export type UiBlock =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; label: string; status: "ok" | "erro" }
  | { type: "navigate"; rota: string }
  // a clickable deep-link to an entity the agent just created/changed
  | { type: "link"; rota: string; label: string }
  | {
      type: "confirm"
      acaoId: number
      toolName: string
      resumo: string
      payload: unknown
      /** Linhas legíveis (nomes resolvidos, datas/$ em pt-BR) para o cartão. */
      detalhes?: ConfirmDetalhe[]
      status: "pendente" | "confirmada" | "recusada" | "expirada"
    }
  // edições propostas ao documento aberto (só no editor flexível); o card
  // "Aplicar/Aplicar todos" aplica `ops`/`campos` no editor vivo.
  | { type: "doc-patch"; ops: DocOp[]; campos?: CampoDetectado[] }
  | { type: "notice"; text: string }

/** Uma linha do cartão de confirmação, já formatada para humanos. */
export interface ConfirmDetalhe {
  label: string
  valor: string
}

// ── SSE events (server → browser over the streaming endpoints). ──
export type SseEvent =
  | { type: "start"; conversaId: number; userMsgId?: number }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; label: string; status: "run" | "ok" | "erro" }
  | { type: "navigate"; rota: string }
  | { type: "link"; rota: string; label: string }
  | { type: "confirm"; acaoId: number; toolName: string; resumo: string; payload: unknown; detalhes?: ConfirmDetalhe[] }
  | { type: "doc-patch"; ops: DocOp[]; campos?: CampoDetectado[] }
  | { type: "done"; mensagemId?: number; model: string; inputTokens: number; outputTokens: number; pendente?: number }
  | { type: "error"; mensagem: string }

export type Emit = (ev: SseEvent) => void

/** Metadados de um anexo (para exibir o chip no balão; sem os bytes). */
export interface AnexoMeta {
  nome: string
  mimeType: string
  tamanho: number // bytes
}

export interface LexiaMensagemRow {
  id: number
  role: LexiaMsgRole
  content: string
  criadaEm: string // ISO
  blocks?: UiBlock[] // assistant turns: rich render units (text/tool/confirm/notice/navigate)
  model?: string | null
  anexos?: AnexoMeta[] // user turns: imagens/PDF encaminhados
}

export interface LexiaConversaRow {
  id: number
  titulo: string | null
  criadaEm: string // ISO
  atualizadaEm: string // ISO
  numMensagens: number
}

export interface LexiaConversaDetail extends LexiaConversaRow {
  mensagens: LexiaMensagemRow[]
}

/** POST /api/lexia/chat response: the persisted user turn + assistant reply. */
export interface LexiaChatResult {
  conversaId: number
  mensagens: LexiaMensagemRow[] // [userMsg, assistantMsg]
}
