// Regras únicas do módulo Tarefas (src/lib/tarefas/regras.ts) + filtros, painel
// da Equipe e layout do Fluxo — sobre o cenário de exemplo do protótipo
// (hoje = quarta 23/09/2026; resumo esperado em Equipe: 2 vencidas · 1 hoje · 4 na semana).
import { describe, expect, it } from "vitest"
import { addDays } from "@/lib/datas/util"
import {
  aguardandoRotulo,
  cadeia,
  conflitosPrazo,
  criariaCiclo,
  deslocamentoCadeia,
  faixa,
  indexar,
  interpretarData,
  liberadasAoConcluir,
  mapaSeguintes,
  motivosRisco,
  prazoPadrao,
  precisaConfirmarInicio,
  precisaTextoAguardando,
  proximaSegunda,
  proximaSexta,
  resumo,
  rotuloPrazo,
  selo,
  statusAoDesligar,
  statusAoLigar,
  vencida,
  hojeSP,
  clienteEfetivo,
} from "@/lib/tarefas/regras"
import { FILTROS_PADRAO, noEscopo, ordenar, visiveis } from "@/lib/tarefas/filtros"
import { painelEquipe } from "@/lib/tarefas/equipe"
import { layoutFluxo, listaFluxo, profundidades } from "@/lib/tarefas/fluxo"
import type { ProjetoRow, TaskRow, TeamMember } from "@/lib/tarefas/types"

const HOJE = "2026-09-23" // quarta
const d = (n: number) => addDays(HOJE, n)

const TH = 1
const LE = 2
const ED = 3
const ALFA = 10
const BETA = 11
const GAMA = 12
const DELTA = 13
const OMEGA = 14
const G1 = "Protocolo 01 · 1º RI Taubaté"
const G2 = "Protocolo 02 · 1º RI Taubaté"
const G3 = "Protocolo 03 · 1º RI Taubaté"
const G4 = "Protocolo 04 · 1º RI Taubaté"

let seq = 100
function t(p: Partial<TaskRow> & { due: number; st: TaskRow["status"]; doneAt?: number }): TaskRow {
  const { due, st, doneAt, ...rest } = p
  return {
    id: seq++,
    titulo: "Tarefa",
    status: st,
    prazo: d(due),
    prazoFatal: false,
    projetoId: null,
    grupo: null,
    clienteId: null,
    responsavelId: null,
    aguardandoTexto: null,
    descricao: null,
    checklist: [],
    recur: null,
    anteriores: [],
    concluidaEm: st === "done" ? d(doneAt ?? due) : null,
    criadaEm: "2026-09-10T12:00:00.000Z",
    nComentarios: 0,
    nAnexos: 0,
    ...rest,
  }
}

