// Converte uma planilha .xlsx em TEXTO (CSV por aba) para a LexIA analisar.
// SERVER ONLY (usa exceljs). O modelo da Anthropic não lê .xlsx nativamente — como
// o .docx, o arquivo é convertido no servidor; mas, diferente do .docx (que é
// importado para o editor), o texto da planilha entra como um bloco de TEXTO na
// mensagem para o modelo ler/analisar (ver agent/anexos.ts + /api/lexia/chat).
import ExcelJS from "exceljs"

// Teto de caracteres do texto gerado — evita estourar o contexto/tokens com uma
// planilha enorme; o excedente é cortado com um aviso.
const MAX_CHARS = 40_000

/** Normaliza o valor de uma célula (fórmula, rich text, hyperlink, data) em string. */
function celulaParaTexto(v: unknown): string {
  if (v == null) return ""
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    if (o.result !== undefined) return celulaParaTexto(o.result) // fórmula → resultado
    if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((r) => r.text ?? "").join("")
    if (typeof o.text === "string") return o.text // hyperlink / texto formatado
    if (o.error) return String(o.error) // #DIV/0! etc.
    return JSON.stringify(v)
  }
  return String(v)
}

/** Escapa uma célula para CSV (aspas quando há vírgula, aspas ou quebra de linha). */
function celulaCsv(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Lê o buffer de um .xlsx e devolve um texto CSV por aba, com cabeçalho por
 * planilha. Trunca no teto de caracteres. Lança se o arquivo não for um .xlsx
 * válido (o chamador degrada com uma mensagem amigável).
 */
export async function xlsxParaTexto(buffer: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook()
  // Cast: exceljs declara `Buffer` (não-genérico) e o @types/node aqui é
  // `Buffer<ArrayBufferLike>` — compatíveis em runtime, só o tipo diverge.
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0])

  const partes: string[] = []
  let usados = 0
  let truncado = false

  wb.eachSheet((ws) => {
    if (truncado) return
    const linhas = [`### Planilha: ${ws.name} (${ws.actualRowCount} linhas × ${ws.actualColumnCount} colunas)`]
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (truncado) return
      const valores = (row.values as unknown[]).slice(1) // índice 0 é sempre vazio no exceljs
      const linha = valores.map((c) => celulaCsv(celulaParaTexto(c))).join(",")
      if (usados + linha.length > MAX_CHARS) {
        truncado = true
        return
      }
      linhas.push(linha)
      usados += linha.length + 1
    })
    partes.push(linhas.join("\n"))
  })

  let texto = partes.join("\n\n").trim()
  if (!texto) texto = "[Planilha vazia]"
  if (truncado) texto += "\n\n[Planilha truncada — grande demais para exibir por completo]"
  return texto
}
