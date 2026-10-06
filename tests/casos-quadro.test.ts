// O caso como "projeto" do quadro de Tarefas (src/lib/tarefas/casos-quadro.ts):
// etiqueta/cor com fallback, acesso, casos vinculáveis, busca sem acento.
import { describe, expect, it } from "vitest"
import { apresentarCaso, buscarCasos, casosComTarefas, casosVinculaveis, ordenarCasos, podeAbrirCaso } from "@/lib/tarefas/casos-quadro"
import { CORES_CASO, type CasoQuadro } from "@/lib/tarefas/types"

const caso = (id: number, p: Partial<CasoQuadro> = {}): CasoQuadro => ({
  id,
  nomeCurto: `Caso ${id}`,
  nome: `Caso número ${id}`,
  cor: "#2E7D6B",
  clienteId: null,
  area: null,
  responsavelId: null,
  prazo: null,
  descricao: null,
  arquivado: false,
  modeloOrigemId: null,
  ...p,
})

describe("etiqueta do caso no quadro", () => {
  const corDaArea = (a: string | null) => (a === "soc" ? "#123456" : null)
  it("usa nome curto e cor próprios", () => {
    expect(apresentarCaso({ id: 1, titulo: "Holding Silva", nomeCurto: "Silva", cor: "#9A2E5A", area: "soc" }, corDaArea)).toEqual({
      nomeCurto: "Silva",
      cor: "#9A2E5A",
    })
  })
  it("sem nome curto cai para o título; sem cor, para a cor da área", () => {
    expect(apresentarCaso({ id: 1, titulo: "Holding Silva", nomeCurto: "  ", cor: null, area: "soc" }, corDaArea)).toEqual({
      nomeCurto: "Holding Silva",
      cor: "#123456",
    })
  })
  it("sem cor nem área com cor: paleta do quadro pelo id; cor inválida é ignorada", () => {
    expect(apresentarCaso({ id: 7, titulo: "X", nomeCurto: null, cor: "vermelho", area: "trab" }, corDaArea).cor).toBe(CORES_CASO[7 % CORES_CASO.length])
  })
})

describe("acesso e vínculo", () => {
  it("null = vê todos; lista = só esses", () => {
    expect(podeAbrirCaso(null, 3)).toBe(true)
    expect(podeAbrirCaso([1, 2], 3)).toBe(false)
    expect(podeAbrirCaso([1, 3], 3)).toBe(true)
    expect(podeAbrirCaso(null, null)).toBe(false)
  })
  it("vinculáveis = não arquivados e acessíveis", () => {
    const lista = [caso(1), caso(2, { arquivado: true }), caso(3)]
    expect(casosVinculaveis(lista, null).map((c) => c.id)).toEqual([1, 3])
    expect(casosVinculaveis(lista, [2, 3]).map((c) => c.id)).toEqual([3])
  })
  it("casos com tarefas", () => {
    expect(casosComTarefas([caso(1), caso(2), caso(3)], [{ casoId: 3 }, { casoId: null }, { casoId: 1 }]).map((c) => c.id)).toEqual([1, 3])
  })
})

describe("ordem e busca", () => {
  const lista = [
    caso(1, { nomeCurto: "Ômega", nome: "Inventário Ômega", clienteId: 10 }),
    caso(2, { nomeCurto: "Alfa", nome: "Holding Alfa", clienteId: 11 }),
    caso(3, { nomeCurto: "Beta", nome: "Despejo Rua X", clienteId: 12 }),
  ]
  const cliente = (id: number | null) => ({ 10: "José Conceição", 11: "Maria", 12: "Condomínio Sol" })[id ?? 0] ?? null
  it("ordena pela etiqueta em português", () => {
    expect(ordenarCasos(lista).map((c) => c.nomeCurto)).toEqual(["Alfa", "Beta", "Ômega"])
  })
  it("busca sem acento por etiqueta, título e cliente", () => {
    expect(buscarCasos(lista, "omega", cliente).map((c) => c.id)).toEqual([1])
    expect(buscarCasos(lista, "despejo", cliente).map((c) => c.id)).toEqual([3])
    expect(buscarCasos(lista, "conceicao", cliente).map((c) => c.id)).toEqual([1])
    expect(buscarCasos(lista, "", cliente).map((c) => c.id)).toEqual([2, 3, 1])
  })
  it("respeita o limite", () => {
    const muitos = Array.from({ length: 100 }, (_, i) => caso(i + 1))
    expect(buscarCasos(muitos, "", () => null)).toHaveLength(60)
    expect(buscarCasos(muitos, "caso", () => null, 10)).toHaveLength(10)
  })
})
