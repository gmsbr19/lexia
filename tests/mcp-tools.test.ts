import { describe, expect, it } from "vitest"
import { z } from "zod"
import { TOOLS, toApiTools } from "@/lib/lexia/agent/registry"
import { annotationsFor, exposableKind, selectMcpTools } from "@/lib/mcp/tools"

describe("MCP tool surface", () => {
  it("registry has 89 tools; 84 are exposable (client + pergunta excluded)", () => {
    expect(TOOLS).toHaveLength(89)
    const exposable = TOOLS.filter(exposableKind)
    expect(exposable).toHaveLength(84)
    expect(exposable.filter((t) => t.kind === "readonly")).toHaveLength(30)
    expect(exposable.filter((t) => t.kind === "mutation")).toHaveLength(54)
    expect(TOOLS.filter((t) => t.kind === "client")).toHaveLength(4)
    expect(TOOLS.filter((t) => t.kind === "pergunta")).toHaveLength(1)
  })

  it("admin sees all 84; never a client/pergunta tool", () => {
    const tools = selectMcpTools("admin", true)
    expect(tools).toHaveLength(84)
    expect(tools.some((t) => t.kind === "client" || t.kind === "pergunta")).toBe(false)
    expect(tools.some((t) => t.name === "navegar" || t.name === "perguntar_usuario")).toBe(false)
  })

  it("role filtering mirrors toApiTools (single source of truth)", () => {
    for (const role of ["admin", "socio", "advogado", "estagiario", "financeiro", "staff"]) {
      for (const proc of [true, false]) {
        const mcp = selectMcpTools(role, proc)
          .map((t) => t.name)
          .sort()
        const api = toApiTools(role, undefined, false, proc)
          .map((t) => t.name)
          .filter((n) => exposableKind(TOOLS.find((t) => t.name === n)!))
          .sort()
        expect(mcp).toEqual(api)
      }
    }
    expect(selectMcpTools("staff", true).length).toBeLessThan(selectMcpTools("admin", true).length)
  })

  it("Processos kill-switch removes the processos tools but keeps casos", () => {
    const on = selectMcpTools("admin", true).map((t) => t.name)
    const off = selectMcpTools("admin", false).map((t) => t.name)
    expect(off.length).toBeLessThan(on.length)
    expect(off.some((n) => n.includes("caso"))).toBe(true)
  })

  it("annotations: readOnly for readonly, destructive for excluir*/anonimizar*", () => {
    for (const t of selectMcpTools("admin", true)) {
      const a = annotationsFor(t)
      expect(a.readOnlyHint).toBe(t.kind === "readonly")
      expect(a.destructiveHint).toBe(t.kind === "mutation" && /^(excluir|anonimizar)/.test(t.name))
      expect(a.title.length).toBeGreaterThan(0)
    }
    const destructive = selectMcpTools("admin", true).filter((t) => annotationsFor(t).destructiveHint)
    expect(destructive.length).toBeGreaterThan(0)
    expect(destructive.every((t) => /^(excluir|anonimizar)/.test(t.name))).toBe(true)
  })

  it("JSON Schema is generated for every exposed tool without throwing", () => {
    for (const t of selectMcpTools("admin", true)) {
      const js = z.toJSONSchema(t.schema) as { type?: string }
      expect(js.type).toBe("object")
      expect(() => z.toJSONSchema(t.schema)).not.toThrow()
    }
  })
})
