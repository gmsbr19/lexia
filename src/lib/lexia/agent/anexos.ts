// Converte anexos (imagens/PDF em base64) nos content-blocks da Messages API.
// SERVER ONLY. O loop e o snapshot de confirmação já trabalham com
// Anthropic.MessageParam[] de blocos, então basta montar a mensagem do usuário.
import type Anthropic from "@anthropic-ai/sdk"
import { ehPdf } from "@/lib/lexia/anexos/validacao"

interface AnexoComBytes {
  mimeType: string
  dataBase64: string
}

/** Um anexo → bloco image (visão) ou document (PDF). */
export function anexoParaBloco(mimeType: string, base64: string): Anthropic.ContentBlockParam {
  if (ehPdf(mimeType)) {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    }
  }
  // Only image MIMEs reach here: PDF is handled above and .docx is intercepted +
  // imported upstream (chat route), never sent to the model.
  return {
    type: "image",
    source: { type: "base64", media_type: mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: base64 },
  }
}

/**
 * Monta o conteúdo da mensagem do usuário. Sem anexos devolve a string original
 * (preserva o caminho atual e o cache); com anexos devolve [texto, ...blocos].
 */
export function construirConteudo(
  texto: string,
  anexos?: AnexoComBytes[],
): string | Anthropic.ContentBlockParam[] {
  if (!anexos || anexos.length === 0) return texto
  return [{ type: "text", text: texto }, ...anexos.map((a) => anexoParaBloco(a.mimeType, a.dataBase64))]
}
