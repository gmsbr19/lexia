// WhatsApp — núcleo puro (decisões de conexão, telefone, payloads) + a cifragem
// do auth state. Nada aqui toca banco ou rede.
import { describe, expect, it } from "vitest"
import {
  CODIGO,
  backoffMs,
  decidirFechamento,
  decidirRetomada,
  ehGrupo,
  ehLid,
  jidParaNumero,
  lerComando,
  lerEvento,
  normalizarTelefone,
  numeroParaPareamento,
  truncarErro,
  workerOnline,
} from "@/lib/whatsapp/core"
import { cifrar, contextoAuth, decifrar, lerChaveAuth } from "@/lib/whatsapp/cripto"
import { WORKER_TTL_MS } from "@/lib/whatsapp/tipos"

describe("códigos de desconexão", () => {
  // Guarda contra atualização do Baileys: os códigos vivem duplicados em
  // core.ts (que é PURO e não pode importar o pacote ESM-only). Se o upstream
  // mudar um valor, este teste quebra em vez de o worker reconectar para sempre
  // com uma credencial morta.
  it("espelham o enum DisconnectReason da versão instalada", async () => {
    const { DisconnectReason } = await import("@whiskeysockets/baileys")
    expect(CODIGO.loggedOut).toBe(DisconnectReason.loggedOut)
    expect(CODIGO.forbidden).toBe(DisconnectReason.forbidden)
    expect(CODIGO.connectionLost).toBe(DisconnectReason.connectionLost)
    expect(CODIGO.multideviceMismatch).toBe(DisconnectReason.multideviceMismatch)
    expect(CODIGO.connectionClosed).toBe(DisconnectReason.connectionClosed)
    expect(CODIGO.connectionReplaced).toBe(DisconnectReason.connectionReplaced)
    expect(CODIGO.badSession).toBe(DisconnectReason.badSession)
    expect(CODIGO.unavailableService).toBe(DisconnectReason.unavailableService)
    expect(CODIGO.restartRequired).toBe(DisconnectReason.restartRequired)
  })
})

describe("backoffMs", () => {
  it("vai de 1s a 60s e satura", () => {
    expect(backoffMs(0)).toBe(1_000)
    expect(backoffMs(1)).toBe(2_000)
    expect(backoffMs(2)).toBe(4_000)
    expect(backoffMs(5)).toBe(32_000)
    expect(backoffMs(6)).toBe(60_000)
    expect(backoffMs(99)).toBe(60_000)
  })
  it("trata entrada estranha como primeira tentativa", () => {
    expect(backoffMs(-5)).toBe(1_000)
    expect(backoffMs(Number.NaN)).toBe(1_000)
  })
})

describe("decidirFechamento", () => {
  it("deslogado/proibido/incompatível apagam a credencial", () => {
    expect(decidirFechamento(CODIGO.loggedOut, 0).acao).toBe("deslogar")
    expect(decidirFechamento(CODIGO.forbidden, 0).acao).toBe("deslogar")
    expect(decidirFechamento(CODIGO.multideviceMismatch, 0).acao).toBe("deslogar")
  })
  it("sessão assumida por outra instância PARA (não entra em laço de brigas)", () => {
    expect(decidirFechamento(CODIGO.connectionReplaced, 0).acao).toBe("parar")
  })
  it("restartRequired reconecta na hora", () => {
    const d = decidirFechamento(CODIGO.restartRequired, 3)
    expect(d.acao).toBe("reconectar")
    expect(d.esperaMs).toBe(0)
  })
  it("queda comum reconecta com backoff crescente", () => {
    expect(decidirFechamento(CODIGO.connectionClosed, 0).esperaMs).toBe(1_000)
    expect(decidirFechamento(CODIGO.connectionLost, 3).esperaMs).toBe(8_000)
    expect(decidirFechamento(undefined, 0).acao).toBe("reconectar")
  })
})

