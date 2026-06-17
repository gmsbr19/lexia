import { describe, expect, it } from "vitest"
import { decodeEntidades, limparTextoPublicacao } from "@/lib/processos/texto"
import { extrairClasseHeuristica } from "@/lib/processos/vinculo"

describe("limparTextoPublicacao", () => {
  it("limpa o HTML real do DJe (tags + entidades) preservando o texto", () => {
    const html =
      "<html> <head> <meta> <style>.x{color:red}</style> </head> <body> <article> <header> <div></div> </header> " +
      "<section><b>Procedimento Comum C&iacute;vel N&ordm; 4045341-04.2025.8.26.0002/SP</b></section> </article> </body> </html>"
    const out = limparTextoPublicacao(html)
    expect(out).toBe("Procedimento Comum Cível Nº 4045341-04.2025.8.26.0002/SP")
    expect(out).not.toContain("<")
    expect(out).not.toContain("color:red") // conteúdo do <style> foi removido
  })

  it("converte tabela em texto com espaços (sem grudar células)", () => {
    const html =
      '<b>Monitória Nº 1006261-56.2024.8.26.0152/SP</b></br><table border="0"><tr><td>AUTOR</td><td>: BANCO X</td></tr><tr><td>RÉU</td><td>: FULANO</td></tr></table>'
    const out = limparTextoPublicacao(html)
    expect(out).toContain("Monitória Nº 1006261-56.2024.8.26.0152/SP")
    expect(out).toContain("AUTOR : BANCO X")
    expect(out).toContain("RÉU : FULANO")
    expect(out).not.toContain("<")
  })

  it("é idempotente em texto já limpo e tolera vazio/nulo", () => {
    expect(limparTextoPublicacao("Intime-se o advogado.")).toBe("Intime-se o advogado.")
    expect(limparTextoPublicacao("")).toBe("")
    expect(limparTextoPublicacao(null)).toBe("")
    expect(limparTextoPublicacao(undefined)).toBe("")
  })

  it("decodeEntidades cobre numéricas e nomeadas", () => {
    expect(decodeEntidades("a&amp;b")).toBe("a&b")
    expect(decodeEntidades("Cita&ccedil;&atilde;o")).toBe("Citação")
    expect(decodeEntidades("&#65;&#x42;")).toBe("AB")
  })
})

describe("extrairClasseHeuristica", () => {
  it("pega a classe antes do 'Nº' (fallback sem IA)", () => {
    expect(extrairClasseHeuristica("<b>Procedimento Comum C&iacute;vel N&ordm; 4045341-04.2025.8.26.0002/SP</b>")).toBe(
      "Procedimento Comum Cível",
    )
    expect(extrairClasseHeuristica("<b>Monitória Nº 1006261-56.2024.8.26.0152/SP</b>")).toBe("Monitória")
  })
})
