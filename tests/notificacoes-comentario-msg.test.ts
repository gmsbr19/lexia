import { describe, expect, it } from "vitest"
import { comentarioEmailHtml, msgComentarioTarefa } from "@/lib/notificacoes/comentario-msg"

describe("msgComentarioTarefa", () => {
  it("comentou (sem menção)", () => {
    expect(msgComentarioTarefa({ atorNome: "Ana", titulo: "Petição X" })).toBe(
      'Ana comentou em "Petição X"',
    )
  })
  it("mencionou", () => {
    expect(msgComentarioTarefa({ atorNome: "Ana", titulo: "Petição X", mencionado: true })).toBe(
      'Ana mencionou você em "Petição X"',
    )
  })
  it("fallback sem ator", () => {
    expect(msgComentarioTarefa({ titulo: "Petição X" })).toBe('Novo comentário em "Petição X"')
  })
})

describe("comentarioEmailHtml", () => {
  const nomes = new Map([[1, "Ana Souza"]])
  const resolver = (id: number) => nomes.get(id) ?? null
  it("resolve menção e @todos", () => {
    expect(comentarioEmailHtml("oi @[1] e @[todos]", resolver)).toBe("oi @Ana Souza e @todos")
  })
  it("escapa HTML (anti-XSS)", () => {
    expect(comentarioEmailHtml("<script>alert(1)</script>", resolver)).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    )
  })
  it("quebras de linha viram <br>", () => {
    expect(comentarioEmailHtml("linha1\nlinha2", resolver)).toBe("linha1<br>linha2")
  })
  it("id desconhecido vira @?", () => {
    expect(comentarioEmailHtml("oi @[99]", resolver)).toBe("oi @?")
  })
})
