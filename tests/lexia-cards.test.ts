import { describe, expect, it } from "vitest"
import { cardParaTool } from "@/lib/lexia/agent/cards"
import { hojeISO, addDiasISO } from "@/lib/processos/datas"

describe("cardParaTool — tools sem mapeamento e resultados inválidos", () => {
  it("tool desconhecida → null", () => {
    expect(cardParaTool("tool_qualquer", {}, { foo: "bar" })).toBeNull()
  })

  it("resultado null/undefined/primitivo → null (nunca derruba o turno)", () => {
    expect(cardParaTool("detalhe_cliente", {}, null)).toBeNull()
    expect(cardParaTool("detalhe_cliente", {}, undefined)).toBeNull()
    expect(cardParaTool("listar_clientes", {}, "string qualquer")).toBeNull()
  })

  it("uma exceção dentro do mapeamento vira null, não propaga", () => {
    // header ausente força um throw ao acessar .id — deve ser engolido
    expect(cardParaTool("detalhe_cliente", {}, {})).toBeNull()
  })
})

describe("cardParaTool — clientes", () => {
  it("detalhe_cliente monta o card de detalhe com status de cobrança", () => {
    const out = {
      header: { id: 42, nome: "Construtora Aurora", tipo: "pj", cidade: "Campinas", uf: "SP", emails: ["contato@aurora.com"], telefones: ["19999990000"] },
      resumo: { casosTotal: 3 },
      cobranca: { status: "pausado" },
    }
    const card = cardParaTool("detalhe_cliente", { id: 42 }, out)
    expect(card).toEqual({
      type: "entity",
      kind: "cliente",
      variant: "detail",
      rota: "/contatos/42",
      data: { id: 42, nome: "Construtora Aurora", tipo: "pj", status: "pausado", cidade: "Campinas", uf: "SP", numCasos: 3, telefone: "19999990000", email: "contato@aurora.com" },
    })
  })

  it("listar_clientes vira entity-list, capado em 6, com 'ver todos' quando truncado", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ id: i, nome: `Cliente ${i}`, tipo: "pf" }))
    const card = cardParaTool("listar_clientes", {}, rows) as Extract<ReturnType<typeof cardParaTool>, { type: "entity-list" }>
    expect(card?.type).toBe("entity-list")
    expect(card?.itens).toHaveLength(6)
    expect(card?.truncado).toBe(true)
    expect(card?.rota).toBe("/contatos")
  })

  it("lista com ≤6 itens não trunca (sem rota 'ver todos')", () => {
    const rows = [{ id: 1, nome: "Só um", tipo: "pf" }]
    const card = cardParaTool("listar_clientes", {}, rows) as Extract<ReturnType<typeof cardParaTool>, { type: "entity-list" }>
    expect(card?.truncado).toBe(false)
    expect(card?.rota).toBeUndefined()
  })

  it("lista vazia → null (nada a mostrar)", () => {
    expect(cardParaTool("listar_clientes", {}, [])).toBeNull()
  })
})

