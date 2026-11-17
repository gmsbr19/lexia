import { describe, expect, it } from "vitest"
import {
  ACCESS_TTL_S,
  SCOPE_PADRAO,
  bearerDoHeader,
  desafioS256,
  expiraEmSegundos,
  expirou,
  gerarSegredo,
  hashToken,
  igualSeguro,
  metadataRecursoProtegido,
  metadataServidorAutorizacao,
  parsearRedirects,
  pkceConfere,
  recursoCanonico,
  recursoConfere,
  redirectRegistrado,
  redirectUriPermitido,
  semBarraFinal,
  serializarRedirects,
  urlDeRetorno,
  urlMetadataRecurso,
  wwwAuthenticate,
} from "@/lib/oauth/core"

const BASE = "https://lexia.ncm.adv.br"
const CALLBACK = "https://claude.ai/api/mcp/auth_callback"

describe("hashes e segredos", () => {
  it("hashToken é determinístico e sensível à entrada", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"))
    expect(hashToken("abc")).not.toBe(hashToken("abd"))
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/)
  })

  it("gerarSegredo devolve valor url-safe e não repetido", () => {
    const a = gerarSegredo()
    const b = gerarSegredo()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("igualSeguro compara conteúdo, não tamanho", () => {
    expect(igualSeguro("abc", "abc")).toBe(true)
    expect(igualSeguro("abc", "abcd")).toBe(false)
    expect(igualSeguro("abc", "abd")).toBe(false)
  })
})

