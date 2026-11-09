import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { ForbiddenError, UserError } from "@/lib/errors"
import { defineTool } from "@/lib/lexia/agent/types"
import { executeTool, type ExecDeps } from "@/lib/mcp/exec"
import { RateLimitError } from "@/lib/rate-limit"
import { currentRequestOrigin, resolveRequestOrigin, withRequestOrigin } from "@/lib/request-origin"

const user = { email: "mcp@lexia.local", nome: "MCP", role: "admin" }
const signal = new AbortController().signal
const schema = z.object({ id: z.number() })

const leitura = defineTool({ name: "listar_x", description: "d", schema, kind: "readonly", run: async () => ({ n: 1 }) })
const mutacao = defineTool({
  name: "criar_lancamento",
  description: "d",
  schema,
  kind: "mutation",
  montarConfirmacao: async () => ({ resumo: "Criar lançamento de R$ 10,00" }),
  run: async () => ({ id: 7 }),
})

function deps(over: Partial<ExecDeps> = {}): ExecDeps & { audit: ReturnType<typeof vi.fn> } {
  return { audit: vi.fn(async () => {}), rateLimit: vi.fn(), ...over } as never
}
const body = (r: Awaited<ReturnType<typeof executeTool>>) => (r.content[0] as { text: string }).text

describe("executeTool", () => {
  it("audits a mutation as mcp.<name> with the input, and returns a readable resumo", async () => {
    const d = deps()
    const r = await executeTool(mutacao, { id: 3 }, user, signal, d)
    expect(r.isError).toBeUndefined()
    expect(d.audit).toHaveBeenCalledTimes(1)
    expect(d.audit).toHaveBeenCalledWith(
      "mcp@lexia.local",
      { action: "mcp.criar_lancamento", entity: "lancamento", payload: { id: 3 } },
      { id: 7 },
    )
    const out = JSON.parse(body(r))
    expect(out.resumo.resumo).toBe("Criar lançamento de R$ 10,00")
    expect(out.resultado).toEqual({ id: 7 })
  })

  it("does NOT audit reads", async () => {
    const d = deps()
    const r = await executeTool(leitura, { id: 1 }, user, signal, d)
    expect(d.audit).not.toHaveBeenCalled()
    expect(JSON.parse(body(r))).toEqual({ n: 1 })
  })

  it("a throwing montarConfirmacao never breaks the mutation", async () => {
    const t = defineTool({ ...mutacao, montarConfirmacao: async () => { throw new Error("boom") } } as never)
    const d = deps()
    const r = await executeTool(t, { id: 1 }, user, signal, d)
    expect(r.isError).toBeUndefined()
    expect(d.audit).toHaveBeenCalled()
  })

  it("falls back to the sync resumo", async () => {
    const t = defineTool({ name: "editar_y", description: "d", schema, kind: "mutation", resumo: () => "Editar Y", run: async () => ({ id: 1 }) })
    const out = JSON.parse(body(await executeTool(t, { id: 1 }, user, signal, deps())))
    expect(out.resumo.resumo).toBe("Editar Y")
  })

  it("does not audit a failed mutation; maps PT-BR errors and hides unknown ones", async () => {
    const falha = (e: unknown) => defineTool({ name: "excluir_z", description: "d", schema, kind: "mutation", run: async () => { throw e } })
    for (const [err, msg] of [
      [new UserError("Valor inválido"), "Valor inválido"],
      [new ForbiddenError("nope"), "nope"],
      [new RateLimitError("devagar"), "devagar"],
    ] as const) {
      const d = deps()
      const r = await executeTool(falha(err), { id: 1 }, user, signal, d)
      expect(r.isError).toBe(true)
      expect(body(r)).toBe(msg)
      expect(d.audit).not.toHaveBeenCalled()
    }
    const r = await executeTool(falha(new Error("prisma P2002 secret stack")), { id: 1 }, user, signal, deps())
    expect(r.isError).toBe(true)
    expect(body(r)).not.toMatch(/prisma|secret/)
  })

  it("role gate (defense in depth) and rate limit run before the tool", async () => {
    const run = vi.fn(async () => ({}))
    const restrita = defineTool({ name: "criar_r", description: "d", schema, kind: "mutation", roles: ["socio"], run })
    const d = deps()
    const r = await executeTool(restrita, { id: 1 }, { ...user, role: "staff" }, signal, d)
    expect(r.isError).toBe(true)
    expect(run).not.toHaveBeenCalled()
    const rl = deps({ rateLimit: () => { throw new RateLimitError("limite") } })
    expect(body(await executeTool(leitura, { id: 1 }, user, signal, rl))).toBe("limite")
  })
})

describe("request origin wrapping (notification links)", () => {
  it("makes the public origin available to async code during a call", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      headers: { "x-forwarded-host": "lexia.ncm.adv.br", "x-forwarded-proto": "https" },
    })
    expect(currentRequestOrigin()).toBeNull()
    const seen = await withRequestOrigin(resolveRequestOrigin(req), async () => {
      await Promise.resolve()
      return currentRequestOrigin()
    })
    expect(seen).toBe("https://lexia.ncm.adv.br")
  })
})
