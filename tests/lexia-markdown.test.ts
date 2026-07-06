import { describe, expect, it } from "vitest"
import { parseMarkdown } from "@/components/lexia/md/parse"

describe("parseMarkdown — parágrafo/heading (paridade v1)", () => {
  it("agrupa linhas consecutivas em um parágrafo", () => {
    const blocks = parseMarkdown("Linha 1\nLinha 2\n\nLinha 3")
    expect(blocks).toEqual([
      { type: "paragraph", lines: ["Linha 1", "Linha 2"] },
      { type: "paragraph", lines: ["Linha 3"] },
    ])
  })

  it("reconhece headings 1-3", () => {
    expect(parseMarkdown("# T1")).toEqual([{ type: "heading", level: 1, text: "T1" }])
    expect(parseMarkdown("### T3")).toEqual([{ type: "heading", level: 3, text: "T3" }])
  })
})

describe("parseMarkdown — blockquote", () => {
  it("agrupa linhas consecutivas com '>' e remove o prefixo", () => {
    const blocks = parseMarkdown("> primeira\n> segunda")
    expect(blocks).toEqual([{ type: "blockquote", lines: ["primeira", "segunda"] }])
  })
})

describe("parseMarkdown — regra horizontal", () => {
  it("reconhece --- *** ___ isolados", () => {
    expect(parseMarkdown("---")).toEqual([{ type: "hr" }])
    expect(parseMarkdown("***")).toEqual([{ type: "hr" }])
    expect(parseMarkdown("___")).toEqual([{ type: "hr" }])
  })

  it("não confunde uma lista de 3 traços com hr", () => {
    const blocks = parseMarkdown("- a\n- b\n- c")
    expect(blocks[0].type).toBe("list")
  })
})

describe("parseMarkdown — listas aninhadas + tarefas", () => {
  it("lista simples não-ordenada", () => {
    const blocks = parseMarkdown("- a\n- b")
    expect(blocks).toEqual([{ type: "list", ordered: false, items: [{ text: "a" }, { text: "b" }] }])
  })

  it("lista ordenada com item aninhado (2 níveis)", () => {
    const md = "1. Pai\n   - Filho 1\n   - Filho 2\n2. Outro pai"
    const blocks = parseMarkdown(md)
    expect(blocks).toHaveLength(1)
    const list = blocks[0] as Extract<(typeof blocks)[number], { type: "list" }>
    expect(list.ordered).toBe(true)
    expect(list.items).toHaveLength(2)
    expect(list.items[0].text).toBe("Pai")
    expect(list.items[0].children?.items.map((c) => c.text)).toEqual(["Filho 1", "Filho 2"])
    expect(list.items[1].text).toBe("Outro pai")
    expect(list.items[1].children).toBeUndefined()
  })

  it("checkbox marca item de tarefa e extrai o estado", () => {
    const blocks = parseMarkdown("- [ ] pendente\n- [x] feito\n- [X] feito maiúsculo")
    const list = blocks[0] as Extract<(typeof blocks)[number], { type: "list" }>
    expect(list.items).toEqual([
      { text: "pendente", checked: false },
      { text: "feito", checked: true },
      { text: "feito maiúsculo", checked: true },
    ])
  })
})

describe("parseMarkdown — bloco de código", () => {
  it("cerca fechada normal", () => {
    const blocks = parseMarkdown("```js\nconst x = 1\n```")
    expect(blocks).toEqual([{ type: "code", lang: "js", code: "const x = 1", aberto: false }])
  })

  it("sem linguagem → 'texto'", () => {
    const blocks = parseMarkdown("```\nfoo\n```")
    expect((blocks[0] as { lang: string }).lang).toBe("texto")
  })

  it("cerca sem fechamento + streaming=true → aberto:true", () => {
    const blocks = parseMarkdown("```js\nconst x = 1", { streaming: true })
    expect(blocks).toEqual([{ type: "code", lang: "js", code: "const x = 1", aberto: true }])
  })

  it("cerca sem fechamento + streaming=false (mensagem já persistida) → aberto:false", () => {
    const blocks = parseMarkdown("```js\nconst x = 1", { streaming: false })
    expect((blocks[0] as { aberto: boolean }).aberto).toBe(false)
  })
})

describe("parseMarkdown — tabela", () => {
  it("descarta a linha separadora e mantém cabeçalho + linhas", () => {
    const md = "| Nome | Valor |\n|---|---|\n| Aurora | 100 |"
    const blocks = parseMarkdown(md)
    expect(blocks).toEqual([{ type: "table", header: ["Nome", "Valor"], rows: [["Aurora", "100"]] }])
  })
})

describe("parseMarkdown — mistura de blocos numa resposta real", () => {
  it("segmenta parágrafo + citação + lista + código na ordem certa", () => {
    const md = "Revisei a minuta.\n\n> cláusula 4ª\n\n- [ ] validar valor\n- [x] conferir CNPJ\n\n```sql\nSELECT 1\n```"
    const blocks = parseMarkdown(md)
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "blockquote", "list", "code"])
  })
})
