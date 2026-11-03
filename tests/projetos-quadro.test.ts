// O "projeto" do quadro de Tarefas (src/lib/tarefas/projetos-quadro.ts): caso do
// cliente OU projeto interno — chave, etiqueta/cor, acesso, busca sem acento e a
// aba Projetos (andamento, filtros, ordem).
import { describe, expect, it } from "vitest"
import {
  apresentarCaso,
  apresentarInterno,
  buscarProjetos,
  casaPrazoFinal,
  chaveCaso,
  chaveInterno,
  estatisticasProjetos,
  FILTRO_PROJETOS_PADRAO,
  filtrarProjetos,
  lerChave,
  ordenarListaProjetos,
  ordenarProjetos,
  podeAbrirProjeto,
  projetosComTarefas,
  projetosVinculaveis,
  subtituloProjeto,
  ESTAT_VAZIA,
} from "@/lib/tarefas/projetos-quadro"
import { CORES_PROJETO, type ChaveProjeto, type ProjetoQuadro, type TaskRow } from "@/lib/tarefas/types"

const caso = (id: number, p: Partial<ProjetoQuadro> = {}): ProjetoQuadro => ({
  chave: chaveCaso(id),
  tipo: "caso",
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
const interno = (id: number, p: Partial<ProjetoQuadro> = {}): ProjetoQuadro => caso(id, { chave: chaveInterno(id), tipo: "interno", ...p })

describe("chave do projeto", () => {
  it("c<id> = caso, p<id> = projeto interno", () => {
    expect(chaveCaso(12)).toBe("c12")
    expect(chaveInterno(5)).toBe("p5")
    expect(lerChave("c12")).toEqual({ tipo: "caso", id: 12 })
    expect(lerChave("p5")).toEqual({ tipo: "interno", id: 5 })
  })
  it("chave inválida → null", () => {
    for (const k of ["", "c", "c0", "x12", "12", "c-1", "c1.5", "p01", "c99999999999", null, 12]) expect(lerChave(k)).toBeNull()
  })
})

describe("etiqueta do projeto no quadro", () => {
  const corDaArea = (a: string | null) => (a === "soc" ? "#123456" : null)
  it("caso: usa nome curto e cor próprios", () => {
    expect(apresentarCaso({ id: 1, titulo: "Holding Silva", nomeCurto: "Silva", cor: "#9A2E5A", area: "soc" }, corDaArea)).toEqual({
      nomeCurto: "Silva",
      cor: "#9A2E5A",
    })
  })
  it("caso: sem nome curto cai para o título; sem cor, para a cor da área", () => {
    expect(apresentarCaso({ id: 1, titulo: "Holding Silva", nomeCurto: "  ", cor: null, area: "soc" }, corDaArea)).toEqual({
      nomeCurto: "Holding Silva",
      cor: "#123456",
    })
  })
  it("caso: sem cor nem área com cor → paleta pelo id; cor inválida é ignorada", () => {
    expect(apresentarCaso({ id: 7, titulo: "X", nomeCurto: null, cor: "vermelho", area: "trab" }, corDaArea).cor).toBe(CORES_PROJETO[7 % CORES_PROJETO.length])
  })
  it("interno: nome curto → nome; cor própria → paleta", () => {
    expect(apresentarInterno({ id: 3, nome: "Manutenção do Lexia", nomeCurto: "Lexia", cor: "#5A4F9A" })).toEqual({ nomeCurto: "Lexia", cor: "#5A4F9A" })
    expect(apresentarInterno({ id: 3, nome: "Manutenção do Lexia", nomeCurto: " ", cor: null })).toEqual({
      nomeCurto: "Manutenção do Lexia",
      cor: CORES_PROJETO[3 % CORES_PROJETO.length],
    })
  })
  it("2ª linha: o cliente do caso ou 'Projeto interno'", () => {
    const nome = (id: number | null) => (id === 9 ? "Maria" : null)
    expect(subtituloProjeto(caso(1, { clienteId: 9 }), nome)).toBe("Maria")
    expect(subtituloProjeto(caso(1), nome)).toBe("Sem cliente")
    expect(subtituloProjeto(interno(2), nome)).toBe("Projeto interno")
  })
})

describe("acesso e vínculo", () => {
  it("caso: null = vê todos, lista = só esses; interno: sempre", () => {
    expect(podeAbrirProjeto(null, caso(3))).toBe(true)
    expect(podeAbrirProjeto([1, 2], caso(3))).toBe(false)
    expect(podeAbrirProjeto([1, 3], caso(3))).toBe(true)
    expect(podeAbrirProjeto([], interno(3))).toBe(true)
    expect(podeAbrirProjeto(null, null)).toBe(false)
  })
  it("vinculáveis = não arquivados e acessíveis", () => {
    const lista = [caso(1), caso(2, { arquivado: true }), caso(3), interno(4), interno(5, { arquivado: true })]
    expect(projetosVinculaveis(lista, null).map((p) => p.chave)).toEqual(["c1", "c3", "p4"])
    expect(projetosVinculaveis(lista, [2, 3]).map((p) => p.chave)).toEqual(["c3", "p4"])
  })
  it("projetos com tarefas (caso 1 ≠ interno 1)", () => {
    const tarefas: { projeto: ChaveProjeto | null }[] = [{ projeto: "c3" }, { projeto: null }, { projeto: "p1" }]
    expect(projetosComTarefas([caso(1), caso(3), interno(1)], tarefas).map((p) => p.chave)).toEqual(["c3", "p1"])
  })
})

describe("ordem e busca", () => {
  const lista = [
    caso(1, { nomeCurto: "Ômega", nome: "Inventário Ômega", clienteId: 10 }),
    caso(2, { nomeCurto: "Alfa", nome: "Holding Alfa", clienteId: 11 }),
    interno(3, { nomeCurto: "Beta", nome: "Manutenção do Lexia" }),
  ]
  const cliente = (id: number | null) => ({ 10: "José Conceição", 11: "Maria" })[id ?? 0] ?? null
  it("ordena pela etiqueta em português", () => {
    expect(ordenarProjetos(lista).map((p) => p.nomeCurto)).toEqual(["Alfa", "Beta", "Ômega"])
  })
  it("busca sem acento por etiqueta, título e cliente", () => {
    expect(buscarProjetos(lista, "omega", cliente).map((p) => p.chave)).toEqual(["c1"])
    expect(buscarProjetos(lista, "manutencao", cliente).map((p) => p.chave)).toEqual(["p3"])
    expect(buscarProjetos(lista, "conceicao", cliente).map((p) => p.chave)).toEqual(["c1"])
    expect(buscarProjetos(lista, "", cliente).map((p) => p.chave)).toEqual(["c2", "p3", "c1"])
  })
  it("respeita o limite", () => {
    const muitos = Array.from({ length: 100 }, (_, i) => caso(i + 1))
    expect(buscarProjetos(muitos, "", () => null)).toHaveLength(60)
    expect(buscarProjetos(muitos, "caso", () => null, 10)).toHaveLength(10)
  })
})

describe("aba Projetos", () => {
  const HOJE = "2026-10-08" // quinta
  const t = (projeto: ChaveProjeto | null, status: TaskRow["status"], prazo: string): Pick<TaskRow, "projeto" | "status" | "prazo"> => ({ projeto, status, prazo })
  const tarefas = [
    t("c1", "done", "2026-10-01"),
    t("c1", "todo", "2026-10-05"), // vencida
    t("c1", "doing", "2026-10-20"),
    t("p2", "todo", "2026-10-10"),
    t(null, "todo", "2026-10-01"),
  ]
  const est = estatisticasProjetos(tarefas, HOJE)
  const estDe = (k: ChaveProjeto) => est.get(k) ?? ESTAT_VAZIA

  it("andamento por projeto (concluída não conta como vencida)", () => {
    expect(estDe("c1")).toEqual({ total: 3, feitas: 1, abertas: 2, vencidas: 1 })
    expect(estDe("p2")).toEqual({ total: 1, feitas: 0, abertas: 1, vencidas: 0 })
    expect(estDe("c9")).toEqual(ESTAT_VAZIA)
  })

  it("prazo final: vencido · até domingo · até o fim do mês · sem prazo", () => {
    expect(casaPrazoFinal("2026-10-07", "vencido", HOJE)).toBe(true)
    expect(casaPrazoFinal("2026-10-08", "vencido", HOJE)).toBe(false)
    expect(casaPrazoFinal("2026-10-11", "semana", HOJE)).toBe(true) // domingo
    expect(casaPrazoFinal("2026-10-12", "semana", HOJE)).toBe(false)
    expect(casaPrazoFinal("2026-10-31", "mes", HOJE)).toBe(true)
    expect(casaPrazoFinal("2026-11-01", "mes", HOJE)).toBe(false)
    expect(casaPrazoFinal("2026-10-07", "mes", HOJE)).toBe(false) // vencido não é "deste mês"
    expect(casaPrazoFinal(null, "sem", HOJE)).toBe(true)
    expect(casaPrazoFinal(null, "semana", HOJE)).toBe(false)
  })

  const lista = [
    caso(1, { nomeCurto: "Alfa", clienteId: 10, responsavelId: 1, prazo: "2026-10-30" }),
    interno(2, { nomeCurto: "Lexia", nome: "Manutenção do Lexia", responsavelId: 2, prazo: "2026-10-10" }),
    caso(3, { nomeCurto: "Beta", arquivado: true }),
    caso(4, { nomeCurto: "Gama", clienteId: 11 }),
  ]
  const cliente = (id: number | null) => ({ 10: "José Conceição", 11: "Maria" })[id ?? 0] ?? null
  const f = (p: Partial<typeof FILTRO_PROJETOS_PADRAO>) =>
    filtrarProjetos(lista, { ...FILTRO_PROJETOS_PADRAO, ...p }, estDe, cliente, HOJE).map((x) => x.chave)

  it("filtra ativos/arquivados, tipo, responsável, andamento, prazo e texto", () => {
    expect(f({})).toEqual(["c1", "p2", "c4"])
    expect(f({ arquivados: true })).toEqual(["c3"])
    expect(f({ tipo: "interno" })).toEqual(["p2"])
    expect(f({ tipo: "caso" })).toEqual(["c1", "c4"])
    expect(f({ responsavel: 1 })).toEqual(["c1"])
    expect(f({ andamento: "vencidas" })).toEqual(["c1"])
    expect(f({ andamento: "sem" })).toEqual(["c4"])
    expect(f({ prazoFinal: "semana" })).toEqual(["p2"])
    expect(f({ texto: "conceicao" })).toEqual(["c1"])
    expect(f({ texto: "manutencao" })).toEqual(["p2"])
  })

  it("ordena por nome, prazo final, progresso e vencidas", () => {
    const ativos = lista.filter((p) => !p.arquivado)
    expect(ordenarListaProjetos(ativos, "nome", estDe).map((p) => p.chave)).toEqual(["c1", "c4", "p2"])
    expect(ordenarListaProjetos(ativos, "prazo", estDe).map((p) => p.chave)).toEqual(["p2", "c1", "c4"])
    // progresso: menos avançado primeiro (p2 0%, c1 33%); sem tarefas no fim
    expect(ordenarListaProjetos(ativos, "progresso", estDe).map((p) => p.chave)).toEqual(["p2", "c1", "c4"])
    expect(ordenarListaProjetos(ativos, "vencidas", estDe).map((p) => p.chave)).toEqual(["c1", "c4", "p2"])
  })
})