describe("decidirRetomada", () => {
  // Regressao do primeiro pareamento real: o 515 chega ANTES de a sessao ter
  // aberto uma vez, e tratá-lo como "codigo expirou" travava o pareamento para
  // sempre — o celular ficava girando e o worker parava.
  it("515 e REINICIO mesmo numa sessao que nunca foi pareada", () => {
    expect(decidirRetomada(CODIGO.restartRequired, false)).toBe("reinicio")
    expect(decidirRetomada(CODIGO.restartRequired, true)).toBe("reinicio")
  })
  it("queda sem nunca ter pareado e expiracao do codigo", () => {
    expect(decidirRetomada(CODIGO.connectionClosed, false)).toBe("expirou")
    expect(decidirRetomada(undefined, false)).toBe("expirou")
  })
  it("sessao real que cai reconecta", () => {
    expect(decidirRetomada(CODIGO.connectionClosed, true)).toBe("reconectar")
    expect(decidirRetomada(CODIGO.connectionLost, true)).toBe("reconectar")
  })
})

describe("jid", () => {
  it("extrai o telefone de um contato, com ou sem device", () => {
    expect(jidParaNumero("5511999998888@s.whatsapp.net")).toBe("5511999998888")
    expect(jidParaNumero("5511999998888:12@s.whatsapp.net")).toBe("5511999998888")
  })
  it("grupo e LID não têm telefone", () => {
    expect(jidParaNumero("120363000000000000@g.us")).toBeNull()
    expect(jidParaNumero("188888888888888@lid")).toBeNull()
    expect(ehGrupo("120363000000000000@g.us")).toBe(true)
    expect(ehLid("188888888888888@lid")).toBe(true)
  })
  it("entrada vazia ou curta demais vira null", () => {
    expect(jidParaNumero(null)).toBeNull()
    expect(jidParaNumero("123@s.whatsapp.net")).toBeNull()
  })
})

describe("normalizarTelefone", () => {
  it("prefixa 55 em 10 e 11 dígitos", () => {
    expect(normalizarTelefone("(11) 99999-8888")).toBe("5511999998888")
    expect(normalizarTelefone("11 3333-4444")).toBe("551133334444")
  })
  it("mantém quem já tem DDI", () => {
    expect(normalizarTelefone("+55 11 99999-8888")).toBe("5511999998888")
    expect(normalizarTelefone("551133334444")).toBe("551133334444")
  })
  it("descarta o que não é telefone em vez de inventar", () => {
    expect(normalizarTelefone("99999")).toBeNull()
    expect(normalizarTelefone("5511999998888999")).toBeNull()
    expect(normalizarTelefone("")).toBeNull()
    expect(normalizarTelefone(null)).toBeNull()
  })
  it("tira zero à esquerda", () => {
    expect(normalizarTelefone("011999998888")).toBe("5511999998888")
  })
})

describe("numeroParaPareamento", () => {
  it("exige número completo com DDI", () => {
    expect(numeroParaPareamento("(11) 99999-8888")).toBe("5511999998888")
    expect(numeroParaPareamento("+55 11 3333-4444")).toBe("551133334444")
    expect(numeroParaPareamento("99999")).toBeNull()
  })
})

describe("truncarErro", () => {
  it("achata espaços e corta", () => {
    expect(truncarErro(new Error("falhou  \n  aqui"))).toBe("falhou aqui")
    expect(truncarErro("x".repeat(500)).length).toBe(400)
    expect(truncarErro("")).toBe("Erro desconhecido")
    expect(truncarErro(undefined)).toBe("Erro desconhecido")
  })
})

describe("workerOnline", () => {
  const agora = Date.parse("2026-11-17T12:00:00.000Z")
  it("vale enquanto a batida está dentro da janela", () => {
    expect(workerOnline(new Date(agora - 10_000).toISOString(), agora)).toBe(true)
    expect(workerOnline(new Date(agora - WORKER_TTL_MS - 1).toISOString(), agora)).toBe(false)
  })
  it("sem batida (ou batida inválida) é offline", () => {
    expect(workerOnline(null, agora)).toBe(false)
    expect(workerOnline("nem data", agora)).toBe(false)
  })
})