// ── seed do protótipo (ids fixos) ──
const a1 = t({ id: 1, titulo: "Reunir documentação", projetoId: ALFA, grupo: G1, responsavelId: ED, due: -3, st: "done", doneAt: -4 })
const a2 = t({ id: 2, titulo: "Solicitar ITBI", projetoId: ALFA, grupo: G1, responsavelId: LE, due: 2, st: "doing", anteriores: [1] })
const a3 = t({ id: 3, titulo: "Protocolar remessa", projetoId: ALFA, grupo: G1, responsavelId: LE, due: 6, st: "wait", anteriores: [2] })
const a4 = t({ id: 4, titulo: "Reunir documentação", projetoId: ALFA, grupo: G2, responsavelId: ED, due: -5, st: "done", doneAt: -6 })
const a5 = t({ id: 5, titulo: "Emitir guia de ITBI", projetoId: ALFA, grupo: G2, responsavelId: LE, due: 5, st: "wait", aguardandoTexto: "Prefeitura — ITBI", anteriores: [4] })
const a6 = t({ id: 6, titulo: "Conferir certidões", projetoId: ALFA, grupo: G2, responsavelId: ED, due: -2, st: "todo", anteriores: [4] })
const a7 = t({ id: 7, titulo: "Protocolar remessa", projetoId: ALFA, grupo: G2, responsavelId: LE, due: 8, st: "wait", anteriores: [5, 6] })
const a8 = t({ id: 8, titulo: "Reunir documentação", projetoId: ALFA, grupo: G3, responsavelId: ED, due: 9, st: "todo" })
const a9 = t({ id: 9, titulo: "Solicitar ITBI", projetoId: ALFA, grupo: G3, responsavelId: LE, due: 14, st: "wait", anteriores: [8] })
const a10 = t({ id: 10, titulo: "Protocolar remessa", projetoId: ALFA, grupo: G3, responsavelId: null, due: 13, st: "wait", anteriores: [9] })
const a11 = t({ id: 11, titulo: "Reunir documentação", projetoId: ALFA, grupo: G4, responsavelId: ED, due: 12, st: "todo" })
const a12 = t({ id: 12, titulo: "Solicitar ITBI", projetoId: ALFA, grupo: G4, responsavelId: LE, due: 17, st: "wait", anteriores: [11] })
const a13 = t({ id: 13, titulo: "Protocolar remessa", projetoId: ALFA, grupo: G4, responsavelId: LE, due: 22, st: "wait", anteriores: [12, 10] })
const b1 = t({ id: 21, titulo: "Enviar minuta", projetoId: BETA, responsavelId: LE, due: -1, st: "todo" })
const b2 = t({ id: 22, titulo: "Calcular ITBI", projetoId: BETA, responsavelId: TH, due: 3, st: "todo" })
const b3 = t({ id: 23, titulo: "Colher assinaturas", projetoId: BETA, responsavelId: LE, due: 12, st: "wait", aguardandoTexto: "Cliente — assinaturas" })
const b4 = t({ id: 24, titulo: "Levantar matrículas", projetoId: BETA, responsavelId: ED, due: -3, st: "done", doneAt: -2 })
const g1 = t({ id: 31, titulo: "Revisar contrato social", projetoId: GAMA, responsavelId: TH, due: 0, st: "doing" })
const g2 = t({ id: 32, titulo: "Montar planilha", projetoId: GAMA, responsavelId: ED, due: 8, st: "todo" })
const g3 = t({ id: 33, titulo: "Reunião inicial", projetoId: GAMA, responsavelId: TH, due: -1, st: "done", doneAt: -1 })
const d1 = t({ id: 41, titulo: "Solicitar matrículas", projetoId: DELTA, responsavelId: ED, due: 1, st: "todo" })
const d2 = t({ id: 42, titulo: "Minuta de laudo", projetoId: DELTA, responsavelId: LE, due: 15, st: "doing" })
const d3 = t({ id: 43, titulo: "Aprovar laudo", projetoId: DELTA, responsavelId: TH, due: 20, st: "wait", anteriores: [42] })
const o1 = t({ id: 51, titulo: "Protocolar contestação", projetoId: OMEGA, responsavelId: LE, due: 2, prazoFatal: true, st: "doing" })
const o2 = t({ id: 52, titulo: "Conferir publicações", projetoId: OMEGA, responsavelId: ED, due: 7, st: "todo" })
const o3 = t({ id: 53, titulo: "Juntar procuração", projetoId: OMEGA, responsavelId: ED, due: -4, st: "done", doneAt: -3 })
const o4 = t({ id: 54, titulo: "Preparar audiência", projetoId: OMEGA, responsavelId: LE, due: 16, st: "todo" })
const o5 = t({ id: 55, titulo: "Cadastrar processo", projetoId: OMEGA, responsavelId: ED, due: -16, st: "done", doneAt: -15 })
const n1 = t({ id: 61, titulo: "Renovar certificado", responsavelId: TH, due: 11, st: "todo" })
const n2 = t({ id: 62, titulo: "Enviar proposta de honorários", clienteId: 7, responsavelId: TH, due: 9, st: "todo" })

const SEED = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, b1, b2, b3, b4, g1, g2, g3, d1, d2, d3, o1, o2, o3, o4, o5, n1, n2]
const MAP = indexar(SEED)
const NOMES: Record<number, string> = { [TH]: "Thiago", [LE]: "Leonardo", [ED]: "Eduarda" }
const nome = (id: number | null) => (id == null ? "sem responsável" : NOMES[id])

