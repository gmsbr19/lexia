import { describe, expect, it } from "vitest"
import { decidirModelo } from "@/lib/lexia/agent/router"
import { perguntarSchema } from "@/lib/lexia/agent/tools/perguntar"
import { validarRota } from "@/lib/lexia/agent/tools/navegacao"
import { TOOLS, TOOLS_BY_NAME, toApiTools } from "@/lib/lexia/agent/registry"
import { acaoDecisaoSchema } from "@/lib/lexia/schemas"
import { encodeSse } from "@/lib/lexia/agent/sse"
import { addDiasISO } from "@/lib/lexia/agent/datas"

describe("perguntarSchema — validação da tool perguntar_usuario (Fase 6, D3)", () => {
  it("aceita 2-6 opções, multipla/permitirOutro opcionais", () => {
    expect(perguntarSchema.safeParse({ pergunta: "Qual cliente?", opcoes: ["Aurora", "Vargas"] }).success).toBe(true)
    expect(perguntarSchema.safeParse({ pergunta: "Quais critérios?", opcoes: ["a", "b", "c"], multipla: true, permitirOutro: true }).success).toBe(true)
  })

  it("rejeita menos de 2 ou mais de 6 opções", () => {
    expect(perguntarSchema.safeParse({ pergunta: "X?", opcoes: ["só uma"] }).success).toBe(false)
    expect(perguntarSchema.safeParse({ pergunta: "X?", opcoes: Array.from({ length: 7 }, (_, i) => `op${i}`) }).success).toBe(false)
  })

  it("rejeita pergunta vazia", () => {
    expect(perguntarSchema.safeParse({ pergunta: "", opcoes: ["a", "b"] }).success).toBe(false)
  })
})

describe("acaoDecisaoSchema — decisao 'responder' (ChoiceCard, Fase 6, D3)", () => {
  it("confirmar/recusar seguem sem exigir resposta", () => {
    expect(acaoDecisaoSchema.safeParse({ decisao: "confirmar" }).success).toBe(true)
    expect(acaoDecisaoSchema.safeParse({ decisao: "recusar" }).success).toBe(true)
  })

  it("responder exige `resposta` com ao menos uma seleção ou um 'outro'", () => {
    expect(acaoDecisaoSchema.safeParse({ decisao: "responder" }).success).toBe(false)
    expect(acaoDecisaoSchema.safeParse({ decisao: "responder", resposta: { selecionadas: [] } }).success).toBe(false)
    expect(acaoDecisaoSchema.safeParse({ decisao: "responder", resposta: { selecionadas: ["Opção A"] } }).success).toBe(true)
    expect(acaoDecisaoSchema.safeParse({ decisao: "responder", resposta: { selecionadas: [], outro: "Texto livre" } }).success).toBe(true)
  })
})

