import { describe, expect, it } from "vitest"
import { conviteExpirado, gerarToken, hashToken, linkConvite } from "@/lib/users/convite"
import { renderEmailConvite } from "@/lib/users/convite-email"

describe("convite — helpers puros", () => {
  it("hashToken é sha256 hex determinístico e não revela o bruto", () => {
    const h = hashToken("abc")
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken("abc")).toBe(h)
    expect(hashToken("abd")).not.toBe(h)
    expect(h).not.toContain("abc")
  })

  it("gerarToken gera tokens url-safe e únicos", () => {
    const a = gerarToken()
    const b = gerarToken()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(a.length).toBeGreaterThanOrEqual(43) // 32 bytes em base64url
  })

  it("conviteExpirado compara contra o 'agora' informado", () => {
    const agora = new Date("2026-06-17T12:00:00Z")
    expect(conviteExpirado(new Date("2026-06-17T11:59:59Z"), agora)).toBe(true)
    expect(conviteExpirado(new Date("2026-06-17T12:00:01Z"), agora)).toBe(false)
  })

  it("linkConvite usa a origem como fallback e normaliza a barra final", () => {
    expect(linkConvite("tok", "https://app.lexia.com")).toBe("https://app.lexia.com/definir-senha/tok")
    expect(linkConvite("tok", "https://app.lexia.com/")).toBe("https://app.lexia.com/definir-senha/tok")
    expect(linkConvite("tok", null)).toBeNull()
  })
})

describe("renderEmailConvite", () => {
  it("inclui o CTA com a URL e o primeiro nome", () => {
    const r = renderEmailConvite({ nome: "João Silva", url: "https://app.lexia.com/definir-senha/xyz" })
    expect(r.subject).toBe("Você foi convidado para o LexIA")
    expect(r.html).toContain("https://app.lexia.com/definir-senha/xyz")
    expect(r.html).toContain("Criar meu acesso")
    expect(r.html).toContain("João")
    expect(r.text).toContain("https://app.lexia.com/definir-senha/xyz")
  })

  it("sem URL → sem CTA nem link", () => {
    const r = renderEmailConvite({ nome: "Maria", url: null })
    expect(r.html).not.toContain("Criar meu acesso")
    expect(r.text).not.toContain("https://")
  })

  it("escapa HTML do nome (sem injeção)", () => {
    const r = renderEmailConvite({ nome: "<b>x</b>", url: null })
    expect(r.html).not.toContain("<b>x</b>")
    expect(r.html).toContain("&lt;b&gt;")
  })
})