describe("datas e prazo padrão", () => {
  it("hojeSP usa o fuso do escritório", () => {
    expect(hojeSP(new Date("2026-09-24T02:30:00Z"))).toBe("2026-09-23") // 23h30 em SP
    expect(hojeSP(new Date("2026-09-24T03:30:00Z"))).toBe("2026-09-24")
  })
  it("prazo padrão = sexta da semana; sábado/domingo → sexta seguinte", () => {
    expect(prazoPadrao("2026-09-21")).toBe("2026-09-25") // segunda
    expect(prazoPadrao("2026-09-23")).toBe("2026-09-25") // quarta
    expect(prazoPadrao("2026-09-25")).toBe("2026-09-25") // sexta
    expect(prazoPadrao("2026-09-26")).toBe("2026-10-02") // sábado
    expect(prazoPadrao("2026-09-27")).toBe("2026-10-02") // domingo
  })
  it("atalhos: próxima sexta e próxima segunda nunca são hoje", () => {
    expect(proximaSexta("2026-09-25")).toBe("2026-10-02")
    expect(proximaSexta(HOJE)).toBe("2026-09-25")
    expect(proximaSegunda(HOJE)).toBe("2026-09-28")
  })
  it("rótulo do prazo", () => {
    expect(rotuloPrazo(HOJE, HOJE)).toBe("Hoje")
    expect(rotuloPrazo(d(1), HOJE)).toBe("Amanhã")
    expect(rotuloPrazo(d(-1), HOJE)).toBe("Ontem")
    expect(rotuloPrazo(d(2), HOJE)).toBe("Sexta")
    expect(rotuloPrazo(d(4), HOJE)).toBe("Domingo")
    expect(rotuloPrazo(d(5), HOJE)).toBe("28 set")
  })
  it("texto livre do seletor de data", () => {
    expect(interpretarData("hoje", HOJE)).toBe(HOJE)
    expect(interpretarData("amanhã", HOJE)).toBe(d(1))
    expect(interpretarData("depois de amanhã", HOJE)).toBe(d(2))
    expect(interpretarData("sex", HOJE)).toBe("2026-09-25")
    expect(interpretarData("quarta", HOJE)).toBe("2026-09-30") // nunca hoje
    expect(interpretarData("próxima semana", HOJE)).toBe("2026-09-28")
    expect(interpretarData("em 3 dias", HOJE)).toBe(d(3))
    expect(interpretarData("2 semanas", HOJE)).toBe(d(14))
    expect(interpretarData("dia 15", HOJE)).toBe("2026-10-15")
    expect(interpretarData("15/10", HOJE)).toBe("2026-10-15")
    expect(interpretarData("15/10/26", HOJE)).toBe("2026-10-15")
    expect(interpretarData("sem prazo", HOJE)).toBeNull()
    expect(interpretarData("xyz", HOJE)).toBeNull()
  })
})

describe("regra única de atraso e faixas", () => {
  it("vencida = prazo < hoje e não concluída", () => {
    expect(vencida(a6, HOJE)).toBe(true)
    expect(vencida(a1, HOJE)).toBe(false) // concluída
    expect(vencida(g1, HOJE)).toBe(false) // hoje
  })
  it("faixas: semana = amanhã até domingo", () => {
    expect(faixa(g1, HOJE)).toBe("today")
    expect(faixa(d1, HOJE)).toBe("week")
    expect(faixa(t({ due: 4, st: "todo" }), HOJE)).toBe("week") // domingo
    expect(faixa(t({ due: 5, st: "todo" }), HOJE)).toBe("later")
    expect(faixa({ prazo: "2026-09-28" }, "2026-09-27")).toBe("later") // domingo: a semana acabou
  })
  it("resumo do cenário do protótipo: 2 vencidas · 1 hoje · 4 na semana", () => {
    expect(resumo(SEED, HOJE)).toEqual({ vencidas: 2, hoje: 1, semana: 4 })
  })
})

describe("cadeia, risco, conflito, aguardando", () => {
  it("em risco quando uma anterior (mesmo transitiva) está vencida", () => {
    expect(motivosRisco(a7, MAP, HOJE).map((r) => r.id)).toEqual([6])
    expect(motivosRisco(a3, MAP, HOJE)).toEqual([])
    const s = selo(a7, MAP, HOJE, nome)
    expect(s?.kind).toBe("risk")
  })
  it("selo por prioridade: Vencida > Em risco > Aguardando", () => {
    expect(selo(a6, MAP, HOJE, nome)).toEqual({ kind: "late" })
    expect(selo(a3, MAP, HOJE, nome)).toEqual({ kind: "wait", label: "Solicitar ITBI (Leonardo)" })
    expect(selo(a5, MAP, HOJE, nome)).toEqual({ kind: "wait", label: "Prefeitura — ITBI" })
    expect(selo(a1, MAP, HOJE, nome)).toBeNull()
  })
  it("rótulo do aguardando: 1 anterior → Título (Pessoa); várias → N passos", () => {
    const x = t({ due: 30, st: "wait", anteriores: [5, 6], projetoId: ALFA })
    const m = indexar([...SEED, x])
    expect(aguardandoRotulo(x, m, nome)).toBe("2 passos")
    const semResp = t({ due: 30, st: "wait", anteriores: [10], projetoId: ALFA })
    expect(aguardandoRotulo(semResp, indexar([...SEED, semResp]), nome)).toBe("Protocolar remessa (sem responsável)")
  })
  it("conflito de prazo: anterior pendente vence depois desta", () => {
    expect(conflitosPrazo(a10, MAP).map((c) => c.id)).toEqual([9])
    expect(conflitosPrazo(a13, MAP)).toEqual([])
  })
  it("cadeia inclui anteriores e seguintes transitivas", () => {
    const seg = mapaSeguintes(SEED)
    expect([...cadeia(12, MAP, seg)].sort((x, y) => x - y)).toEqual([11, 12, 13])
    expect([...cadeia(13, MAP, seg)].sort((x, y) => x - y)).toEqual([8, 9, 10, 11, 12, 13])
  })
  it("ciclo: ligar a3 → a1 fecharia o círculo; a mesma tarefa também", () => {
    expect(criariaCiclo(3, 1, MAP)).toBe(true)
    expect(criariaCiclo(1, 3, MAP)).toBe(false)
    expect(criariaCiclo(5, 5, MAP)).toBe(true)
  })
})

