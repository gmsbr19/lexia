// Guarda do segredo compartilhado do site (header `x-ncm-secret`) — usada SÓ
// por POST /api/lead. `LEXIA_SECRET` é lida de process.env via lib/env.ts, que
// congela o valor no import: por isso o env é setado ANTES do import dinâmico
// e o módulo é reimportado a cada cenário.
import { describe, expect, it, vi, beforeEach } from "vitest"

async function carregarGuarda(segredo: string | undefined) {
  vi.resetModules()
  if (segredo === undefined) delete process.env.LEXIA_SECRET
  else process.env.LEXIA_SECRET = segredo
  return (await import("@/lib/captacao/site-auth")).autenticadoPeloSite
}

const req = (headers: Record<string, string> = {}) => new Request("http://lexia:3000/api/lead", { method: "POST", headers })

beforeEach(() => {
  delete process.env.LEXIA_SECRET
})

describe("autenticadoPeloSite", () => {
  it("aceita o header igual byte a byte ao segredo", async () => {
    const guard = await carregarGuarda("s3gr3d0-do-site")
    expect(guard(req({ "x-ncm-secret": "s3gr3d0-do-site" }))).toBe(true)
  })

  it("recusa segredo errado, mesmo com o mesmo tamanho", async () => {
    const guard = await carregarGuarda("s3gr3d0-do-site")
    expect(guard(req({ "x-ncm-secret": "s3gr3d0-do-sitX" }))).toBe(false)
  })

  it("recusa prefixo/sufixo do segredo (tamanhos diferentes não lançam)", async () => {
    const guard = await carregarGuarda("s3gr3d0-do-site")
    expect(guard(req({ "x-ncm-secret": "s3gr3d0" }))).toBe(false)
    expect(guard(req({ "x-ncm-secret": "s3gr3d0-do-site-e-mais" }))).toBe(false)
  })

  it("recusa quando o header não veio", async () => {
    const guard = await carregarGuarda("s3gr3d0-do-site")
    expect(guard(req())).toBe(false)
  })

  it("NUNCA autentica quando LEXIA_SECRET não está configurada", async () => {
    const guard = await carregarGuarda(undefined)
    expect(guard(req({ "x-ncm-secret": "" }))).toBe(false)
    expect(guard(req({ "x-ncm-secret": "qualquer" }))).toBe(false)
    expect(guard(req())).toBe(false)
  })

  it("NUNCA autentica com segredo vazio dos dois lados", async () => {
    const guard = await carregarGuarda("")
    expect(guard(req({ "x-ncm-secret": "" }))).toBe(false)
  })

  it("é case-sensitive no valor do segredo", async () => {
    const guard = await carregarGuarda("SegredoDoSite")
    expect(guard(req({ "x-ncm-secret": "segredodosite" }))).toBe(false)
  })
})
