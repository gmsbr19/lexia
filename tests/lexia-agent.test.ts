import { describe, expect, it } from "vitest"
import { decidirModelo } from "@/lib/lexia/agent/router"
import { validarRota } from "@/lib/lexia/agent/tools/navegacao"
import { TOOLS, TOOLS_BY_NAME, toApiTools } from "@/lib/lexia/agent/registry"
import { encodeSse } from "@/lib/lexia/agent/sse"
import { addDiasISO } from "@/lib/lexia/agent/datas"

describe("router — model selection (equilibrado: de-stickified, narrow Opus)", () => {
  it("routes greetings to Haiku without tools", () => {
    const d = decidirModelo("Oi, tudo bem?")
    expect(d.model).toBe("claude-haiku-4-5")
    expect(d.useTools).toBe(false)
    expect(d.effort).toBeUndefined()
  })

  it("routes genuine drafting to Opus at medium effort with a bounded output cap", () => {
    const d = decidirModelo("Pode redigir uma minuta de petição inicial?")
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

  it("only very long messages (>1200 chars) escalate to Opus", () => {
    expect(decidirModelo("a".repeat(700)).model).toBe("claude-sonnet-4-6")
    expect(decidirModelo("a".repeat(1300)).model).toBe("claude-opus-4-8")
  })

  it("attachments use Sonnet (vision) unless the ask is heavy drafting", () => {
    expect(decidirModelo("o que diz esse documento?", null, { temAnexos: true }).model).toBe("claude-sonnet-4-6")
    expect(decidirModelo("redija um parecer a partir deste anexo", null, { temAnexos: true }).model).toBe("claude-opus-4-8")
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

  it("generates object-typed JSON schemas for every tool (admin sees all)", () => {
    const api = toApiTools("admin")
    expect(api.length).toBe(TOOLS.length)
    for (const t of api) {
      expect(t.input_schema.type).toBe("object")
      expect((t.description ?? "").length).toBeGreaterThan(0)
    }
  })

  it("hides financial tools from the 'Equipe' (non-finance roles), keeps them for sócio/financeiro", () => {
    const FIN = ["financeiro_resumo", "listar_lancamentos", "inadimplencia", "dre", "listar_honorarios", "detalhe_honorario", "criar_lancamento", "pagar_lancamento"]
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
    // 'acerto_socios'/'excluir_lancamento' continuam só para sócio (não financeiro)
    expect(nomes("financeiro").has("acerto_socios")).toBe(false)
    expect(nomes("socio").has("acerto_socios")).toBe(true)
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
