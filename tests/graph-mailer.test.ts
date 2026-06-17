import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

// As vars GRAPH_* precisam existir ANTES de env.ts ser avaliado. Por isso o
// import do mailer é dinâmico, dentro do beforeAll, depois de setar o process.env.
let getMailer: typeof import("@/lib/notificacoes/email/mailer").getMailer
let resetTokenCache: typeof import("@/lib/graph/token")._resetGraphTokenCache

function res(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response
}

const tokenOk = () => res(200, { access_token: "tok-abc", expires_in: 3600 })

beforeAll(async () => {
  process.env.MAIL_PROVIDER = "graph"
  process.env.GRAPH_TENANT_ID = "tenant-1"
  process.env.GRAPH_CLIENT_ID = "client-1"
  process.env.GRAPH_CLIENT_SECRET = "secret-1"
  process.env.GRAPH_MAIL_SENDER = "no-reply@x.test"
  ;({ getMailer } = await import("@/lib/notificacoes/email/mailer"))
  ;({ _resetGraphTokenCache: resetTokenCache } = await import("@/lib/graph/token"))
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetTokenCache()
})

const MSG = { to: "dest@x.test", subject: "Oi", html: "<p>olá</p>", text: "olá" }

describe("graphMailer (getMailer com MAIL_PROVIDER=graph)", () => {
  it("o backend selecionado está ativo", () => {
    expect(getMailer().ativo).toBe(true)
  })

  it("pega token e faz POST sendMail com o payload correto", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(tokenOk()).mockResolvedValueOnce(res(202))
    vi.stubGlobal("fetch", fetchMock)

    await getMailer().enviar(MSG)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const tokenUrl = fetchMock.mock.calls[0][0] as string
    expect(tokenUrl).toContain("login.microsoftonline.com/tenant-1/oauth2/v2.0/token")

    const sendUrl = fetchMock.mock.calls[1][0] as string
    expect(sendUrl).toBe("https://graph.microsoft.com/v1.0/users/no-reply%40x.test/sendMail")
    const sendInit = fetchMock.mock.calls[1][1] as RequestInit
    expect((sendInit.headers as Record<string, string>).Authorization).toBe("Bearer tok-abc")

    const payload = JSON.parse(sendInit.body as string)
    expect(payload.message.subject).toBe("Oi")
    expect(payload.message.body).toEqual({ contentType: "HTML", content: "<p>olá</p>" })
    expect(payload.message.toRecipients).toEqual([{ emailAddress: { address: "dest@x.test" } }])
    expect(payload.saveToSentItems).toBe(true)
  })

  it("cacheia o token entre envios (token endpoint chamado 1x)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(tokenOk()).mockResolvedValue(res(202))
    vi.stubGlobal("fetch", fetchMock)

    await getMailer().enviar(MSG)
    await getMailer().enviar(MSG)

    // 1 token + 2 sendMail = 3 chamadas (token não é refeito).
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const tokenCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/oauth2/v2.0/token"))
    expect(tokenCalls).toHaveLength(1)
  })

  it("aceita múltiplos destinatários separados por vírgula", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(tokenOk()).mockResolvedValueOnce(res(202))
    vi.stubGlobal("fetch", fetchMock)

    await getMailer().enviar({ ...MSG, to: "a@x.test, b@x.test" })

    const payload = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    expect(payload.message.toRecipients).toEqual([
      { emailAddress: { address: "a@x.test" } },
      { emailAddress: { address: "b@x.test" } },
    ])
  })

  it("sendMail ≠2xx lança erro com o status", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(tokenOk()).mockResolvedValueOnce(res(400, "boom"))
    vi.stubGlobal("fetch", fetchMock)

    await expect(getMailer().enviar(MSG)).rejects.toThrow(/400/)
  })
})
