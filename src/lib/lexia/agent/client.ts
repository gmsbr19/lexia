// Anthropic SDK singleton. Throws the same friendly PT-BR error the popup
// already knows how to render when the server has no API key. SERVER ONLY.
import Anthropic from "@anthropic-ai/sdk"
import { UserError } from "@/lib/errors"

export const LEXIA_NOT_CONNECTED = "A LexIA ainda não está conectada — configure ANTHROPIC_API_KEY no servidor"

let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new UserError(LEXIA_NOT_CONNECTED)
  if (!client) client = new Anthropic()
  return client
}

/** Map any error from a turn to a safe PT-BR message for the SSE `error` event. */
export function mensagemErro(e: unknown): string {
  if (e instanceof UserError) return e.message
  if (e instanceof Anthropic.AuthenticationError) return LEXIA_NOT_CONNECTED
  if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) {
    return "A LexIA está sobrecarregada no momento — tente novamente em instantes"
  }
  return "Erro inesperado na LexIA"
}
