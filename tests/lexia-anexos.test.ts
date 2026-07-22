import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"
import {
  MAX_ANEXOS,
  MIME_XLSX,
  bytesDeBase64,
  ehXlsx,
  mimePermitido,
  validarAnexo,
  validarAnexos,
} from "@/lib/lexia/anexos/validacao"
import { getAnexoStore } from "@/lib/lexia/anexos/storage"
import { anexoParaBloco, construirConteudo } from "@/lib/lexia/agent/anexos"
import { xlsxParaTexto } from "@/lib/lexia/anexos/xlsx"
import { decidirModelo } from "@/lib/lexia/agent/router"

const B64_PEQ = "aGVsbG8=" // "hello"

/** Gera um .xlsx de verdade (2 linhas) em base64 para os testes de conversão. */
async function xlsxBase64(): Promise<string> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Honorários")
  ws.addRow(["Cliente", "Valor"])
  ws.addRow(["João, Silva", 1500])
  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf).toString("base64")
}

describe("validação de anexos", () => {
  it("conta bytes decodificados a partir do base64", () => {
    expect(bytesDeBase64("")).toBe(0)
    expect(bytesDeBase64(B64_PEQ)).toBe(5) // "hello"
    expect(bytesDeBase64("YWJjZA==")).toBe(4) // "abcd"
  })

  it("aceita só os MIME types suportados (text/plain desde a Fase 7; .xlsx analisado como texto)", () => {
    expect(mimePermitido("image/png")).toBe(true)
    expect(mimePermitido("application/pdf")).toBe(true)
    expect(mimePermitido("text/plain")).toBe(true)
    expect(mimePermitido(MIME_XLSX)).toBe(true)
    expect(ehXlsx(MIME_XLSX)).toBe(true)
    expect(ehXlsx("application/pdf")).toBe(false)
    expect(mimePermitido("image/svg+xml")).toBe(false)
  })

  it("rejeita formato não suportado e arquivo vazio", () => {
    expect(validarAnexo({ nome: "a.png", mimeType: "image/png", dataBase64: B64_PEQ })).toBeNull()
    expect(validarAnexo({ nome: "a.svg", mimeType: "image/svg+xml", dataBase64: B64_PEQ })).toMatch(/formato/i)
    expect(validarAnexo({ nome: "vazio.png", mimeType: "image/png", dataBase64: "" })).toMatch(/vazio/i)
  })

  it("rejeita arquivo grande demais", () => {
    const grande = "A".repeat(14_000_000) // ~10,5 MB decodificados (> 10 MB)
    expect(validarAnexo({ nome: "big.pdf", mimeType: "application/pdf", dataBase64: grande })).toMatch(/grande demais/i)
  })

  it("rejeita quando passa do limite de anexos", () => {
    const um = { nome: "a.png", mimeType: "image/png", dataBase64: B64_PEQ }
    expect(validarAnexos(Array.from({ length: MAX_ANEXOS }, () => um))).toBeNull()
    expect(validarAnexos(Array.from({ length: MAX_ANEXOS + 1 }, () => um))).toMatch(/no máximo/i)
  })
})

describe("blocos para a Messages API", () => {
  it("imagem vira bloco image; PDF vira bloco document; text/plain vira bloco text decodificado (Fase 7)", async () => {
    const img = await anexoParaBloco("image/jpeg", B64_PEQ)
    expect(img).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: B64_PEQ } })
    const pdf = await anexoParaBloco("application/pdf", B64_PEQ)
    expect(pdf).toEqual({ type: "document", source: { type: "base64", media_type: "application/pdf", data: B64_PEQ } })
    const txt = await anexoParaBloco("text/plain", B64_PEQ)
    expect(txt).toEqual({ type: "text", text: "hello" })
  })

  it(".xlsx vira bloco de TEXTO com o CSV da planilha (não vai como imagem/document)", async () => {
    const bloco = await anexoParaBloco(MIME_XLSX, await xlsxBase64())
    expect(bloco.type).toBe("text")
    const texto = (bloco as { type: "text"; text: string }).text
    expect(texto).toContain("Planilha: Honorários")
    expect(texto).toContain("Cliente,Valor")
    expect(texto).toContain('"João, Silva",1500') // vírgula na célula → aspas de CSV
  })

  it(".xlsx corrompido degrada com aviso, sem lançar", async () => {
    const bloco = await anexoParaBloco(MIME_XLSX, Buffer.from("não é um xlsx").toString("base64"))
    expect(bloco.type).toBe("text")
    expect((bloco as { text: string }).text).toMatch(/não consegui ler a planilha/i)
  })

  it("construirConteudo devolve string sem anexos e blocos com anexos", async () => {
    expect(await construirConteudo("oi")).toBe("oi")
    expect(await construirConteudo("oi", [])).toBe("oi")
    const c = await construirConteudo("veja", [{ mimeType: "image/png", dataBase64: B64_PEQ }])
    expect(Array.isArray(c)).toBe(true)
    expect((c as unknown[])[0]).toEqual({ type: "text", text: "veja" })
    expect((c as { type: string }[])[1].type).toBe("image")
  })
})

describe("conversão de planilha (xlsxParaTexto)", () => {
  it("converte cada aba em CSV com cabeçalho de planilha", async () => {
    const texto = await xlsxParaTexto(Buffer.from(await xlsxBase64(), "base64"))
    expect(texto).toContain("### Planilha: Honorários")
    expect(texto).toContain("Cliente,Valor")
    expect(texto).toContain('"João, Silva",1500')
  })
})

describe("dbStore (storage de anexos)", () => {
  it("salva inline e recupera o mesmo base64", async () => {
    const store = getAnexoStore() // default = "db"
    const guardado = await store.salvar({ nome: "a.png", mimeType: "image/png", dataBase64: B64_PEQ })
    expect(guardado).toEqual({ storage: "db", data: B64_PEQ, ref: null })
    expect(await store.carregar(guardado)).toBe(B64_PEQ)
  })
})

describe("roteamento com anexos", () => {
  it("anexo + mensagem curta → Sonnet com ferramentas (nunca Haiku)", () => {
    const d = decidirModelo("o que é isto?", null, { temAnexos: true })
    expect(d.model).toBe("claude-sonnet-4-6")
    expect(d.useTools).toBe(true)
  })

  it("anexo ignora o atalho de saudação (precisa de visão + tools)", () => {
    const d = decidirModelo("oi", null, { temAnexos: true })
    expect(d.model).toBe("claude-sonnet-4-6")
    expect(d.useTools).toBe(true)
  })

  it("anexo + extração/análise → Sonnet (econômico; extrair dados é o caso comum)", () => {
    const d = decidirModelo("analise este contrato e extraia as cláusulas", null, { temAnexos: true })
    expect(d.model).toBe("claude-sonnet-4-6")
  })

  it("anexo + redação real → Sonnet (Opus virou opt-in)", () => {
    const d = decidirModelo("com base neste anexo, redija um parecer", null, { temAnexos: true })
    expect(d.model).toBe("claude-sonnet-4-6")
  })

  it("anexo + forcarOpus → Opus", () => {
    const d = decidirModelo("com base neste anexo, redija um parecer", null, { temAnexos: true, forcarOpus: true })
    expect(d.model).toBe("claude-opus-4-8")
  })
})
