import { describe, expect, it } from "vitest"
import { mcpTokenOk, originOk, tokenCandidates } from "@/lib/mcp/auth"

const TOKEN = "a".repeat(32) + "0123456789abcdef"
const req = (headers: Record<string, string> = {}, url = "https://lexia.ncm.adv.br/api/mcp") =>
  new Request(url, { method: "POST", headers })

describe("mcpTokenOk", () => {
  it("accepts the right token in each header form", () => {
    expect(mcpTokenOk(req({ authorization: `Bearer ${TOKEN}` }), TOKEN)).toBe(true)
    expect(mcpTokenOk(req({ authorization: `bearer   ${TOKEN}` }), TOKEN)).toBe(true)
    expect(mcpTokenOk(req({ authorization: TOKEN }), TOKEN)).toBe(true) // no prefix
    expect(mcpTokenOk(req({ "x-api-key": TOKEN }), TOKEN)).toBe(true)
    expect(mcpTokenOk(req({ "x-auth-token": TOKEN }), TOKEN)).toBe(true)
  })
  it("accepts the token as the last path segment (incl. percent-encoded)", () => {
    expect(mcpTokenOk(req({}, `https://x.test/api/mcp/${TOKEN}`), TOKEN)).toBe(true)
    expect(mcpTokenOk(req({}, `https://x.test/api/mcp/${encodeURIComponent("ab/c+d=")}`), "ab/c+d=")).toBe(true)
  })
  it("rejects wrong, missing, same-length-but-different and prefix tokens", () => {
    expect(mcpTokenOk(req(), TOKEN)).toBe(false)
    expect(mcpTokenOk(req({ authorization: "Bearer nope" }), TOKEN)).toBe(false)
    expect(mcpTokenOk(req({ authorization: `Bearer ${"b".repeat(TOKEN.length)}` }), TOKEN)).toBe(false)
    expect(mcpTokenOk(req({ authorization: `Bearer ${TOKEN.slice(0, -1)}` }), TOKEN)).toBe(false)
    expect(mcpTokenOk(req({ authorization: `Bearer ${TOKEN}x` }), TOKEN)).toBe(false)
    expect(mcpTokenOk(req({}, "https://x.test/api/mcp/wrong"), TOKEN)).toBe(false)
  })
  it("a wrong header does not block a right path token (any accepted form wins)", () => {
    expect(mcpTokenOk(req({ authorization: "Bearer bad" }, `https://x.test/api/mcp/${TOKEN}`), TOKEN)).toBe(true)
  })
  it("empty/undefined expected token ALWAYS denies", () => {
    expect(mcpTokenOk(req({ authorization: "Bearer " }), "")).toBe(false)
    expect(mcpTokenOk(req({ authorization: "Bearer x" }), undefined)).toBe(false)
    expect(mcpTokenOk(req({ "x-api-key": "" }), "")).toBe(false)
    expect(mcpTokenOk(req({}, "https://x.test/api/mcp/"), "")).toBe(false)
  })
  it("the bare route segment is only a candidate, never a free pass", () => {
    expect(tokenCandidates(req())).toEqual(["mcp"])
    expect(mcpTokenOk(req(), TOKEN)).toBe(false)
  })
})

describe("originOk", () => {
  it("allows requests without Origin (server-to-server)", () => {
    expect(originOk(req())).toBe(true)
  })
  it("allows Origin equal to host / x-forwarded-host", () => {
    expect(originOk(req({ origin: "https://lexia.ncm.adv.br", host: "lexia.ncm.adv.br" }))).toBe(true)
    expect(originOk(req({ origin: "https://abc.ngrok.app", host: "localhost:3000", "x-forwarded-host": "abc.ngrok.app" }))).toBe(true)
  })
  it("rejects a foreign or malformed Origin", () => {
    expect(originOk(req({ origin: "https://evil.example", host: "lexia.ncm.adv.br" }))).toBe(false)
    expect(originOk(req({ origin: "not a url", host: "lexia.ncm.adv.br" }))).toBe(false)
    expect(originOk(req({ origin: "https://lexia.ncm.adv.br", host: "localhost:3000", "x-forwarded-host": "other.test" }))).toBe(false)
  })
  it("allows the Claude connector origins (the real cause of the connector failing)", () => {
    expect(originOk(req({ origin: "https://claude.ai", host: "lexia.ncm.adv.br" }))).toBe(true)
    expect(originOk(req({ origin: "https://claude.com", host: "lexia.ncm.adv.br" }))).toBe(true)
    expect(originOk(req({ origin: "https://api.anthropic.com", host: "lexia.ncm.adv.br" }))).toBe(true)
    expect(originOk(req({ origin: "https://CLAUDE.AI", host: "lexia.ncm.adv.br" }))).toBe(true)
  })
  it("a lookalike domain does NOT pass (the leading dot matters)", () => {
    expect(originOk(req({ origin: "https://evilclaude.ai", host: "lexia.ncm.adv.br" }))).toBe(false)
    expect(originOk(req({ origin: "https://claude.ai.evil.test", host: "lexia.ncm.adv.br" }))).toBe(false)
  })
  it("honours extra origins handed in from the env", () => {
    expect(originOk(req({ origin: "https://proxy.test", host: "lexia.ncm.adv.br" }), "proxy.test, outro.test")).toBe(true)
    expect(originOk(req({ origin: "https://nao.test", host: "lexia.ncm.adv.br" }), "proxy.test")).toBe(false)
  })
})