describe("router — model selection (Sonnet default, Opus opt-in only)", () => {
  it("routes greetings to Haiku without tools", () => {
    const d = decidirModelo("Oi, tudo bem?")
    expect(d.model).toBe("claude-haiku-4-5")
    expect(d.useTools).toBe(false)
    expect(d.effort).toBeUndefined()
  })

  it("routes drafting to Sonnet by default — there is no auto-Opus", () => {
    expect(decidirModelo("Pode redigir uma minuta de petição inicial?").model).toBe("claude-sonnet-4-6")
  })

  it("uses Opus ONLY when the user opts in (forcarOpus): medium effort + bounded cap", () => {
    const d = decidirModelo("Pode redigir uma minuta de petição inicial?", null, { forcarOpus: true })
    expect(d.model).toBe("claude-opus-4-8")
    expect(d.effort).toBe("medium")
    expect(d.maxTokens).toBe(8000)
    expect(d.useTools).toBe(true)
  })

  it("keeps everyday queries on Sonnet — incl. 'contrato'/'analisar'/'comparar' (no longer Opus)", () => {
    for (const m of [
      "Quanto recebi este mês?",
      "Qual o contrato do cliente Souza?",
      "Analise os recebíveis vencidos",
      "Compare os dois meses",
    ]) {
      expect(decidirModelo(m).model, m).toBe("claude-sonnet-4-6")
    }
  })

  it("is NOT sticky: a casual follow-up after an Opus turn drops back to Sonnet", () => {
    expect(decidirModelo("e o saldo?", "claude-opus-4-8").model).toBe("claude-sonnet-4-6")
  })

  it("an empty-message resumed turn (confirm/recusar) inherits the proposal's tier", () => {
    expect(decidirModelo("", "claude-opus-4-8").model).toBe("claude-opus-4-8")
    expect(decidirModelo("", "claude-sonnet-4-6").model).toBe("claude-sonnet-4-6")
    expect(decidirModelo("", null).model).toBe("claude-sonnet-4-6")
  })

  it("never auto-escalates on length — even very long messages stay on Sonnet", () => {
    expect(decidirModelo("a".repeat(700)).model).toBe("claude-sonnet-4-6")
    expect(decidirModelo("a".repeat(1300)).model).toBe("claude-sonnet-4-6")
  })

  it("attachments always use Sonnet (vision + tools); forcarOpus overrides", () => {
    expect(decidirModelo("o que diz esse documento?", null, { temAnexos: true }).model).toBe("claude-sonnet-4-6")
    expect(decidirModelo("redija um parecer a partir deste anexo", null, { temAnexos: true }).model).toBe("claude-sonnet-4-6")
    expect(decidirModelo("redija…", null, { temAnexos: true, forcarOpus: true }).model).toBe("claude-opus-4-8")
  })

  it("model selector: 'avancado' → Opus; 'rapido'/'auto' stay on the default routing", () => {
    expect(decidirModelo("analise os recebíveis", null, { modelo: "avancado" }).model).toBe("claude-opus-4-8")
    expect(decidirModelo("analise os recebíveis", null, { modelo: "rapido" }).model).toBe("claude-sonnet-4-6")
    expect(decidirModelo("analise os recebíveis", null, { modelo: "auto" }).model).toBe("claude-sonnet-4-6")
    // greeting still goes to Haiku regardless of a non-Opus selector
    expect(decidirModelo("oi", null, { modelo: "rapido" }).model).toBe("claude-haiku-4-5")
  })
})

describe("navegar — route whitelist", () => {
  it("accepts known routes and preserves the query", () => {
    expect(validarRota("/financeiro")).toBe("/financeiro")
    expect(validarRota("/financeiro?tab=lancamentos&stat=vencido")).toBe("/financeiro?tab=lancamentos&stat=vencido")
    expect(validarRota("/clientes/42")).toBe("/clientes/42")
    expect(validarRota("/")).toBe("/")
  })

  it("rejects unknown routes, externals, and protocol-relative URLs", () => {
    expect(validarRota("/admin")).toBeNull()
    expect(validarRota("https://evil.com")).toBeNull()
    expect(validarRota("//evil.com")).toBeNull()
    expect(validarRota("/clientes/abc")).toBeNull()
    expect(validarRota(42)).toBeNull()
  })
})

