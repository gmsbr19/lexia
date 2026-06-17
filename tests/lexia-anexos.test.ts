import { describe, expect, it } from "vitest"
import {
  MAX_ANEXOS,
  bytesDeBase64,
  mimePermitido,
  validarAnexo,
  validarAnexos,
} from "@/lib/lexia/anexos/validacao"
import { getAnexoStore } from "@/lib/lexia/anexos/storage"
import { anexoParaBloco, construirConteudo } from "@/lib/lexia/agent/anexos"
import { decidirModelo } from "@/lib/lexia/agent/router"

const B64_PEQ = "aGVsbG8=" // "hello"

describe("validação de anexos", () => {
  it("conta bytes decodificados a partir do base64", () => {
    expect(bytesDeBase64("")).toBe(0)
    expect(bytesDeBase64(B64_PEQ)).toBe(5) // "hello"
    expect(bytesDeBase64("YWJjZA==")).toBe(4) // "abcd"
  })

  it("aceita só os MIME types suportados", () => {
    expect(mimePermitido("image/png")).toBe(true)
    expect(mimePermitido("application/pdf")).toBe(true)
    expect(mimePermitido("image/svg+xml")).toBe(false)
    expect(mimePermitido("text/plain")).toBe(false)
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
  it("imagem vira bloco image; PDF vira bloco document", () => {
    const img = anexoParaBloco("image/jpeg", B64_PEQ)
    expect(img).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: B64_PEQ } })
    const pdf = anexoParaBloco("application/pdf", B64_PEQ)
    expect(pdf).toEqual({ type: "document", source: { type: "base64", media_type: "application/pdf", data: B64_PEQ } })
  })

  it("construirConteudo devolve string sem anexos e blocos com anexos", () => {
    expect(construirConteudo("oi")).toBe("oi")
    expect(construirConteudo("oi", [])).toBe("oi")
    const c = construirConteudo("veja", [{ mimeType: "image/png", dataBase64: B64_PEQ }])
    expect(Array.isArray(c)).toBe(true)
    expect((c as unknown[])[0]).toEqual({ type: "text", text: "veja" })
    expect((c as { type: string }[])[1].type).toBe("image")
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

  it("anexo + redação real → Opus", () => {
    const d = decidirModelo("com base neste anexo, redija um parecer", null, { temAnexos: true })
    expect(d.model).toBe("claude-opus-4-8")
  })
})
