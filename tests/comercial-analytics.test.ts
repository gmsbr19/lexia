import { describe, expect, it } from "vitest"
import { desempenhoPorDono, forecastPonderado, relatorioAtividades } from "@/lib/comercial/analytics"

const nome = (id: number) => ({ 1: "Ana", 2: "Bruno" })[id] ?? `#${id}`

describe("desempenhoPorDono — performance por responsável", () => {
  it("agrega leads/abertos/conversões/valor/ticket e ordena por valor contratado", () => {
    const rows = desempenhoPorDono(
      [
        { responsavelUserId: 1, etapa: "ganho", valorContratadoCents: 300_00 },
        { responsavelUserId: 1, etapa: "ganho", valorContratadoCents: 100_00 },
        { responsavelUserId: 1, etapa: "proposta", valorContratadoCents: null },
        { responsavelUserId: 2, etapa: "ganho", valorContratadoCents: 500_00 },
        { responsavelUserId: 2, etapa: "perdido", valorContratadoCents: null },
        { responsavelUserId: null, etapa: "novo", valorContratadoCents: null },
      ],
      nome,
    )
    // Bruno (500) antes de Ana (400), "Sem responsável" por último (0)
    expect(rows.map((r) => r.nome)).toEqual(["Bruno", "Ana", "Sem responsável"])
    const ana = rows.find((r) => r.nome === "Ana")!
    expect(ana.leads).toBe(3)
    expect(ana.conversoes).toBe(2)
    expect(ana.abertos).toBe(1) // proposta é aberta
    expect(ana.valorContratadoCents).toBe(400_00)
    expect(ana.ticketMedioCents).toBe(200_00) // 400/2
    expect(Math.round(ana.taxaConversaoPct)).toBe(67) // 2/3
    const bruno = rows.find((r) => r.nome === "Bruno")!
    expect(bruno.abertos).toBe(0) // perdido NÃO é aberto
    expect(bruno.leads).toBe(2)
  })

  it("dono nulo vira 'Sem responsável'", () => {
    const rows = desempenhoPorDono([{ responsavelUserId: null, etapa: "novo", valorContratadoCents: null }], nome)
    expect(rows[0].nome).toBe("Sem responsável")
    expect(rows[0].userId).toBeNull()
  })
})

describe("forecastPonderado — valor estimado × probabilidade por etapa", () => {
  const stages = [
    { key: "novo", nome: "Novo", probabilidade: 10 },
    { key: "proposta", nome: "Proposta", probabilidade: 50 },
  ]
  it("pondera só os leads abertos, exclui ganho/perdido e soma os totais", () => {
    const f = forecastPonderado(
      [
        { etapa: "novo", valorEstimadoCents: 1000_00 }, // 10% → 100
        { etapa: "proposta", valorEstimadoCents: 2000_00 }, // 50% → 1000
        { etapa: "ganho", valorEstimadoCents: 9999_00 }, // liquidado → fora
        { etapa: "perdido", valorEstimadoCents: 9999_00 }, // liquidado → fora
      ],
      stages,
    )
    expect(f.totalLeads).toBe(2)
    expect(f.totalBrutoCents).toBe(3000_00)
    expect(f.totalPonderadoCents).toBe(1100_00) // 100 + 1000
    const prop = f.etapas.find((e) => e.key === "proposta")!
    expect(prop.valorPonderadoCents).toBe(1000_00)
    expect(prop.probabilidadePct).toBe(50)
  })

  it("etapa aberta fora da config vira 'Outras etapas' com probabilidade 0", () => {
    const f = forecastPonderado([{ etapa: "negociacao", valorEstimadoCents: 5000_00 }], stages)
    const outras = f.etapas.find((e) => e.key === "negociacao")!
    expect(outras.nome).toBe("Outras etapas")
    expect(outras.probabilidadePct).toBe(0)
    expect(outras.valorPonderadoCents).toBe(0)
    expect(f.totalPonderadoCents).toBe(0)
  })

  it("etapas sem leads não aparecem", () => {
    const f = forecastPonderado([{ etapa: "novo", valorEstimadoCents: 100_00 }], stages)
    expect(f.etapas.map((e) => e.key)).toEqual(["novo"])
  })
})

describe("relatorioAtividades — contagem por tipo e por autor", () => {
  it("conta por tipo (só os presentes) e por autor (ordem desc)", () => {
    const r = relatorioAtividades(
      [
        { tipo: "ligacao", autorId: 1 },
        { tipo: "ligacao", autorId: 2 },
        { tipo: "reuniao", autorId: 2 },
        { tipo: "whatsapp", autorId: null },
      ],
      nome,
    )
    expect(r.total).toBe(4)
    // só tipos presentes, na ordem canônica (ligacao, reuniao, whatsapp)
    expect(r.porTipo.map((t) => t.tipo)).toEqual(["ligacao", "reuniao", "whatsapp"])
    expect(r.porTipo.find((t) => t.tipo === "ligacao")!.count).toBe(2)
    // por autor: Bruno (2) antes de Ana (1) e "Sem autor" (1)
    expect(r.porDono[0].nome).toBe("Bruno")
    expect(r.porDono[0].count).toBe(2)
    expect(r.porDono.some((d) => d.nome === "Sem autor")).toBe(true)
  })

  it("lista vazia → total 0 e sem linhas", () => {
    const r = relatorioAtividades([], nome)
    expect(r.total).toBe(0)
    expect(r.porTipo).toEqual([])
    expect(r.porDono).toEqual([])
  })
})
