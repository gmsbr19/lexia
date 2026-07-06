import { describe, expect, it } from "vitest"
import { dedupFontes, fontesParaTool } from "@/lib/lexia/agent/fontes"

describe("fontesParaTool — proveniência citável a partir do MESMO resultado de tool (Fase 6, D9)", () => {
  it("listar_publicacoes → uma fonte por publicação, rota do processo", () => {
    const out = { total: 2, itens: [{ id: 1, processoId: 10, diario: "DJe-SP", dataPublicacao: "2026-07-01" }] }
    const f = fontesParaTool("listar_publicacoes", out)
    expect(f).toEqual([{ tipo: "publicacao", titulo: "Publicação — DJe-SP", rota: "/processos/10", detalhe: "2026-07-01" }])
  })

  it("listar_publicacoes sem processoId → rota genérica /processos", () => {
    const out = { itens: [{ id: 2, processoId: null }] }
    expect(fontesParaTool("listar_publicacoes", out)[0].rota).toBe("/processos")
  })

  it("listar_movimentos_novos → titulo prioriza caso, depois numeroCnj, depois id", () => {
    const out = { itens: [{ processoId: 5, caso: "Aurora × Município", totalNovos: 3 }] }
    const f = fontesParaTool("listar_movimentos_novos", out)
    expect(f[0]).toEqual({ tipo: "andamento", titulo: "Aurora × Município", rota: "/processos/5", detalhe: "3 movimento(s) novo(s)" })
  })

  it("detalhe_processo → 1 fonte com o CNJ ou a classe", () => {
    expect(fontesParaTool("detalhe_processo", { id: 7, numeroCnj: "123-45.2026" })).toEqual([{ tipo: "andamento", titulo: "123-45.2026", rota: "/processos/7" }])
  })

  it("detalhe_honorario → tipo contrato, rota /financeiro", () => {
    expect(fontesParaTool("detalhe_honorario", { id: 9, descricao: "Honorários — Ação X" })).toEqual([{ tipo: "contrato", titulo: "Honorários — Ação X", rota: "/financeiro" }])
  })

  it("listar_lancamentos → uma fonte por lançamento, rota /financeiro", () => {
    const out = [{ id: 1, desc: "Recebimento Aurora" }, { id: 2, desc: "Recebimento Vargas" }]
    expect(fontesParaTool("listar_lancamentos", out)).toHaveLength(2)
  })

  it("tool sem mapeamento → array vazio", () => {
    expect(fontesParaTool("listar_clientes", { itens: [] })).toEqual([])
  })

  it("resultado malformado (null/tipo errado) nunca lança — devolve vazio", () => {
    expect(fontesParaTool("listar_publicacoes", null)).toEqual([])
    expect(fontesParaTool("detalhe_processo", "string inesperada")).toEqual([])
  })
})

describe("dedupFontes — sem repetir a mesma rota, cap defensivo", () => {
  it("mantém a PRIMEIRA ocorrência de cada rota", () => {
    const out = dedupFontes([
      { tipo: "andamento", titulo: "A", rota: "/processos/1" },
      { tipo: "andamento", titulo: "B (repetida)", rota: "/processos/1" },
      { tipo: "contrato", titulo: "C", rota: "/financeiro" },
    ])
    expect(out).toEqual([
      { tipo: "andamento", titulo: "A", rota: "/processos/1" },
      { tipo: "contrato", titulo: "C", rota: "/financeiro" },
    ])
  })

  it("cap de 5 fontes mesmo com rotas distintas", () => {
    const muitas = Array.from({ length: 8 }, (_, i) => ({ tipo: "andamento" as const, titulo: `P${i}`, rota: `/processos/${i}` }))
    expect(dedupFontes(muitas)).toHaveLength(5)
  })
})
