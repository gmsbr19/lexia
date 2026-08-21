// Núcleo PURO do intake do site institucional (POST /api/lead): tradução do
// contrato do site → shape interno de captação, e o envelope cru que preserva
// tudo que ainda não tem coluna. Sem Prisma/rede.
import { describe, expect, it } from "vitest"
import { dataEnvioSegura, envelopeCru, mapearSiteLead } from "@/lib/captacao/site-lead"
import { siteLeadSchema } from "@/lib/captacao/schemas"
import { derivarCaptacaoKey } from "@/lib/captacao/core"

// Corpo exatamente como o proxy do site envia (§"Contrato do corpo").
const CORPO = {
  origem: "servico-inventario",
  tipo: "opcional, pode não vir",
  nome: "Maria Teste",
  telefone: "11987654321",
  telefone_e164: "+5511987654321",
  triagem: { falecimento: "Há menos de 60 dias", acordo_herdeiros: "Sim, todos estão de acordo" },
  atribuicao: {
    gclid: "abc123",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "camp-inventario",
    pagina_entrada: "/servicos/inventario",
    capturado_em: "2026-08-20T19:00:00.000Z",
  },
  consentimento: { medicao: true, publicidade: false, versao: 1, decidido_em: "2026-08-20T19:01:00.000Z" },
  pagina: "/servicos/inventario",
  cliente: {},
  enviado_em: "2026-08-20T19:01:05.000Z",
}

describe("siteLeadSchema", () => {
  it("aceita o corpo completo do contrato", () => {
    expect(siteLeadSchema.safeParse(CORPO).success).toBe(true)
  })

  it("aceita o corpo mínimo do critério de aceite (só origem/nome/telefone)", () => {
    const r = siteLeadSchema.safeParse({ origem: "teste", nome: "Teste Aceite", telefone: "11999998888" })
    expect(r.success).toBe(true)
  })

  it("não exige nenhum campo documentado como opcional", () => {
    expect(siteLeadSchema.safeParse({ nome: "Só o nome" }).success).toBe(true)
  })

  it("rejeita corpo sem nome (vira 400, nunca 500)", () => {
    expect(siteLeadSchema.safeParse({}).success).toBe(false)
    expect(siteLeadSchema.safeParse({ nome: "" }).success).toBe(false)
  })

  it("tolera objetos livres com chaves e tipos desconhecidos", () => {
    const r = siteLeadSchema.safeParse({
      nome: "X",
      triagem: { qualquer_chave_nova: "v", numerica: 3 },
      atribuicao: { msclkid: "m1", fbclid: "f1", desconhecido: { aninhado: true } },
      consentimento: { medicao: false, publicidade: true, versao: 2 },
    })
    expect(r.success).toBe(true)
  })
})

describe("mapearSiteLead", () => {
  const input = mapearSiteLead(CORPO)

  it("mapeia contato (sem e-mail — o site não coleta)", () => {
    expect(input.contato).toEqual({ nome: "Maria Teste", telefone: "11987654321", email: null })
  })

  it("achata utm_* para o shape aninhado interno", () => {
    expect(input.atribuicao?.utm).toMatchObject({ source: "google", medium: "cpc", campaign: "camp-inventario" })
    expect(input.atribuicao?.gclid).toBe("abc123")
  })

  it("usa pagina_entrada como landing page e capturado_em como cliqueEm", () => {
    expect(input.atribuicao?.landingPage).toBe("/servicos/inventario")
    expect(input.atribuicao?.cliqueEm).toBe("2026-08-20T19:00:00.000Z")
  })

  it("cai para `pagina` quando não há pagina_entrada", () => {
    const r = mapearSiteLead({ nome: "X", pagina: "/home", atribuicao: {} })
    expect(r.atribuicao?.landingPage).toBe("/home")
  })

  it("traduz consentimento: `medicao` é o que habilita atribuição; versão vira texto", () => {
    expect(input.consentimento).toEqual({ aceito: true, versao: "1", em: "2026-08-20T19:01:00.000Z" })
  })

  it("consentimento ainda não decidido ({}) não vira consentimento aceito", () => {
    expect(mapearSiteLead({ nome: "X", consentimento: {} }).consentimento).toBeNull()
  })

  it("medicao=false registra a decisão sem aceitar", () => {
    const r = mapearSiteLead({ nome: "X", consentimento: { medicao: false, publicidade: true, decidido_em: "2026-08-20T19:01:00.000Z" } })
    expect(r.consentimento).toMatchObject({ aceito: false })
  })

  it("mantém só valores escalares na triagem", () => {
    const r = mapearSiteLead({ nome: "X", triagem: { a: "s", b: 2, c: true, d: { x: 1 }, e: null } })
    expect(r.triagem).toEqual({ a: "s", b: 2, c: true })
  })

  it("não explode com campos opcionais ausentes", () => {
    const r = mapearSiteLead({ nome: "Só nome" })
    expect(r.contato.nome).toBe("Só nome")
    expect(r.contato.telefone).toBeNull()
    expect(r.triagem).toBeNull()
    expect(r.consentimento).toBeNull()
  })

  it("cai para telefone_e164 quando `telefone` não veio", () => {
    expect(mapearSiteLead({ nome: "X", telefone_e164: "+5511987654321" }).contato.telefone).toBe("+5511987654321")
  })

  it("ignora atribuicao/triagem de tipo errado em vez de quebrar", () => {
    const r = mapearSiteLead({ nome: "X", atribuicao: "lixo", triagem: ["a"] })
    expect(r.atribuicao?.gclid).toBeNull()
    expect(r.triagem).toBeNull()
  })
})

