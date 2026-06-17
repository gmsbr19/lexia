import { describe, expect, it } from "vitest"
import { estadoCobranca, rotuloEstadoCobranca, type AnotacaoRow } from "@/lib/clientes/cobranca-core"

const HOJE = "2026-06-14"
let seq = 0
function nota(p: Partial<AnotacaoRow> & { createdAt: string }): AnotacaoRow {
  return {
    id: ++seq,
    autor: "Thiago",
    conteudo: "",
    tipo: "nota",
    acao: null,
    ate: null,
    fixado: false,
    ...p,
  }
}

describe("estadoCobranca", () => {
  it("sem diretivas → ativo", () => {
    expect(estadoCobranca([], HOJE).status).toBe("ativo")
    expect(estadoCobranca([nota({ createdAt: "2026-01-01T00:00:00Z", conteudo: "ligou hoje" })], HOJE).status).toBe("ativo")
  })

  it("pausar com data futura → pausado (inclui o próprio dia)", () => {
    const e = estadoCobranca([nota({ createdAt: "2026-06-10T10:00:00Z", tipo: "cobranca", acao: "pausar", ate: "2026-07-10", conteudo: "começou a regularizar" })], HOJE)
    expect(e.status).toBe("pausado")
    expect(e.ate).toBe("2026-07-10")
    expect(e.motivo).toBe("começou a regularizar")
    expect(estadoCobranca([nota({ createdAt: "2026-06-10T10:00:00Z", tipo: "cobranca", acao: "pausar", ate: HOJE })], HOJE).status).toBe("pausado")
  })

  it("pausa expirada → volta a ativo", () => {
    expect(estadoCobranca([nota({ createdAt: "2026-05-01T10:00:00Z", tipo: "cobranca", acao: "pausar", ate: "2026-06-01" })], HOJE).status).toBe("ativo")
  })

  it("suspender → suspenso (indefinido)", () => {
    const e = estadoCobranca([nota({ createdAt: "2026-03-01T10:00:00Z", tipo: "cobranca", acao: "suspender", conteudo: "perda — não cobrar" })], HOJE)
    expect(e.status).toBe("suspenso")
    expect(e.ate).toBeNull()
    expect(e.motivo).toBe("perda — não cobrar")
  })

  it("a diretiva MAIS RECENTE vence (retomar depois de pausar → ativo)", () => {
    const notas = [
      nota({ createdAt: "2026-06-01T10:00:00Z", tipo: "cobranca", acao: "suspender", conteudo: "não cobrar" }),
      nota({ createdAt: "2026-06-12T10:00:00Z", tipo: "cobranca", acao: "retomar", conteudo: "voltar a cobrar" }),
    ]
    expect(estadoCobranca(notas, HOJE).status).toBe("ativo")
  })

  it("notas livres não afetam o estado; só as diretivas contam", () => {
    const notas = [
      nota({ createdAt: "2026-06-13T10:00:00Z", conteudo: "cliente difícil" }),
      nota({ createdAt: "2026-06-02T10:00:00Z", tipo: "cobranca", acao: "pausar", ate: "2026-12-31" }),
    ]
    expect(estadoCobranca(notas, HOJE).status).toBe("pausado")
  })

  it("rótulos", () => {
    expect(rotuloEstadoCobranca({ status: "ativo", ate: null, motivo: null, desde: null })).toBe("Cobrança ativa")
    expect(rotuloEstadoCobranca({ status: "suspenso", ate: null, motivo: null, desde: null })).toBe("Não cobrar")
    expect(rotuloEstadoCobranca({ status: "pausado", ate: "2026-07-10", motivo: null, desde: null })).toBe("Cobrança pausada até 10/07/2026")
  })
})
