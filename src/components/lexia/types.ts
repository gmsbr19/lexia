// Client-side render model for the LexIA chat kit. Mirrors the server UiBlock,
// but tool chips carry a transient "run" state (and an id) while streaming.
import type { AnexoMeta, ConfirmDetalhe, UiBlock } from "@/lib/lexia/types"

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
  | { type: "notice"; text: string }

// A persisted UiBlock is a valid ChatBlock (tool.status ok|erro ⊂ run|ok|erro).
export type ChatMsg =
  | { id: string; role: "user"; text: string; anexos?: ChatAnexo[] }
  | { id: string; role: "assistant"; blocks: ChatBlock[] }

/** Persisted blocks → render blocks (identity, but widens the tool status type). */
export function toChatBlocks(blocks: UiBlock[]): ChatBlock[] {
  return blocks as ChatBlock[]
}
