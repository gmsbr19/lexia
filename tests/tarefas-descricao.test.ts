// Tarefa criada pelo Claude não entra sem ENUNCIADO: a regra está no núcleo puro
// (descricao-core) e no schema das 3 ferramentas de criação, para a recusa chegar
// ao modelo antes de qualquer cartão de confirmação.
import { describe, expect, it } from "vitest"
import { UserError } from "@/lib/errors"
import { TOOLS_BY_NAME } from "@/lib/lexia/agent/registry"
import {
  DESCRICAO_MIN_CHARS,
  exigirDescricao,
  problemaDescricao,
  recusaDescricao,
} from "@/lib/tarefas/descricao-core"

const BOA = "Protocolar a contestação no PJe do processo 1234/2026, usando a minuta já aprovada pelo cliente."
const TITULO = "Protocolar contestação"

/** Erros da descrição no resultado de um safeParse. */
function errosDescricao(r: { success: boolean; error?: { issues: { path: (string | number | symbol)[]; message: string }[] } }): string[] {
  if (r.success) return []
  return (r.error?.issues ?? []).filter((i) => i.path.includes("descricao")).map((i) => i.message)
}

describe("problemaDescricao — o que conta como enunciado", () => {
  it("aceita uma descrição que diz o que fazer", () => {
    expect(problemaDescricao(TITULO, BOA)).toBeNull()
  })

  it("recusa ausente, vazia e só espaço", () => {
    expect(problemaDescricao(TITULO, undefined)).toBe("ficou sem descrição")
    expect(problemaDescricao(TITULO, "")).toBe("ficou sem descrição")
    expect(problemaDescricao(TITULO, "   \n  ")).toBe("ficou sem descrição")
    expect(problemaDescricao(TITULO, "— … -")).toBe("ficou sem descrição")
  })

  it("recusa o texto de enchimento que ocupa o campo sem dizer nada", () => {
    for (const d of ["A definir", "a combinar.", "pendente", "N/A", "Ver com o cliente", "idem título", "TBD", "fazer a tarefa"]) {
      expect(problemaDescricao(TITULO, d), d).toContain("não diz o que precisa ser feito")
    }
  })

  it("recusa a descrição que só repete um título curto (inclusive sem acento/pontuação)", () => {
    expect(problemaDescricao(TITULO, "Protocolar contestação")).toContain("só repete o título")
    expect(problemaDescricao(TITULO, "protocolar contestacao.")).toContain("só repete o título")
  })

  it("aceita a repetição quando o próprio título já diz o trabalho (menos fricção que exigir texto novo)", () => {
    const completo = "Protocolar a contestação no processo 1234/2026 pelo PJe"
    expect(problemaDescricao(completo, completo)).toBeNull()
  })

  it("recusa a descrição curta demais para ser executada", () => {
    expect(problemaDescricao(TITULO, "Mandar para o juiz hoje")).toContain("curta demais")
    // Passa do mínimo de caracteres, mas em 4 palavras vagas — ainda não diz o que fazer.
    const vaga = "Providenciar documentação complementar urgentemente"
    expect(vaga.length).toBeGreaterThanOrEqual(DESCRICAO_MIN_CHARS)
    expect(problemaDescricao(TITULO, vaga)).toContain("curta demais")
  })

  it("funciona sem título (edição de tarefa já existente)", () => {
    expect(problemaDescricao(null, BOA)).toBeNull()
    expect(problemaDescricao(null, "")).toBe("ficou sem descrição")
  })
})

describe("recusaDescricao / exigirDescricao — redigir primeiro, perguntar só o que falta", () => {
  it("manda o modelo escrever a descrição a partir do pedido, não exigir ditado do usuário", () => {
    const m = recusaDescricao("ficou sem descrição", TITULO)
    expect(m).toContain(TITULO)
    expect(m).toContain("é SUA para escrever")
    expect(m).toContain("resultado esperado")
    // Perguntar é o caminho de exceção — e inventar fato nunca é.
    expect(m).toContain("pergunte só o que falta")
    expect(m).toContain("fato que o usuário não disse")
  })

  it("nomeia qual tarefa da lista quando são várias", () => {
    expect(recusaDescricao("ficou sem descrição", "Juntar procuração", "Tarefa 3")).toContain("Tarefa 3")
  })

  it("exigirDescricao lança UserError (mensagem pt-BR preservada pelo MCP) e passa a boa", () => {
    expect(() => exigirDescricao(TITULO, "a definir")).toThrow(UserError)
    expect(() => exigirDescricao(TITULO, BOA)).not.toThrow()
  })
})

describe("schema das ferramentas de criação", () => {
  const criar = TOOLS_BY_NAME.get("criar_tarefa")!
  const lote = TOOLS_BY_NAME.get("criar_tarefas_lote")!
  const estrutura = TOOLS_BY_NAME.get("criar_estrutura_projeto")!

  it("criar_tarefa exige a descrição e ensina o modelo no erro", () => {
    const semDesc = criar.schema.safeParse({ titulo: TITULO })
    expect(semDesc.success).toBe(false)
    const ruim = criar.schema.safeParse({ titulo: TITULO, descricao: "a definir" })
    expect(ruim.success).toBe(false)
    expect(errosDescricao(ruim).join(" ")).toContain("é SUA para escrever")
    expect(criar.schema.safeParse({ titulo: TITULO, descricao: BOA }).success).toBe(true)
  })

  it("criar_tarefas_lote recusa o lote inteiro quando UMA tarefa vem sem enunciado", () => {
    expect(lote.schema.safeParse({ tarefas: [{ titulo: TITULO, descricao: BOA }] }).success).toBe(true)
    const r = lote.schema.safeParse({
      tarefas: [
        { titulo: TITULO, descricao: BOA },
        { titulo: "Juntar procuração", descricao: "ver com" },
      ],
    })
    expect(r.success).toBe(false)
  })

  it("criar_estrutura_projeto exige descrição em cada tarefa da estrutura", () => {
    const base = { novo: { nomeCurto: "Holding", nome: "Holding Patrimonial" } }
    expect(estrutura.schema.safeParse({ ...base, tarefas: [{ titulo: TITULO }] }).success).toBe(false)
    expect(estrutura.schema.safeParse({ ...base, tarefas: [{ titulo: TITULO, descricao: BOA }] }).success).toBe(true)
  })

  it("editar_tarefa segue aceitando patch sem descrição (só o que muda)", () => {
    const editar = TOOLS_BY_NAME.get("editar_tarefa")!
    expect(editar.schema.safeParse({ id: 1, prazo: "2026-12-01" }).success).toBe(true)
  })
})