describe("payloads de NOTIFY", () => {
  it("lê comandos válidos", () => {
    expect(lerComando(JSON.stringify({ tipo: "iniciar", userId: 7 }))).toEqual({ tipo: "iniciar", userId: 7 })
    expect(lerComando(JSON.stringify({ tipo: "desconectar", userId: 7 }))).toEqual({ tipo: "desconectar", userId: 7 })
    expect(lerComando(JSON.stringify({ tipo: "pareamento", userId: 7, numero: "(11) 99999-8888" }))).toEqual({
      tipo: "pareamento",
      userId: 7,
      numero: "5511999998888",
    })
  })
  it("descarta lixo em silêncio em vez de derrubar o listener", () => {
    expect(lerComando("não é json")).toBeNull()
    expect(lerComando("[1,2,3]")).toBeNull()
    expect(lerComando(JSON.stringify({ tipo: "iniciar" }))).toBeNull()
    expect(lerComando(JSON.stringify({ tipo: "iniciar", userId: 0 }))).toBeNull()
    expect(lerComando(JSON.stringify({ tipo: "iniciar", userId: "7" }))).toBeNull()
    expect(lerComando(JSON.stringify({ tipo: "apagar_tudo", userId: 7 }))).toBeNull()
    expect(lerComando(JSON.stringify({ tipo: "pareamento", userId: 7, numero: "123" }))).toBeNull()
  })
  it("lê eventos válidos e recusa os malformados", () => {
    expect(lerEvento(JSON.stringify({ tipo: "qr", userId: 3, qr: "abc" }))).toEqual({ tipo: "qr", userId: 3, qr: "abc" })
    expect(lerEvento(JSON.stringify({ tipo: "conectado", userId: 3 }))).toEqual({
      tipo: "conectado",
      userId: 3,
      numero: null,
    })
    expect(lerEvento(JSON.stringify({ tipo: "status", userId: 3, status: "conectado" }))).toEqual({
      tipo: "status",
      userId: 3,
      status: "conectado",
    })
    expect(lerEvento(JSON.stringify({ tipo: "status", userId: 3, status: "inventado" }))).toBeNull()
    expect(lerEvento(JSON.stringify({ tipo: "qr", userId: 3 }))).toBeNull()
  })
})

describe("cifragem do auth state", () => {
  const chave = Buffer.alloc(32, 7)
  const ctx = contextoAuth(42, "creds")

  it("ida e volta preserva o conteúdo", () => {
    const texto = JSON.stringify({ noiseKey: "abc", registered: true })
    const blob = cifrar(texto, chave, ctx)
    expect(blob.startsWith("g1:")).toBe(true)
    expect(blob).not.toContain("noiseKey") // nada legível no banco
    expect(decifrar(blob, chave, ctx)).toBe(texto)
  })

  it("cada cifragem usa um IV novo", () => {
    expect(cifrar("x", chave, ctx)).not.toBe(cifrar("x", chave, ctx))
  })

  it("chave errada falha (não devolve lixo)", () => {
    const blob = cifrar("segredo", chave, ctx)
    expect(() => decifrar(blob, Buffer.alloc(32, 8), ctx)).toThrow()
  })

  it("conteúdo adulterado falha", () => {
    const blob = cifrar("segredo", chave, ctx)
    const partes = blob.split(":")
    const ct = Buffer.from(partes[3], "base64")
    ct[0] = ct[0] ^ 0xff
    partes[3] = ct.toString("base64")
    expect(() => decifrar(partes.join(":"), chave, ctx)).toThrow()
  })

  it("linha movida para outro usuário ou outra chave falha (AAD)", () => {
    const blob = cifrar("segredo", chave, ctx)
    expect(() => decifrar(blob, chave, contextoAuth(43, "creds"))).toThrow()
    expect(() => decifrar(blob, chave, contextoAuth(42, "pre-key-1"))).toThrow()
  })

  it("formato desconhecido falha com mensagem própria", () => {
    expect(() => decifrar("texto cru", chave, ctx)).toThrow(/Formato/)
  })
})

describe("lerChaveAuth", () => {
  it("aceita hex de 64 e base64 de 32 bytes", () => {
    expect(lerChaveAuth("a".repeat(64))?.length).toBe(32)
    expect(lerChaveAuth(Buffer.alloc(32, 3).toString("base64"))?.length).toBe(32)
  })
  it("vazia = módulo desligado (null, sem erro)", () => {
    expect(lerChaveAuth(undefined)).toBeNull()
    expect(lerChaveAuth("")).toBeNull()
    expect(lerChaveAuth("   ")).toBeNull()
  })
  it("presente mas curta/inválida LANÇA (falhar alto > cifrar fraco)", () => {
    expect(() => lerChaveAuth("abc")).toThrow(/WHATSAPP_AUTH_KEY/)
    expect(() => lerChaveAuth("a".repeat(63))).toThrow(/WHATSAPP_AUTH_KEY/)
  })
})
