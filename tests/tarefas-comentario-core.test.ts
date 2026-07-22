import { describe, expect, it } from "vitest"
import {
  destinatariosComentario,
  parseMencoes,
  segmentosComentario,
  serializeMencoes,
} from "@/lib/tarefas/comentario-core"

describe("parseMencoes", () => {
  it("extrai ids distintos e @todos, ignora malformados", () => {
    const r = parseMencoes("oi @[3] e @[3] e @[todos] e @[abc] e @[0]")
    expect(r.ids).toEqual([3])
    expect(r.todos).toBe(true)
  })
  it("sem menções", () => {
    expect(parseMencoes("texto puro")).toEqual({ ids: [], todos: false })
  })
})

describe("segmentosComentario", () => {
  it("quebra texto/menção/todos na ordem", () => {
    expect(segmentosComentario("oi @[1] veja @[todos]!")).toEqual([
      { t: "texto", v: "oi " },
      { t: "mencao", id: 1 },
      { t: "texto", v: " veja " },
      { t: "todos" },
      { t: "texto", v: "!" },
    ])
  })
  it("token malformado vira texto cru", () => {
    expect(segmentosComentario("a @[x] b")).toEqual([{ t: "texto", v: "a @[x] b" }])
  })
})

describe("serializeMencoes", () => {
  it("converte pick em token (1ª ocorrência)", () => {
    expect(serializeMencoes("oi @Ana Souza tudo bem", [{ label: "Ana Souza", id: 5 }])).toBe(
      "oi @[5] tudo bem",
    )
  })
  it("@todos vira token", () => {
    expect(serializeMencoes("aviso @todos !", [{ label: "todos", id: "todos" }])).toBe(
      "aviso @[todos] !",
    )
  })
  it("sem colisão de prefixo (label longo primeiro)", () => {
    expect(
      serializeMencoes("oi @Ana e @Ana Souza", [
        { label: "Ana", id: 3 },
        { label: "Ana Souza", id: 5 },
      ]),
    ).toBe("oi @[3] e @[5]")
  })
  it("pick cujo texto foi apagado é ignorado", () => {
    expect(serializeMencoes("oi tudo bem", [{ label: "Ana", id: 3 }])).toBe("oi tudo bem")
  })
  it("não casa prefixo de um nome maior não-pickado", () => {
    expect(serializeMencoes("oi @Anabelle", [{ label: "Ana", id: 3 }])).toBe("oi @Anabelle")
  })
})

describe("destinatariosComentario", () => {
  const base = {
    responsavelId: 1,
    criadoPorId: 2,
    comentaristasAnteriores: [3],
    mencaoIds: [] as number[],
    mencionouTodos: false,
    autorId: 9,
  }
  it("participantes sempre, autor nunca", () => {
    expect(destinatariosComentario(base).sort()).toEqual([1, 2, 3])
  })
  it("menção fora dos participantes é adicionada", () => {
    expect(destinatariosComentario({ ...base, mencaoIds: [7] }).sort()).toEqual([1, 2, 3, 7])
  })
  it("participante + mencionado = uma vez", () => {
    expect(destinatariosComentario({ ...base, mencaoIds: [1] }).sort()).toEqual([1, 2, 3])
  })
  it("autor participante/mencionado ainda é excluído", () => {
    const r = destinatariosComentario({ ...base, responsavelId: 9, mencaoIds: [9] })
    expect(r).not.toContain(9)
    expect(r.sort()).toEqual([2, 3])
  })
  it("@todos não adiciona além dos participantes", () => {
    expect(destinatariosComentario({ ...base, mencionouTodos: true }).sort()).toEqual([1, 2, 3])
  })
  it("responsavel/criador null tolerados", () => {
    expect(
      destinatariosComentario({
        ...base,
        responsavelId: null,
        criadoPorId: null,
        comentaristasAnteriores: [],
      }),
    ).toEqual([])
  })
})
