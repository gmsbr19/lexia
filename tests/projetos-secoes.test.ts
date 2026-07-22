import { describe, expect, it } from "vitest"
import { montarFeriados } from "@/lib/processos/feriados"
import type { PrazoContexto } from "@/lib/processos/prazo"
import { instanciarTemplate, type TemplateItemInput } from "@/lib/projetos/template"
import { secaoCreateSchema, reordenarSecoesSchema, templateCreateSchema } from "@/lib/projetos/schemas"
import { tarefaCreateSchema } from "@/lib/tarefas/schemas"

const ctx: PrazoContexto = { feriados: montarFeriados([2025, 2026, 2027]) }

describe("instanciarTemplate — a seção (secaoOrdem) sobrevive ao cálculo de prazo", () => {
  it("cada item instanciado mantém seu secaoOrdem (inclusive null)", () => {
    const itens: TemplateItemInput[] = [
      { titulo: "A", offsetDias: 0, base: "inicio", ordem: 0, secaoOrdem: 0 },
      { titulo: "B", offsetDias: 1, base: "anterior", ordem: 1, secaoOrdem: 1 },
      { titulo: "C", offsetDias: 1, base: "anterior", ordem: 2, secaoOrdem: null },
    ]
    const r = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx })
    expect(r.map((x) => x.secaoOrdem)).toEqual([0, 1, null])
  })

  it("o mapeamento secaoOrdem→secaoId aponta cada tarefa para a seção real do projeto", () => {
    // Reproduz a lógica pura da instanciação (mutations.instanciarTemplateProjeto):
    // seções criadas na ordem → Map(ordem → id); item.secaoOrdem == null vira null.
    const itens: TemplateItemInput[] = [
      { titulo: "A", offsetDias: 0, base: "inicio", ordem: 0, secaoOrdem: 0 },
      { titulo: "B", offsetDias: 0, base: "inicio", ordem: 1, secaoOrdem: 1 },
      { titulo: "C", offsetDias: 0, base: "inicio", ordem: 2, secaoOrdem: null },
    ]
    const instanciados = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx })
    const secaoOrdemToId = new Map<number, number>([
      [0, 101],
      [1, 202],
    ])
    const secaoIds = instanciados.map((it) => (it.secaoOrdem != null ? secaoOrdemToId.get(it.secaoOrdem) ?? null : null))
    expect(secaoIds).toEqual([101, 202, null])
  })

  it("secaoOrdem apontando para uma seção inexistente cai em null (sem seção)", () => {
    const itens: TemplateItemInput[] = [{ titulo: "A", offsetDias: 0, base: "inicio", ordem: 0, secaoOrdem: 9 }]
    const [a] = instanciarTemplate(itens, { dataInicio: "2026-06-15", ctx })
    const map = new Map<number, number>([[0, 101]])
    expect(a.secaoOrdem != null ? map.get(a.secaoOrdem) ?? null : null).toBeNull()
  })
})

describe("schemas — os campos de seção sobrevivem ao parse (guard contra regressão)", () => {
  it("tarefaCreateSchema aceita secaoId", () => {
    const out = tarefaCreateSchema.parse({ titulo: "X", projetoId: 3, secaoId: 7 })
    expect(out.secaoId).toBe(7)
  })

  it("tarefaCreateSchema aceita secaoId nulo", () => {
    const out = tarefaCreateSchema.parse({ titulo: "X", secaoId: null })
    expect(out.secaoId).toBeNull()
  })

  it("secaoCreateSchema exige nome", () => {
    expect(secaoCreateSchema.safeParse({ nome: "Backlog", cor: "#123456" }).success).toBe(true)
    expect(secaoCreateSchema.safeParse({ nome: "" }).success).toBe(false)
  })

  it("reordenarSecoesSchema exige ao menos um id", () => {
    expect(reordenarSecoesSchema.safeParse({ ids: [3, 1, 2] }).success).toBe(true)
    expect(reordenarSecoesSchema.safeParse({ ids: [] }).success).toBe(false)
  })

  it("templateCreateSchema aceita seções e itens com secaoOrdem", () => {
    const out = templateCreateSchema.parse({
      nome: "Holding",
      secoes: [{ nome: "Preparação" }, { nome: "Execução", cor: "#1F3A6E" }],
      itens: [
        { titulo: "Levantar documentos", secaoOrdem: 0 },
        { titulo: "Protocolar", secaoOrdem: 1 },
        { titulo: "Solta", secaoOrdem: null },
      ],
    })
    expect(out.secoes?.length).toBe(2)
    expect(out.itens?.map((i) => i.secaoOrdem)).toEqual([0, 1, null])
  })
})