describe("cardParaTool — honorários (progresso de pagamento)", () => {
  it("à vista pago → 100% (via status, sem parcelas)", () => {
    const out = { id: 1, descricao: "Honorário Aurora", cliente: "Aurora", valorCents: 10_000, status: "recebido" }
    const card = cardParaTool("detalhe_honorario", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity" }>
    expect(card?.data).toMatchObject({ valorCents: 10_000, valorPagoCents: 10_000 })
  })

  it("à vista pendente → 0%", () => {
    const out = { id: 1, descricao: "Honorário Aurora", cliente: "Aurora", valorCents: 10_000, status: "lancado" }
    const card = cardParaTool("detalhe_honorario", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity" }>
    expect(card?.data).toMatchObject({ valorPagoCents: 0 })
  })

  it("parcelado soma só as parcelas realmente pagas", () => {
    const out = {
      id: 1,
      descricao: "Honorário parcelado",
      cliente: "Vargas",
      valorCents: 12_000,
      status: "lancado",
      parcelas: [
        { valorCents: 4_000, pago: true },
        { valorCents: 4_000, pago: true },
        { valorCents: 4_000, pago: false },
      ],
    }
    const card = cardParaTool("detalhe_honorario", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity" }>
    expect(card?.data).toMatchObject({ valorCents: 12_000, valorPagoCents: 8_000 })
  })
})

describe("cardParaTool — processo/caso (mesma família de card)", () => {
  it("detalhe_processo computa dias CORRIDOS até o próximo prazo fatal", () => {
    const alvo = addDiasISO(hojeISO(), 5)
    const out = { id: 9, numeroCnj: "5009876-45.2024.8.26.0100", classe: "Cível", status: "ativo", proximaDataFatal: alvo }
    const card = cardParaTool("detalhe_processo", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity" }>
    expect(card?.rota).toBe("/processos/9")
    expect((card?.data as { diasPrazo: number }).diasPrazo).toBe(5)
  })

  it("sem proximaDataFatal → diasPrazo null (Sem prazo, não um erro)", () => {
    const out = { id: 9, status: "ativo" }
    const card = cardParaTool("detalhe_processo", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity" }>
    expect((card?.data as { diasPrazo: number | null }).diasPrazo).toBeNull()
  })

  it("detalhe_caso usa 'titulo' (não numeroCnj) e rota para o cliente quando houver clienteId", () => {
    const out = { id: 3, titulo: "Revisão contratual", tipo: "consultivo", status: "ativo", clienteId: 42 }
    const card = cardParaTool("detalhe_caso", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity" }>
    expect(card?.rota).toBe("/contatos/42")
    expect(card?.data).toMatchObject({ titulo: "Revisão contratual", classe: "consultivo" })
  })

  it("detalhe_caso sem clienteId cai para a lista de casos", () => {
    const out = { id: 3, titulo: "Revisão contratual", status: "ativo" }
    const card = cardParaTool("detalhe_caso", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity" }>
    expect(card?.rota).toBe("/casos")
  })
})

describe("cardParaTool — listas aninhadas (itens sob uma chave)", () => {
  it("listar_processos lê de resultado.itens", () => {
    const out = { total: 2, itens: [{ id: 1, status: "ativo" }, { id: 2, status: "suspenso" }] }
    const card = cardParaTool("listar_processos", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity-list" }>
    expect(card?.itens).toHaveLength(2)
  })

  it("listar_honorarios lê de resultado.itens (ignora resultado.totais)", () => {
    const out = { totais: { recebidoCents: 100 }, itens: [{ id: 1, descricao: "A", valorCents: 100, status: "recebido" }] }
    const card = cardParaTool("listar_honorarios", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity-list" }>
    expect(card?.itens).toHaveLength(1)
  })

  it("listar_tarefas lê de resultado.tarefas (ignora resultado.socios)", () => {
    const out = { tarefas: [{ id: 1, titulo: "Fazer X", status: "todo" }], socios: [{ id: 1, nome: "A" }] }
    const card = cardParaTool("listar_tarefas", {}, out) as Extract<ReturnType<typeof cardParaTool>, { type: "entity-list" }>
    expect(card?.itens).toHaveLength(1)
  })
})

describe("cardParaTool — buscar (search card agrupado)", () => {
  it("agrupa só os tipos com resultado, ignora os vazios", () => {
    const out = { q: "aurora", clientes: [{ id: 1, nome: "Aurora", tipo: "pj" }], casos: [], processos: [], partes: [], contratos: [], tarefas: [], lancamentos: [] }
    const card = cardParaTool("buscar", { q: "aurora" }, out) as Extract<ReturnType<typeof cardParaTool>, { type: "search" }>
    expect(card?.type).toBe("search")
    expect(card?.query).toBe("aurora")
    expect(card?.grupos).toHaveLength(1)
    expect(card?.grupos[0].label).toBe("Clientes")
  })

  it("nenhum grupo com resultado → null", () => {
    const out = { q: "nada-encontrado", clientes: [], casos: [], processos: [], partes: [], contratos: [], tarefas: [], lancamentos: [] }
    expect(cardParaTool("buscar", { q: "nada-encontrado" }, out)).toBeNull()
  })
})

describe("cardParaTool — insight (financeiro_resumo)", () => {
  it("monta progress-compare recebido vs a-receber", () => {
    const out = { kpis: {}, mes: { recebidoCents: 200_000, aReceberCents: 50_000 } }
    const card = cardParaTool("financeiro_resumo", {}, out)
    expect(card).toEqual({
      type: "insight",
      titulo: "Financeiro do mês",
      icone: "wallet",
      series: { variant: "progress-compare", a: 200_000, b: 50_000, aLabel: "Recebido", bLabel: "A receber" },
    })
  })

  it("sem os campos de mês → null (não inventa dado)", () => {
    expect(cardParaTool("financeiro_resumo", {}, { kpis: {}, mes: {} })).toBeNull()
  })
})
