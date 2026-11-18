import { describe, expect, it } from "vitest"
import { clientesComCasoAtivo, sugereMonitorar } from "@/lib/whatsapp/core"

const chat = (over: Partial<{ grupo: boolean; monitorar: boolean; clienteId: number | null }> = {}) => ({
  grupo: false,
  monitorar: false,
  clienteId: 7,
  ...over,
})

describe("clientesComCasoAtivo", () => {
  it("aceita as grafias livres que o Astrea deixou, e o status vazio", () => {
    // O status é texto livre (o modal antigo gravava minúsculo) e a regra do
    // app é que vazio/desconhecido conta como ativo — por isso a decisão passa
    // pelo casoStatusBucket e não por um `status = 'Ativo'` no SQL.
    const ativos = clientesComCasoAtivo([
      { clientePrincipalId: 1, status: "Ativo" },
      { clientePrincipalId: 2, status: "ativo" },
      { clientePrincipalId: 3, status: null },
      { clientePrincipalId: 4, status: "  " },
    ])
    expect([...ativos].sort()).toEqual([1, 2, 3, 4])
  })

  it("deixa de fora arquivado, encerrado e suspenso", () => {
    const ativos = clientesComCasoAtivo([
      { clientePrincipalId: 10, status: "Arquivado" },
      { clientePrincipalId: 11, status: "Encerrado" },
      { clientePrincipalId: 12, status: "arquivado / encerrado" },
      { clientePrincipalId: 13, status: "Suspenso" },
      { clientePrincipalId: 14, status: "Baixado" },
    ])
    expect(ativos.size).toBe(0)
  })

  it("um caso ativo basta, mesmo com outros arquivados", () => {
    const ativos = clientesComCasoAtivo([
      { clientePrincipalId: 5, status: "Arquivado" },
      { clientePrincipalId: 5, status: "Ativo" },
    ])
    expect(ativos.has(5)).toBe(true)
  })

  it("ignora caso sem cliente", () => {
    expect(clientesComCasoAtivo([{ clientePrincipalId: null, status: "Ativo" }]).size).toBe(0)
  })
})

describe("sugereMonitorar", () => {
  const ativos = new Set([7])

  it("sugere a conversa de contato com caso ativo que ainda não grava", () => {
    expect(sugereMonitorar(chat(), ativos)).toBe(true)
  })

  it("não sugere o que já está gravando", () => {
    expect(sugereMonitorar(chat({ monitorar: true }), ativos)).toBe(false)
  })

  it("não sugere grupo", () => {
    // Grupo nasce desligado de propósito e não é a conversa de um cliente.
    expect(sugereMonitorar(chat({ grupo: true }), ativos)).toBe(false)
  })

  it("não sugere conversa sem contato vinculado", () => {
    expect(sugereMonitorar(chat({ clienteId: null }), ativos)).toBe(false)
  })

  it("não sugere contato cujo caso não está ativo", () => {
    expect(sugereMonitorar(chat({ clienteId: 99 }), ativos)).toBe(false)
  })

  it("sem nenhum caso ativo, nada é sugerido", () => {
    expect(sugereMonitorar(chat(), new Set())).toBe(false)
  })
})