describe("PKCE S256", () => {
  // Vetor de teste do RFC 7636 (apêndice B): garante que o nosso S256 é o S256
  // do mundo, não uma variante nossa (um erro aqui quebra qualquer cliente).
  it("bate com o vetor do RFC 7636", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    expect(desafioS256(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
    expect(pkceConfere(verifier, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")).toBe(true)
  })

  it("recusa verifier errado", () => {
    const verifier = "a".repeat(43)
    expect(pkceConfere("b".repeat(43), desafioS256(verifier))).toBe(false)
  })

  it("recusa verifier fora do tamanho do RFC, mesmo que o hash casasse", () => {
    const curto = "a".repeat(42)
    expect(pkceConfere(curto, desafioS256(curto))).toBe(false)
    const longo = "a".repeat(129)
    expect(pkceConfere(longo, desafioS256(longo))).toBe(false)
  })

  it("recusa verifier com caractere fora do alfabeto", () => {
    const ruim = `${"a".repeat(42)}$`
    expect(pkceConfere(ruim, desafioS256(ruim))).toBe(false)
  })
})

describe("recurso canônico (RFC 8707)", () => {
  it("normaliza a barra final", () => {
    expect(semBarraFinal(`${BASE}/`)).toBe(BASE)
    expect(semBarraFinal(`${BASE}///`)).toBe(BASE)
    expect(recursoCanonico(`${BASE}/`)).toBe(`${BASE}/api/mcp`)
  })

  it("aceita a URI canônica, a raiz e a variante com barra; recusa outro host", () => {
    expect(recursoConfere(`${BASE}/api/mcp`, BASE)).toBe(true)
    expect(recursoConfere(`${BASE}/api/mcp/`, BASE)).toBe(true)
    expect(recursoConfere(BASE, BASE)).toBe(true)
    expect(recursoConfere("https://outro.example/api/mcp", BASE)).toBe(false)
    expect(recursoConfere(`${BASE}/api/outra-coisa`, BASE)).toBe(false)
  })

  it("resource ausente passa (cliente que não manda o campo)", () => {
    expect(recursoConfere(undefined, BASE)).toBe(true)
    expect(recursoConfere(null, BASE)).toBe(true)
  })
})

describe("allowlist de redirect_uri", () => {
  it("aceita o callback dos aplicativos do Claude", () => {
    expect(redirectUriPermitido(CALLBACK)).toBe(true)
    expect(redirectUriPermitido("https://claude.com/api/mcp/auth_callback")).toBe(true)
    expect(redirectUriPermitido("https://app.claude.ai/api/mcp/auth_callback")).toBe(true)
  })

  it("recusa domínio parecido e caminho diferente no domínio certo", () => {
    expect(redirectUriPermitido("https://evilclaude.ai/api/mcp/auth_callback")).toBe(false)
    expect(redirectUriPermitido("https://claude.ai.attacker.example/api/mcp/auth_callback")).toBe(false)
    expect(redirectUriPermitido("https://claude.ai/qualquer/outro")).toBe(false)
  })

  it("aceita loopback (clientes locais) e recusa http em host público", () => {
    expect(redirectUriPermitido("http://localhost:7777/callback")).toBe(true)
    expect(redirectUriPermitido("http://127.0.0.1:1410/oauth/callback")).toBe(true)
    expect(redirectUriPermitido("http://exemplo.com/callback")).toBe(false)
  })

  it("recusa fragmento e lixo", () => {
    expect(redirectUriPermitido(`${CALLBACK}#x`)).toBe(false)
    expect(redirectUriPermitido("não-é-url")).toBe(false)
    expect(redirectUriPermitido("")).toBe(false)
  })

  it("aceita o que o administrador liberou literalmente", () => {
    const extras = "https://proxy.escritorio.example/cb, https://outro.example/cb"
    expect(redirectUriPermitido("https://proxy.escritorio.example/cb", extras)).toBe(true)
    expect(redirectUriPermitido("https://proxy.escritorio.example/outro", extras)).toBe(false)
  })
})

describe("redirect registrado (comparação exata)", () => {
  it("casa só a URI idêntica, nunca por prefixo", () => {
    const guardadas = serializarRedirects([CALLBACK, "http://localhost:9/cb"])
    expect(parsearRedirects(guardadas)).toHaveLength(2)
    expect(redirectRegistrado(CALLBACK, guardadas)).toBe(true)
    expect(redirectRegistrado(`${CALLBACK}2`, guardadas)).toBe(false)
    expect(redirectRegistrado("https://claude.ai/api/mcp", guardadas)).toBe(false)
  })
})

describe("url de retorno", () => {
  it("acrescenta code/state e preserva a query da própria URI", () => {
    const url = urlDeRetorno("https://claude.ai/api/mcp/auth_callback?x=1", { code: "C1", state: "S1", iss: BASE })
    const u = new URL(url)
    expect(u.searchParams.get("x")).toBe("1")
    expect(u.searchParams.get("code")).toBe("C1")
    expect(u.searchParams.get("state")).toBe("S1")
    expect(u.searchParams.get("iss")).toBe(BASE)
  })

  it("ignora parâmetro ausente (sem state não escreve state=undefined)", () => {
    const u = new URL(urlDeRetorno(CALLBACK, { error: "access_denied", state: undefined }))
    expect(u.searchParams.get("error")).toBe("access_denied")
    expect(u.searchParams.has("state")).toBe(false)
  })
})

describe("metadados", () => {
  it("issuer é idêntico à base (sem barra final) — se divergir o cliente recusa o documento", () => {
    const m = metadataServidorAutorizacao(`${BASE}/`)
    expect(m.issuer).toBe(BASE)
    expect(m.authorization_endpoint).toBe(`${BASE}/oauth/authorize`)
    expect(m.token_endpoint).toBe(`${BASE}/oauth/token`)
    expect(m.registration_endpoint).toBe(`${BASE}/oauth/register`)
  })

  it("anuncia só S256 e os dois grants do fluxo", () => {
    const m = metadataServidorAutorizacao(BASE)
    expect(m.code_challenge_methods_supported).toEqual(["S256"])
    expect(m.grant_types_supported).toEqual(["authorization_code", "refresh_token"])
    expect(m.response_types_supported).toEqual(["code"])
  })

  it("recurso protegido aponta para o próprio Lexia como servidor de autorização", () => {
    const m = metadataRecursoProtegido(BASE)
    expect(m.resource).toBe(`${BASE}/api/mcp`)
    expect(m.authorization_servers).toEqual([BASE])
    expect(m.scopes_supported).toEqual([SCOPE_PADRAO])
  })

  it("a URL do metadata é a forma path-aware do RFC 9728", () => {
    expect(urlMetadataRecurso(BASE)).toBe(`${BASE}/.well-known/oauth-protected-resource/api/mcp`)
  })
})

describe("WWW-Authenticate", () => {
  it("traz o resource_metadata e o escopo", () => {
    const h = wwwAuthenticate(BASE)
    expect(h.startsWith("Bearer ")).toBe(true)
    expect(h).toContain(`resource_metadata="${BASE}/.well-known/oauth-protected-resource/api/mcp"`)
    expect(h).toContain(`scope="${SCOPE_PADRAO}"`)
    expect(h).not.toContain("error=")
  })

  it("com token inválido, o erro vem primeiro", () => {
    const h = wwwAuthenticate(BASE, "invalid_token")
    expect(h).toBe(
      `Bearer error="invalid_token", resource_metadata="${BASE}/.well-known/oauth-protected-resource/api/mcp", scope="${SCOPE_PADRAO}"`,
    )
  })
})

describe("bearer do header", () => {
  it("extrai o token e tolera o case do esquema", () => {
    expect(bearerDoHeader("Bearer abc")).toBe("abc")
    expect(bearerDoHeader("bearer  abc  ")).toBe("abc")
  })

  it("devolve null quando não há token", () => {
    expect(bearerDoHeader(null)).toBeNull()
    expect(bearerDoHeader("Bearer")).toBeNull()
    expect(bearerDoHeader("Basic abc")).toBeNull()
    expect(bearerDoHeader("")).toBeNull()
  })
})

describe("validade", () => {
  it("expirou compara com o instante dado", () => {
    const agora = new Date("2026-11-17T12:00:00Z")
    expect(expirou(new Date("2026-11-17T11:59:59Z"), agora)).toBe(true)
    expect(expirou(new Date("2026-11-17T12:00:01Z"), agora)).toBe(false)
    // Limite exato conta como expirado (nunca aceita um token no milissegundo da morte).
    expect(expirou(agora, agora)).toBe(true)
  })

  it("expiraEmSegundos soma a partir do instante dado", () => {
    const agora = new Date("2026-11-17T12:00:00Z")
    expect(expiraEmSegundos(ACCESS_TTL_S, agora).toISOString()).toBe("2026-11-17T13:00:00.000Z")
  })
})