describe("fluxo de status", () => {
  it("Em andamento a partir de Aguardando pede confirmação", () => {
    expect(precisaConfirmarInicio(a3, MAP, "doing")).toBe(true)
    expect(precisaConfirmarInicio(a5, MAP, "doing")).toBe(true) // terceiro
    expect(precisaConfirmarInicio(a6, MAP, "doing")).toBe(false)
  })
  it("Aguardando sem anterior pendente e sem texto pede 'Aguardando o quê?'", () => {
    expect(precisaTextoAguardando(b2, MAP, "wait")).toBe(true)
    expect(precisaTextoAguardando(a6, MAP, "wait")).toBe(true) // a anterior (a4) já foi concluída
    expect(precisaTextoAguardando(a7, MAP, "wait")).toBe(false) // tem anteriores pendentes
  })
  it("concluir libera as seguintes que só esperavam por ela", () => {
    expect(liberadasAoConcluir(2, SEED).map((x) => x.id)).toEqual([3])
    expect(liberadasAoConcluir(9, SEED).map((x) => x.id)).toEqual([10]) // sem responsável → pergunta
    expect(liberadasAoConcluir(6, SEED)).toEqual([]) // a7 ainda espera a5
    expect(liberadasAoConcluir(4, SEED)).toEqual([]) // a5 aguarda terceiro
  })
  it("ligar/desligar ajustam o status da seguinte", () => {
    expect(statusAoLigar({ status: "todo" }, { status: "doing" })).toBe("wait")
    expect(statusAoLigar({ status: "todo" }, { status: "done" })).toBe("todo")
    expect(statusAoLigar({ status: "doing" }, { status: "todo" })).toBe("doing")
    expect(statusAoDesligar({ status: "wait", aguardandoTexto: null }, 0)).toBe("todo")
    expect(statusAoDesligar({ status: "wait", aguardandoTexto: "Cliente" }, 0)).toBe("wait")
    expect(statusAoDesligar({ status: "wait", aguardandoTexto: null }, 1)).toBe("wait")
  })
  it("ajuste em cadeia nunca toca prazo fatal", () => {
    const x1 = t({ id: 901, due: 5, st: "todo", projetoId: 99 })
    const x2 = t({ id: 902, due: 8, st: "wait", projetoId: 99, anteriores: [901] })
    const x3 = t({ id: 903, due: 10, st: "wait", projetoId: 99, anteriores: [902], prazoFatal: true })
    const x4 = t({ id: 904, due: 12, st: "done", projetoId: 99, anteriores: [902] })
    const r = deslocamentoCadeia(901, d(8), [x1, x2, x3, x4])
    expect(r).toEqual({ delta: 3, moveis: [902], fatais: 1 })
  })
  it("cliente efetivo: o do projeto (herdado) vence o próprio", () => {
    const doProjeto = (id: number) => (id === ALFA ? 1 : null)
    expect(clienteEfetivo({ projetoId: ALFA, clienteId: 5 }, doProjeto)).toEqual({ id: 1, herdado: true })
    expect(clienteEfetivo({ projetoId: BETA, clienteId: 5 }, doProjeto)).toEqual({ id: 5, herdado: false })
    expect(clienteEfetivo({ projetoId: null, clienteId: null }, doProjeto)).toBeNull()
  })
})

