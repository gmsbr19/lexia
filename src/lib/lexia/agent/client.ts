// Anthropic SDK singleton. Throws the same friendly PT-BR error the popup
// already knows how to render when the server has no API key. SERVER ONLY.
import Anthropic from "@anthropic-ai/sdk"
import { UserError } from "@/lib/errors"
import type { ErroCodigo } from "../types"

export const LEXIA_NOT_CONNECTED = "A LexIA ainda não está conectada — configure ANTHROPIC_API_KEY no servidor"

let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new UserError(LEXIA_NOT_CONNECTED)
  if (!client) client = new Anthropic()
  return client
}

/**
 * Map any error from a turn to a safe PT-BR message + código estruturado
 * (Fase 4, D12) — o cliente deriva tom/ícone/título/ação do SysCard a partir
 * de `codigo`; `mensagem` é só o texto de apoio.
 */
export function mensagemErro(e: unknown): { mensagem: string; codigo: ErroCodigo } {
  if (e instanceof UserError) return { mensagem: e.message, codigo: "generico" }
  if (e instanceof Anthropic.AuthenticationError) return { mensagem: LEXIA_NOT_CONNECTED, codigo: "sem-chave" }
  if (e instanceof Anthropic.APIConnectionTimeoutError) {
    return { mensagem: "A resposta demorou mais que o normal e foi cancelada.", codigo: "timeout" }
  }
  if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError) {
    return { mensagem: "O modelo está indisponível no momento. Tente novamente em instantes.", codigo: "overloaded" }
  }
  return { mensagem: "Erro inesperado na LexIA", codigo: "generico" }
}
