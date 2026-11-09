import { describe, expect, it } from "vitest"
import { decidirUsuarioMcp, emailDoUsuarioMcp } from "@/lib/mcp/boot-core"

describe("decidirUsuarioMcp", () => {
  it("não faz nada quando o MCP está desligado (sem LEXIA_MCP_TOKEN)", () => {
    expect(decidirUsuarioMcp({ tokenDefinido: false, existente: null })).toBe("desligado")
    expect(decidirUsuarioMcp({ tokenDefinido: false, existente: { ativo: true } })).toBe("desligado")
  })

  it("cria quando o usuário ainda não existe", () => {
    expect(decidirUsuarioMcp({ tokenDefinido: true, existente: null })).toBe("criar")
  })

  it("NÃO cria de novo quando o usuário já existe — nenhum boot duplica", () => {
    expect(decidirUsuarioMcp({ tokenDefinido: true, existente: { ativo: true } })).toBe("ja-existe")
  })

  it("preserva um usuário DESATIVADO em vez de ressuscitá-lo (desativar é revogar)", () => {
    const d = decidirUsuarioMcp({ tokenDefinido: true, existente: { ativo: false } })
    expect(d).toBe("desativado-preservado")
    expect(d).not.toBe("criar")
  })
})

describe("emailDoUsuarioMcp", () => {
  it("cai no padrão quando a var não está definida", () => {
    expect(emailDoUsuarioMcp(undefined)).toBe("mcp@lexia.local")
    expect(emailDoUsuarioMcp("")).toBe("mcp@lexia.local")
  })

  it("normaliza espaços e caixa, para a chave única bater sempre", () => {
    expect(emailDoUsuarioMcp("  MCP@Lexia.Local  ")).toBe("mcp@lexia.local")
  })
})