describe("filtros do quadro", () => {
  it("Minhas = responsável sou eu; Concluído só últimos 7 dias", () => {
    const minhas = noEscopo(SEED, { ...FILTROS_PADRAO, escopo: "mine" }, TH)
    expect(minhas.every((x) => x.responsavelId === TH)).toBe(true)
    const antiga = t({ due: -20, st: "done", doneAt: -8 })
    expect(visiveis([antiga, g3], FILTROS_PADRAO, TH, HOJE).map((x) => x.id)).toEqual([g3.id])
  })
  it("filtro de prazo usa a mesma regra", () => {
    const f = { ...FILTROS_PADRAO, prazo: "late" as const }
    expect(visiveis(SEED, f, TH, HOJE).map((x) => x.id).sort((x, y) => x - y)).toEqual([6, 21])
    const fatal = { ...FILTROS_PADRAO, prazo: "fatal" as const }
    expect(visiveis(SEED, fatal, TH, HOJE).map((x) => x.id)).toEqual([51])
  })
  it("projeto 0 = Sem projeto", () => {
    const f = { ...FILTROS_PADRAO, projetos: [0] }
    expect(noEscopo(SEED, f, TH).map((x) => x.id)).toEqual([61, 62])
  })
  it("ordenar por prazo e por responsável (sem responsável por último)", () => {
    const ord = ordenar([a3, a10, a2], "due", () => 0, nome)
    expect(ord.map((x) => x.id)).toEqual([2, 3, 10])
    const porResp = ordenar([a10, a3, a8], "owner", () => 0, nome)
    expect(porResp.map((x) => x.id)).toEqual([8, 3, 10]) // Eduarda, Leonardo, sem
  })
})

describe("painel da Equipe", () => {
  const pessoas: TeamMember[] = [TH, LE, ED].map((id) => ({ id, nome: NOMES[id], first: NOMES[id], initials: "", color: "", role: "" }))
  const projetos: ProjetoRow[] = [ALFA, BETA, GAMA, DELTA, OMEGA].map((id) => ({
    id,
    nomeCurto: String(id),
    nome: String(id),
    cor: "#2E7D6B",
    clienteId: null,
    area: null,
    responsavelId: null,
    prazo: null,
    descricao: null,
    arquivadoEm: null,
    modeloOrigemId: null,
  }))
  it("indicadores, atenção e carga", () => {
    const p = painelEquipe(SEED, projetos, pessoas, HOJE)
    expect(p.vencidas).toBe(2)
    expect(p.projetosAtivos).toBe(5)
    expect(p.noPrazo).toEqual({ feitas: 3, total: 6, pct: 50 }) // b4, o3 e o5 foram entregues depois do prazo
    // atenção: vencidas primeiro, depois prazo fatal em até 5 dias, depois em risco
    expect(p.atencao.map((i) => `${i.tipo}:${i.tarefaId}`)).toEqual(["late:6", "late:21", "fatal:51", "risk:7"])
    expect(p.carga.find((c) => c.pessoaId === ED)).toEqual({ pessoaId: ED, abertas: 6, vencidas: 1 })
  })
})

describe("fluxo", () => {
  const alfa = SEED.filter((x) => x.projetoId === ALFA)
  it("profundidade = ordem das ligações", () => {
    const p = profundidades(alfa)
    expect([p.get(1), p.get(2), p.get(3)]).toEqual([0, 1, 2])
    expect(p.get(13)).toBe(3) // depende de a12 (1) e a10 (2)
  })
  it("uma faixa por grupo, setas entre faixas e tons", () => {
    const l = layoutFluxo(alfa, HOJE)
    expect(l.faixas.map((f) => f.grupo)).toEqual([G1, G2, G3, G4])
    expect(l.faixas[0]).toMatchObject({ feitas: 1, total: 3 })
    const seta = (de: number, para: number) => l.setas.find((s) => s.de === de && s.para === para)
    expect(seta(6, 7)?.tom).toBe("crit") // anterior vencida
    expect(seta(9, 10)?.tom).toBe("warn") // conflito de prazo
    expect(seta(10, 13)?.tom).toBe("base") // entre faixas
    expect(l.pos.get(13)!.x).toBeGreaterThan(l.pos.get(12)!.x)
  })
  it("celular: lista por grupo na ordem das ligações", () => {
    const g = listaFluxo(alfa)
    expect(g[1].tarefas.map((x) => x.id)).toEqual([4, 6, 5, 7])
  })
})
