import { describe, expect, it } from "vitest"
import { extrairFollowups, FollowupsFilter } from "@/lib/lexia/agent/followups"

function streamThrough(texto: string, tamanhoChunk: number): string {
  const filtro = new FollowupsFilter()
  let out = ""
  for (let i = 0; i < texto.length; i += tamanhoChunk) {
    out += filtro.feed(texto.slice(i, i + tamanhoChunk))
  }
  return out
}

describe("FollowupsFilter — segura a tag ao vivo, não importa onde o stream corta (Fase 6, D2)", () => {
  const texto = "Encontrei 4 honorários vencidos.\n\n<sugestoes>Cobrar Aurora | Ver inadimplência | Agendar lembrete</sugestoes>"
  const esperado = "Encontrei 4 honorários vencidos.\n\n"

  it("chunk de 1 caractere — pior caso de torture-test (corta a tag em qualquer ponto)", () => {
    expect(streamThrough(texto, 1)).toBe(esperado)
  })

  it.each([2, 3, 5, 7, 11, 13, 17, 50, texto.length])("chunk de %i caracteres", (n) => {
    expect(streamThrough(texto, n)).toBe(esperado)
  })

  it("sem sentinela — todo o texto passa (inclusive um '<' solto no meio de prosa)", () => {
    const t = "o valor é x < 5 e y > 2, sem sugestões aqui."
    expect(streamThrough(t, 3)).toBe(t)
  })

  it("tag colada sem quebra de linha antes some do começo ao fim", () => {
    const t = "resposta curta<sugestoes>a | b</sugestoes>"
    expect(streamThrough(t, 4)).toBe("resposta curta")
  })

  it("falso positivo: '<s' que nunca vira a tag é liberado inteiro", () => {
    const t = "veja <span>isto</span> por favor"
    expect(streamThrough(t, 2)).toBe(t)
  })
})

describe("extrairFollowups — parse do texto final autoritativo (Fase 6, D2)", () => {
  it("sem sentinela → texto intacto, itens vazio", () => {
    expect(extrairFollowups("Olá, tudo bem?")).toEqual({ texto: "Olá, tudo bem?", itens: [] })
  })

  it("extrai os itens e limpa o texto (trim do fim)", () => {
    const r = extrairFollowups("Resposta.\n\n<sugestoes>Cobrar Aurora | Ver inadimplência | Agendar lembrete</sugestoes>")
    expect(r.texto).toBe("Resposta.")
    expect(r.itens).toEqual(["Cobrar Aurora", "Ver inadimplência", "Agendar lembrete"])
  })

  it("ignora itens vazios/whitespace entre pipes", () => {
    const r = extrairFollowups("Ok.<sugestoes>a |  | b</sugestoes>")
    expect(r.itens).toEqual(["a", "b"])
  })

  it("cap de 4 itens mesmo se vierem mais", () => {
    const r = extrairFollowups("<sugestoes>a|b|c|d|e|f</sugestoes>")
    expect(r.itens).toHaveLength(4)
  })
})
