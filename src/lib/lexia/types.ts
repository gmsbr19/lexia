// LexIA chat — view-model shapes for the floating popup. Conversations are
// per-user (scoped by session e-mail). Pure module — safe on client and server.
import type { DocOp } from "@/lib/documents/model/ops"
import type { CampoDetectado } from "@/lib/documents/model/campos"
import type { CardPayload, Fonte, MsgMeta } from "./cards-types"
export type { CardPayload, Fonte, MsgMeta, PensamentoMeta } from "./cards-types"

export type LexiaMsgRole = "user" | "assistant"

/** Código estruturado de aviso — SysCard deriva tom/ícone/título/ação a partir dele
 * (Fase 4). "modo-economico" não é erro (é informativo — a IA se adaptou),
 * mas viaja no mesmo canal `notice.codigo`. */
export type ErroCodigo = "overloaded" | "timeout" | "sem-chave" | "generico" | "offline" | "sessao" | "stream" | "modo-economico"

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
  | { type: "notice"; text: string; codigo?: ErroCodigo }
  // card de entidade/busca/insight, emitido automaticamente após uma tool de leitura (Fase 3).
  | { type: "card"; card: CardPayload }
  // pausa do turno esperando o usuário escolher/responder (tool perguntar_usuario, Fase 6).
  | {
      type: "choice"
      acaoId: number
      pergunta: string
      opcoes: string[]
      multipla?: boolean
      permitirOutro?: boolean
      status: "pendente" | "respondida" | "expirada"
      resposta?: { selecionadas: string[]; outro?: string }
    }

/** Uma linha do cartão de confirmação, já formatada para humanos. */
export interface ConfirmDetalhe {
  label: string
  valor: string
  /** Valor anterior (edições) — habilita o diff riscado→novo do MutationCard (Fase 3). */
  valorAntigo?: string
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
  | { type: "card"; card: CardPayload }
  | { type: "choice"; acaoId: number; pergunta: string; opcoes: string[]; multipla?: boolean; permitirOutro?: boolean }
  // resposta cortada por limite de tamanho (stop_reason max_tokens) — o cliente oferece "Continuar" (Fase 4).
  | { type: "cut" }
  // delta do raciocínio (extended thinking) — acumulado p/ o "Pensou por Xs" (Fase 6).
  | { type: "thinking"; delta: string }
  // chips de próxima ação extraídos do sentinela <sugestoes> ao fim do turno (Fase 6).
  | { type: "followups"; itens: string[] }
  | {
      type: "done"
      mensagemId?: number
      model: string
      inputTokens: number
      outputTokens: number
      pendente?: number
      /** Fontes citáveis acumuladas no turno (Fase 6). */
      fontes?: Fonte[]
    }
  | { type: "error"; mensagem: string; codigo?: ErroCodigo }

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
  feedback?: "up" | "down" | null
  meta?: MsgMeta | null
}

export interface LexiaConversaRow {
  id: number
  titulo: string | null
  criadaEm: string // ISO
  atualizadaEm: string // ISO
  numMensagens: number
  fixada: boolean
  /** Última entidade @-mencionada (chip de contexto no histórico). */
  contexto?: { tipo: string; id: number; nome: string; rota: string } | null
}

export interface LexiaConversaDetail extends LexiaConversaRow {
  mensagens: LexiaMensagemRow[]
}

/** POST /api/lexia/chat response: the persisted user turn + assistant reply. */
export interface LexiaChatResult {
  conversaId: number
  mensagens: LexiaMensagemRow[] // [userMsg, assistantMsg]
}