describe("envelopeCru", () => {
  it("preserva atribuicao e consentimento exatamente como recebidos", () => {
    const env = JSON.parse(envelopeCru(CORPO) as string)
    expect(env.atribuicao).toEqual(CORPO.atribuicao)
    expect(env.consentimento).toEqual(CORPO.consentimento)
  })

  it("preserva chaves que não têm coluna dedicada (msclkid/fbclid/tipo/cliente)", () => {
    const body = { nome: "X", tipo: "t", cliente: { a: 1 }, atribuicao: { msclkid: "m", fbclid: "f" } }
    const env = JSON.parse(envelopeCru(body) as string)
    expect(env.atribuicao).toEqual({ msclkid: "m", fbclid: "f" })
    expect(env.tipo).toBe("t")
    expect(env.cliente).toEqual({ a: 1 })
  })

  it("não duplica PII que já tem coluna, nem guarda o honeypot", () => {
    const env = JSON.parse(envelopeCru(CORPO) as string)
    expect(env.nome).toBeUndefined()
    expect(env.telefone).toBeUndefined()
    expect(env.telefone_e164).toBeUndefined()
    expect(JSON.parse(envelopeCru({ nome: "X", site: "bot", origem: "o" }) as string).site).toBeUndefined()
  })

  it("devolve null quando não sobra nada", () => {
    expect(envelopeCru({ nome: "X", telefone: "11999998888" })).toBeNull()
  })
})

describe("dataEnvioSegura", () => {
  const agora = new Date("2026-08-20T19:01:10.000Z")

  it("usa o enviado_em do site quando plausível", () => {
    expect(dataEnvioSegura("2026-08-20T19:01:05.000Z", agora).toISOString()).toBe("2026-08-20T19:01:05.000Z")
  })

  it("cai para agora quando ausente ou inválido", () => {
    expect(dataEnvioSegura(undefined, agora)).toBe(agora)
    expect(dataEnvioSegura("não é data", agora)).toBe(agora)
    expect(dataEnvioSegura(12345, agora)).toBe(agora)
  })

  it("recusa data absurda — ocorreuEm nunca é recalculado, e a janela do Google é de 90 dias", () => {
    expect(dataEnvioSegura("2020-01-01T00:00:00.000Z", agora)).toBe(agora)
    expect(dataEnvioSegura("2030-01-01T00:00:00.000Z", agora)).toBe(agora)
  })
})

describe("derivarCaptacaoKey — namespace de fonte", () => {
  const fallback = { telefone: "11987654321", email: null, diaISO: "2026-08-20" }

  it("mantém a chave das landing pages byte a byte (id numérico)", () => {
    expect(derivarCaptacaoKey(7, null, fallback)).toBe("lp:7:fallback:+5511987654321:sem-email:2026-08-20")
    expect(derivarCaptacaoKey(7, "abc", fallback)).toBe("lp:7:abc")
  })

  it("namespaceia a fonte sem LP, sem colidir com nenhuma LP", () => {
    expect(derivarCaptacaoKey("site", null, fallback)).toBe("lp:site:fallback:+5511987654321:sem-email:2026-08-20")
    expect(derivarCaptacaoKey("site", null, fallback)).not.toBe(derivarCaptacaoKey(1, null, fallback))
  })
})
