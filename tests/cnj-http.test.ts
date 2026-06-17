import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchJsonComRetry, HttpError } from "@/lib/processos/cnj/http"

function res(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response
}

// backoff de ~1ms, sem jitter, 3 tentativas — testes rápidos e determinísticos.
const fast = { baseMs: 1, jitter: () => 0, tentativas: 3 }

afterEach(() => vi.unstubAllGlobals())

describe("fetchJsonComRetry", () => {
  it("retorna o JSON no sucesso (1 chamada)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, { n: 7 }))
    vi.stubGlobal("fetch", fetchMock)
    const out = await fetchJsonComRetry<{ n: number }>("https://x.test/a", { method: "GET" }, fast)
    expect(out.n).toBe(7)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("retenta em 429 e depois sucede", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(200, { ok: true }))
    vi.stubGlobal("fetch", fetchMock)
    await fetchJsonComRetry("https://x.test/a", {}, fast)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("4xx terminal (404) NÃO retenta e lança HttpError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(404, "não encontrado"))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchJsonComRetry("https://x.test/a", {}, fast)).rejects.toBeInstanceOf(HttpError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("esgota as tentativas em 5xx e lança", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(500))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchJsonComRetry("https://x.test/a", {}, fast)).rejects.toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("retenta em falha de rede e sucede", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("ECONNRESET")).mockResolvedValueOnce(res(200, { ok: true }))
    vi.stubGlobal("fetch", fetchMock)
    await fetchJsonComRetry("https://x.test/a", {}, fast)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
