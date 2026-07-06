// Client-side render model for the LexIA chat kit. Mirrors the server UiBlock,
// but tool chips carry a transient "run" state (and an id) while streaming.
import type { AnexoMeta, CardPayload, ConfirmDetalhe, ErroCodigo, MsgMeta, UiBlock } from "@/lib/lexia/types"
import type { DocOp } from "@/lib/documents/model/ops"
import type { CampoDetectado } from "@/lib/documents/model/campos"

// Anexo no balão do usuário. dataBase64 está presente só no turno recém-enviado
// (permite preview de imagem na hora); ao reabrir a conversa vem só o metadado.
export interface ChatAnexo extends AnexoMeta {
  dataBase64?: string
}

export type ChatBlock =
  | { type: "text"; text: string }
  | { type: "tool"; id?: string; name: string; label: string; status: "run" | "ok" | "erro" }
  | { type: "navigate"; rota: string }
  | { type: "link"; rota: string; label: string }
  | {
      type: "confirm"
      acaoId: number
      toolName: string
      resumo: string
      payload: unknown
      detalhes?: ConfirmDetalhe[]
      status: "pendente" | "confirmada" | "recusada" | "expirada"
    }
  | { type: "doc-patch"; ops: DocOp[]; campos?: CampoDetectado[] }
  | { type: "notice"; text: string; codigo?: ErroCodigo }
  | { type: "card"; card: CardPayload }
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

// A persisted UiBlock is a valid ChatBlock (tool.status ok|erro ⊂ run|ok|erro).
export type ChatMsg =
  | {
      id: string
      role: "user"
      text: string
      anexos?: ChatAnexo[]
      /** id no banco (LexiaMensagem) — chega no evento `start` (userMsgId). Habilita
       *  "Editar pergunta"/refazer (Fase 5), que precisam apontar a mensagem-âncora. */
      dbId?: number
    }
  | {
      id: string
      role: "assistant"
      blocks: ChatBlock[]
      /** id no banco (LexiaMensagem) — chega no evento `done`; ausente em turnos ainda incompletos. */
      dbId?: number
      /** modelo que respondeu (para o ModelSeal) — chega no evento `done`. */
      model?: string | null
      feedback?: "up" | "down" | null
      meta?: MsgMeta
    }

/** Seleção de texto no editor (posições ProseMirror) — base da edição cirúrgica. */
export interface DocSelecao {
  texto: string
  from: number
  to: number
}

/** Contexto do documento aberto, enviado por turno pelo painel embutido no editor. */
export interface DocumentoContexto {
  id: number | null
  texto: string
  campos: { name: string; label: string }[]
  valores?: Record<string, string>
  selecao?: DocSelecao
}

/** Persisted blocks → render blocks (identity, but widens the tool status type). */
export function toChatBlocks(blocks: UiBlock[]): ChatBlock[] {
  return blocks as ChatBlock[]
}
