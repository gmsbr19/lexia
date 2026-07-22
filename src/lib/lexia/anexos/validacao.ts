// Anexos da LexIA — regras de validação PURAS (isomórficas: client + server).
// Não importa nada server-only nem lança — devolve mensagem PT-BR ou null para
// o client usar na UX; o server transforma a mensagem em UserError (400).

/** MIME types aceitos no chat. Imagem/PDF a Anthropic lê nativamente (visão); o
 *  .docx NÃO é enviado ao modelo — o servidor o intercepta, converte com mammoth
 *  e importa direto para o editor (ver /api/lexia/chat). O .xlsx também não é lido
 *  nativamente — o servidor o converte em CSV/texto (exceljs) e injeta como bloco
 *  de TEXTO para o modelo ANALISAR (não importa para lugar nenhum). text/plain
 *  (Fase 7) vira um bloco de TEXTO puro — a oferta "colar longo → anexar .txt". */
export const MIME_PERMITIDOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const
export type AnexoMime = (typeof MIME_PERMITIDOS)[number]

/** O .docx do Word — interceptado e importado, não lido pelo modelo. */
export const MIME_DOCX: AnexoMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

/** O .xlsx do Excel — convertido em texto (CSV por aba) e enviado ao modelo para análise. */
export const MIME_XLSX: AnexoMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export const MAX_ANEXOS = 6
export const MAX_ANEXO_BYTES = 10 * 1024 * 1024 // 10 MB por arquivo (decodificado)
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024 // 25 MB no total (limite da API é 32 MB/request)

/** Extensões aceitas, para o atributo `accept` do <input type=file>. */
export const ACCEPT_ATTR =
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.txt,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"

/** Forma mínima de um anexo que carrega bytes (entrada do chat / storage). */
export interface AnexoEntrada {
  nome: string
  mimeType: string
  dataBase64: string
}

export function ehImagem(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}

export function ehPdf(mimeType: string): boolean {
  return mimeType === "application/pdf"
}

export function ehDocx(mimeType: string): boolean {
  return mimeType === MIME_DOCX
}

export function ehXlsx(mimeType: string): boolean {
  return mimeType === MIME_XLSX
}

/** .txt (Fase 7) — vira um bloco de TEXTO puro na mensagem (não é visão/documento). */
export function ehTexto(mimeType: string): boolean {
  return mimeType === "text/plain"
}

export function mimePermitido(mimeType: string): mimeType is AnexoMime {
  return (MIME_PERMITIDOS as readonly string[]).includes(mimeType)
}

/** Número de bytes decodificados de uma string base64 (sem prefixo data-URL). */
export function bytesDeBase64(b64: string): number {
  const limpo = b64.replace(/\s/g, "")
  if (!limpo) return 0
  const padding = limpo.endsWith("==") ? 2 : limpo.endsWith("=") ? 1 : 0
  return Math.floor((limpo.length * 3) / 4) - padding
}

/** Tamanho legível: "1,2 MB", "843 KB". */
export function rotuloTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
}

/** Valida UM anexo. Devolve mensagem de erro PT-BR ou null se ok. */
export function validarAnexo(a: { nome: string; mimeType: string; dataBase64: string }): string | null {
  if (!a.dataBase64) return `"${a.nome}" está vazio`
  if (!mimePermitido(a.mimeType)) {
    return `"${a.nome}" não é um formato suportado (use PNG, JPG, WEBP, GIF, PDF, DOCX, XLSX ou TXT)`
  }
  const bytes = bytesDeBase64(a.dataBase64)
  if (bytes > MAX_ANEXO_BYTES) {
    return `"${a.nome}" é grande demais (${rotuloTamanho(bytes)}; máx. ${rotuloTamanho(MAX_ANEXO_BYTES)})`
  }
  return null
}

/** Valida a LISTA de anexos (contagem + total + cada um). Devolve erro ou null. */
export function validarAnexos(anexos: { nome: string; mimeType: string; dataBase64: string }[]): string | null {
  if (anexos.length > MAX_ANEXOS) return `Anexe no máximo ${MAX_ANEXOS} arquivos por mensagem`
  let total = 0
  for (const a of anexos) {
    const erro = validarAnexo(a)
    if (erro) return erro
    total += bytesDeBase64(a.dataBase64)
  }
  if (total > MAX_TOTAL_BYTES) {
    return `Os anexos somam ${rotuloTamanho(total)} (máx. ${rotuloTamanho(MAX_TOTAL_BYTES)} por mensagem)`
  }
  return null
}