describe("registry — deterministic, valid tool schemas", () => {
  it("is name-sorted (cache-stable order)", () => {
    const names = TOOLS.map((t) => t.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it("exposes the expected mutation + readonly mix", () => {
    expect(TOOLS_BY_NAME.get("buscar")?.kind).toBe("readonly")
    expect(TOOLS_BY_NAME.get("criar_tarefa")?.kind).toBe("mutation")
    expect(TOOLS_BY_NAME.get("navegar")?.kind).toBe("client")
    // every mutation tool can render a confirmation summary
    for (const t of TOOLS) if (t.kind === "mutation") expect(typeof t.resumo).toBe("function")
  })

  const DOC_ONLY = ["editar_documento_aberto", "detectar_campos_documento"]

  it("generates object-typed JSON schemas for every tool (admin sees all but the doc-only tools off-editor)", () => {
    const api = toApiTools("admin")
    // as ferramentas de edição de documento só aparecem dentro do editor (docMode)
    expect(api.length).toBe(TOOLS.length - DOC_ONLY.length)
    for (const n of DOC_ONLY) expect(api.some((t) => t.name === n), n).toBe(false)
    for (const t of api) {
      expect(t.input_schema.type).toBe("object")
      expect((t.description ?? "").length).toBeGreaterThan(0)
    }
  })

  it("docMode (editor) expõe leitura + as ferramentas de documento, e remove mutações/navegação de CRM", () => {
    const doc = new Set(toApiTools("admin", "agente", true).map((t) => t.name))
    // as 2 ferramentas de documento aparecem SÓ com um doc aberto
    for (const n of DOC_ONLY) expect(doc.has(n), n).toBe(true)
    // leitura p/ preencher campos com dados reais do escritório
    expect(doc.has("buscar")).toBe(true)
    expect(doc.has("detalhe_cliente")).toBe(true)
    // mutações de CRM, navegação e rascunhar somem (foco em editar o doc aberto)
    for (const n of ["criar_tarefa", "criar_cliente", "navegar", "rascunhar_documento"]) expect(doc.has(n), n).toBe(false)
    // tudo no docMode é leitura, uma das 2 de documento, ou a pergunta de
    // esclarecimento (perguntar_usuario, Fase 6 — não abre nenhuma capacidade extra)
    const docSet = new Set(DOC_ONLY)
    for (const t of toApiTools("admin", "agente", true)) {
      const tool = TOOLS_BY_NAME.get(t.name)!
      expect(tool.kind === "readonly" || tool.kind === "pergunta" || docSet.has(t.name), t.name).toBe(true)
    }
    // fora do editor as ferramentas de documento NÃO existem
    const global = new Set(toApiTools("admin").map((t) => t.name))
    for (const n of DOC_ONLY) expect(global.has(n), n).toBe(false)
    // docMode + "pergunta": o agente só consulta — sem editar o documento
    const docPergunta = new Set(toApiTools("admin", "pergunta", true).map((t) => t.name))
    for (const n of DOC_ONLY) expect(docPergunta.has(n), n).toBe(false)
  })

  it("perguntar_usuario (Fase 6, D3) — disponível em TODOS os modos, incl. 'pergunta' e docMode; kind='pergunta' não é mutação", () => {
    expect(TOOLS_BY_NAME.get("perguntar_usuario")?.kind).toBe("pergunta")
    for (const mode of ["agente", "pergunta", "plano"] as const) {
      expect(toApiTools("admin", mode).some((t) => t.name === "perguntar_usuario"), mode).toBe(true)
    }
    // dentro do editor (docMode) também sobrevive — não abre nenhuma capacidade extra de CRM
    expect(toApiTools("admin", "agente", true).some((t) => t.name === "perguntar_usuario")).toBe(true)
  })

  it("hides financial tools from the 'Equipe' (non-finance roles), keeps them for sócio/financeiro", () => {
    const FIN = ["financeiro_resumo", "listar_lancamentos", "inadimplencia", "dre", "listar_honorarios", "detalhe_honorario", "criar_lancamento", "pagar_lancamento", "editar_lancamento"]
    const nomes = (role: string) => new Set(toApiTools(role).map((t) => t.name))

    const equipe = nomes("staff")
    for (const n of FIN) expect(equipe.has(n)).toBe(false)
    // ferramentas não-financeiras seguem disponíveis para a Equipe
    expect(equipe.has("buscar")).toBe(true)
    expect(equipe.has("detalhe_cliente")).toBe(true)

    for (const role of ["socio", "financeiro", "admin"]) {
      const vis = nomes(role)
      for (const n of FIN) expect(vis.has(n)).toBe(true)
    }
    // exclusões (single + lote) e acerto continuam só para sócio (não financeiro)
    for (const n of ["acerto_socios", "excluir_lancamento", "excluir_lancamentos"]) {
      expect(nomes("financeiro").has(n), n).toBe(false)
      expect(nomes("socio").has(n), n).toBe(true)
    }
    // honorário = lançamento: editar/excluir usam as tools de lançamento
    expect(nomes("financeiro").has("editar_lancamento")).toBe(true)
    expect(nomes("admin").has("editar_honorario")).toBe(false)
    expect(nomes("admin").has("excluir_honorario")).toBe(false)
  })

  it("modo 'pergunta' (somente leitura) remove TODAS as ferramentas de mutação", () => {
    const all = toApiTools("admin")
    const pergunta = toApiTools("admin", "pergunta")
    const mutNames = new Set(TOOLS.filter((t) => t.kind === "mutation").map((t) => t.name))
    expect(mutNames.size).toBeGreaterThan(0)
    // nenhuma mutação no modo pergunta
    for (const t of pergunta) expect(mutNames.has(t.name), t.name).toBe(false)
    // as ferramentas de leitura/cliente continuam
    const perguntaNames = new Set(pergunta.map((t) => t.name))
    expect(perguntaNames.has("buscar")).toBe(true)
    expect(perguntaNames.has("navegar")).toBe(true)
    expect(perguntaNames.has("criar_tarefa")).toBe(false)
    // 'agente'/undefined mantém todas
    expect(toApiTools("admin", "agente").length).toBe(all.length)
    expect(pergunta.length).toBe(all.length - mutNames.size)
  })

  it("processosHabilitado=false remove por inteiro as ferramentas de Casos & Processos", () => {
    const on = new Set(toApiTools("admin").map((t) => t.name))
    const off = new Set(toApiTools("admin", "agente", false, false).map((t) => t.name))
    const PROCESSOS_SAMPLE = ["listar_casos", "criar_caso", "listar_processos", "criar_processo", "listar_prazos", "cumprir_prazo"]
    for (const n of PROCESSOS_SAMPLE) {
      expect(on.has(n), n).toBe(true)
      expect(off.has(n), n).toBe(false)
    }
    // ferramentas de outros módulos continuam disponíveis
    expect(off.has("buscar")).toBe(true)
    expect(off.has("criar_tarefa")).toBe(true)
    expect(off.size).toBeLessThan(on.size)
    // default (parâmetro omitido) mantém o módulo habilitado
    expect(toApiTools("admin").length).toBe(on.size)
  })

  it("expõe as tools de projetos e gateia a escrita (sócio/advogado), mantendo a leitura aberta", () => {
    const nomes = (role: string) => new Set(toApiTools(role).map((t) => t.name))
    // leitura disponível para todos (inclusive estagiário/staff)
    for (const role of ["estagiario", "staff", "advogado", "socio", "admin"]) {
      expect(nomes(role).has("listar_projetos"), role).toBe(true)
      expect(nomes(role).has("listar_templates_projeto"), role).toBe(true)
    }
    // criar/instanciar projeto: só sócio/advogado (+ admin implícito)
    const ESCRITA = ["criar_projeto", "instanciar_template_projeto"]
    for (const n of ESCRITA) {
      expect(nomes("estagiario").has(n)).toBe(false)
      expect(nomes("staff").has(n)).toBe(false)
      expect(nomes("financeiro").has(n)).toBe(false)
      for (const role of ["advogado", "socio", "admin"]) expect(nomes(role).has(n), `${role}:${n}`).toBe(true)
    }
  })
})

describe("sse encoder", () => {
  it("frames an event with name + JSON data", () => {
    expect(encodeSse({ type: "text", delta: "oi" })).toBe('event: text\ndata: {"type":"text","delta":"oi"}\n\n')
  })
})

describe("date helpers", () => {
  it("shifts ISO dates across month boundaries", () => {
    expect(addDiasISO("2026-06-12", 14)).toBe("2026-06-26")
    expect(addDiasISO("2026-01-31", 1)).toBe("2026-02-01")
    expect(addDiasISO("2026-03-01", -1)).toBe("2026-02-28")
  })
})
