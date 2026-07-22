// Converte anexos (imagens/PDF/planilha em base64) nos content-blocks da Messages
// API. SERVER ONLY. O loop e o snapshot de confirmação já trabalham com
// Anthropic.MessageParam[] de blocos, então basta montar a mensagem do usuário.
// É assíncrono porque o .xlsx é convertido em texto (exceljs) na hora de montar o
// bloco — vale tanto para o turno vivo quanto para a re-hidratação do histórico.
import type Anthropic from "@anthropic-ai/sdk"
import { ehPdf, ehTexto, ehXlsx } from "@/lib/lexia/anexos/validacao"
import { xlsxParaTexto } from "@/lib/lexia/anexos/xlsx"

interface AnexoComBytes {
  mimeType: string
  dataBase64: string
}

/** Um anexo → bloco text (.txt / planilha convertida), document (PDF) ou image (visão). */
export async function anexoParaBloco(mimeType: string, base64: string): Promise<Anthropic.ContentBlockParam> {
  if (ehTexto(mimeType)) {
    return { type: "text", text: Buffer.from(base64, "base64").toString("utf-8") }
  }
  if (ehXlsx(mimeType)) {
    // A Anthropic não lê .xlsx nativamente: convertemos em CSV/texto e enviamos
    // como bloco de TEXTO para o modelo analisar. Falha degrada sem quebrar o turno.
    try {
      const texto = await xlsxParaTexto(Buffer.from(base64, "base64"))
      return { type: "text", text: `Conteúdo da planilha anexada (formato CSV, uma seção por aba):\n\n${texto}` }
    } catch {
      return { type: "text", text: "[Não consegui ler a planilha anexada — confira se é um arquivo .xlsx válido e não está corrompido.]" }
    }
  }
  if (ehPdf(mimeType)) {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    }
  }
  // Only image MIMEs reach here: PDF/xlsx are handled above and .docx is intercepted +
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
export async function construirConteudo(
  texto: string,
  anexos?: AnexoComBytes[],
): Promise<string | Anthropic.ContentBlockParam[]> {
  if (!anexos || anexos.length === 0) return texto
  const blocos = await Promise.all(anexos.map((a) => anexoParaBloco(a.mimeType, a.dataBase64)))
  return [{ type: "text", text: texto }, ...blocos]
}
