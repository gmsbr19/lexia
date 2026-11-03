// Informações fixadas (src/lib/informacoes/core.ts): índice por âncora, o que vale
// para cada tarefa (projeto antes do cliente), menções do comentário, quem exclui,
// texto limpo e "atualizada há…".
import { describe, expect, it } from "vitest"
import {
  ancoraDoProjeto,
  ancorasDaTarefa,
  fixadasDaTarefa,
  indexarFixadas,
  normalizarConteudo,
  podeExcluirInformacao,
  talvezDesatualizada,
  tempoDesde,
  textoDeComentario,
  type Ancora,
  type InformacaoRow,
} from "@/lib/informacoes/core"
import type { ChaveProjeto } from "@/lib/tarefas/types"

let seq = 0
const info = (ancora: Ancora, p: Partial<InformacaoRow> = {}): InformacaoRow => ({
  fonte: ancora.tipo === "cliente" ? "cliente" : "anotacao",
  id: ++seq,
  ancora,
  conteudo: `nota ${seq}`,
  autor: "Ana",
  autorId: 1,
  criadaEm: "2026-09-01T12:00:00.000Z",
  editadaEm: null,
  editadaPor: null,
  fixado: true,
  fixadaEm: "2026-09-01T12:00:00.000Z",
  fixadaPor: "Ana",
  origemTarefaId: null,
  ...p,
})

const CLI: Ancora = { tipo: "cliente", id: 9 }
const CASO: Ancora = { tipo: "caso", id: 3 }
const INT: Ancora = { tipo: "projeto", id: 3 }

describe("âncoras", () => {
  it("projeto do quadro: c<id> → caso, p<id> → projeto interno", () => {
    expect(ancoraDoProjeto("c3")).toEqual(CASO)
    expect(ancoraDoProjeto("p3")).toEqual(INT)
    expect(ancoraDoProjeto(null)).toBeNull()
  })

  it("tarefa de caso: o caso e o cliente DO CASO (o próprio é ignorado)", () => {
    const doProjeto = (k: ChaveProjeto) => (k === "c3" ? 9 : null)
    expect(ancorasDaTarefa({ projeto: "c3", clienteId: 7 }, doProjeto)).toEqual([CASO, CLI])
  })

  it("tarefa de projeto interno: o projeto e o cliente próprio da tarefa", () => {
    expect(ancorasDaTarefa({ projeto: "p3", clienteId: 7 }, () => null)).toEqual([INT, { tipo: "cliente", id: 7 }])
  })

  it("tarefa sem projeto nem cliente: nenhuma âncora", () => {
    expect(ancorasDaTarefa({ projeto: null, clienteId: null }, () => null)).toEqual([])
  })
})

describe("índice e fixadas da tarefa", () => {
  const antiga = info(CASO, { fixadaEm: "2026-01-01T00:00:00.000Z" })
  const nova = info(CASO, { fixadaEm: "2026-09-20T00:00:00.000Z" })
  const doCliente = info(CLI)
  const solta = info(CASO, { fixado: false, fixadaEm: null })
  const interna = info(INT)
  const indice = indexarFixadas([antiga, doCliente, solta, nova, interna])

  it("ignora as não fixadas; mais recente primeiro", () => {
    expect(indice.get("caso:3")?.map((r) => r.id)).toEqual([nova.id, antiga.id])
  })

  it("caso 3 ≠ projeto interno 3", () => {
    expect(indice.get("projeto:3")?.map((r) => r.id)).toEqual([interna.id])
  })

  it("projeto antes do cliente", () => {
    expect(fixadasDaTarefa(indice, [CASO, CLI]).map((r) => r.id)).toEqual([nova.id, antiga.id, doCliente.id])
    expect(fixadasDaTarefa(indice, [])).toEqual([])
  })
})

describe("texto", () => {
  it("comentário: menções viram nomes", () => {
    const nome = (id: number) => ({ 12: "Leonardo" })[id]
    expect(textoDeComentario("@[12] só paga dia 10, avise @[todos] e @[99]", nome)).toBe("@Leonardo só paga dia 10, avise @todos e @alguém")
  })

  it("normaliza quebras e espaços", () => {
    expect(normalizarConteudo("  a\r\n\r\n\r\n\r\nb  \n")).toBe("a\n\nb")
    expect(normalizarConteudo("x   \ny")).toBe("x\ny")
  })
})

describe("permissão e idade", () => {
  it("excluir: autor ou gestão", () => {
    const r = info(CLI, { autorId: 5 })
    expect(podeExcluirInformacao(r, { id: 5, role: "estagiario" })).toBe(true)
    expect(podeExcluirInformacao(r, { id: 6, role: "advogado" })).toBe(false)
    expect(podeExcluirInformacao(r, { id: 6, role: "socio" })).toBe(true)
    expect(podeExcluirInformacao(r, { id: null, role: "admin" })).toBe(true)
    expect(podeExcluirInformacao(info(CLI, { autorId: null }), { id: null, role: "advogado" })).toBe(false)
  })

  it("tempo desde e talvez desatualizada (6 meses)", () => {
    const agora = new Date("2026-10-09T12:00:00.000Z")
    expect(tempoDesde("2026-10-09T08:00:00.000Z", agora)).toBe("hoje")
    expect(tempoDesde("2026-10-08T08:00:00.000Z", agora)).toBe("ontem")
    expect(tempoDesde("2026-09-29T12:00:00.000Z", agora)).toBe("há 10 dias")
    expect(tempoDesde("2026-07-01T12:00:00.000Z", agora)).toBe("há 3 meses")
    expect(tempoDesde("2024-09-01T12:00:00.000Z", agora)).toBe("há 2 anos")
    expect(talvezDesatualizada({ criadaEm: "2026-01-01T00:00:00.000Z", editadaEm: null }, agora)).toBe(true)
    expect(talvezDesatualizada({ criadaEm: "2026-01-01T00:00:00.000Z", editadaEm: "2026-09-01T00:00:00.000Z" }, agora)).toBe(false)
  })
})
