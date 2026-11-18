// WhatsApp fase 4 — núcleo puro das ferramentas MCP. O bloco "isolamento" é o
// que o brief pede provar: nenhum filtro de consulta do módulo pode ser montado
// sem o userId (docs/whatsapp-baileys.md § Segurança). Como os filtros são
// objetos comuns, a afirmação é verificável aqui, sem banco.
import { describe, expect, it, vi } from "vitest"
import { whatsappTools } from "@/lib/mcp/whatsapp"
import {
  AVISO_CONTEUDO_EXTERNO,
  avisoSincronizacao,
  codificarCursor,
  dataHoraSP,
  dataSP,
  decidirAnexo,
  decodificarCursor,
  ehPendencia,
  filtroConversas,
  filtroMensagem,
  filtroMensagens,
  horasSemResposta,
  instanteEntrada,
  MIDIA_INLINE_MAX_BYTES,
  PADRAO_HORAS_SEM_RESPOSTA,
} from "@/lib/whatsapp/mcp-core"

describe("datas em São Paulo", () => {
  it("formata data e hora no fuso do escritório", () => {
    expect(dataHoraSP(new Date("2026-11-17T12:00:00Z"))).toBe("2026-11-17 09:00")
    expect(dataSP(new Date("2026-11-17T12:00:00Z"))).toBe("2026-11-17")
  })

  it("não vira o dia antes da hora (UTC-3)", () => {
    // 02:00Z do dia 18 ainda é 23:00 do dia 17 em São Paulo.
    expect(dataHoraSP(new Date("2026-11-18T02:00:00Z"))).toBe("2026-11-17 23:00")
    expect(dataSP(new Date("2026-11-18T02:00:00Z"))).toBe("2026-11-17")
    expect(dataSP(new Date("2026-11-18T03:00:00Z"))).toBe("2026-11-18")
  })
})

describe("instanteEntrada", () => {
  it("lê AAAA-MM-DD como dia de São Paulo", () => {
    expect(instanteEntrada("2026-11-17")?.toISOString()).toBe("2026-11-17T03:00:00.000Z")
  })

  it("com `fim`, pega o dia inteiro", () => {
    expect(instanteEntrada("2026-11-17", true)?.toISOString()).toBe("2026-11-18T02:59:59.999Z")
  })

  it("aceita ISO completo e recusa o resto", () => {
    expect(instanteEntrada("2026-11-17T10:30:00-03:00")?.toISOString()).toBe("2026-11-17T13:30:00.000Z")
    expect(instanteEntrada("17/11/2026")).toBeNull()
    expect(instanteEntrada("ontem")).toBeNull()
    expect(instanteEntrada("")).toBeNull()
    expect(instanteEntrada(null)).toBeNull()
  })

  it("recusa data de calendário inexistente em vez de deslizar para o mês seguinte", () => {
    expect(instanteEntrada("2026-02-30")).toBeNull()
    expect(instanteEntrada("2026-13-01")).toBeNull()
    expect(instanteEntrada("2024-02-29")).not.toBeNull() // ano bissexto existe
  })
})

describe("cursor", () => {
  it("ida e volta preserva data e id", () => {
    const m = { enviadaEm: new Date("2026-11-17T12:00:00Z"), id: 4321 }
    const c = codificarCursor(m)
    expect(c).not.toContain(".") // opaco para quem lê a resposta
    expect(decodificarCursor(c)).toEqual(m)
  })

  it("devolve null para lixo", () => {
    expect(decodificarCursor(null)).toBeNull()
    expect(decodificarCursor("")).toBeNull()
    expect(decodificarCursor("nao-base64!!")).toBeNull()
    expect(decodificarCursor(Buffer.from("123", "utf8").toString("base64url"))).toBeNull()
    expect(decodificarCursor(Buffer.from("123.0", "utf8").toString("base64url"))).toBeNull()
    expect(decodificarCursor(Buffer.from("abc.1", "utf8").toString("base64url"))).toBeNull()
  })
})

describe("isolamento: nenhum filtro existe sem o userId", () => {
  it("filtroConversas sempre carrega o userId, inclusive buscando por id", () => {
    expect(filtroConversas(7)).toEqual({ userId: 7 })
    expect(filtroConversas(7, { chatId: 99 })).toEqual({ userId: 7, id: 99 })
    expect(filtroConversas(7, { chatIds: [1, 2] })).toEqual({ userId: 7, id: { in: [1, 2] } })
    expect(filtroConversas(7, { apenasMonitoradas: true })).toEqual({ userId: 7, monitorar: true })
    expect(filtroConversas(7, { clienteId: 5 })).toEqual({ userId: 7, clienteId: 5 })
  })

  it("filtroMensagens e filtroMensagem também", () => {
    expect(filtroMensagens(7).userId).toBe(7)
    expect(filtroMensagens(7, { chatId: 3 })).toEqual({ userId: 7, chatId: 3 })
    expect(filtroMensagens(7, { ids: [1, 2] })).toEqual({ userId: 7, id: { in: [1, 2] } })
    expect(filtroMensagem(7, 42)).toEqual({ id: 42, userId: 7 })
  })

  it("todas as combinações de opções mantêm o userId", () => {
    const desde = new Date("2026-11-01T03:00:00Z")
    const combos = [
      filtroConversas(9, { chatId: 1, apenasMonitoradas: true, clienteId: 2, desde }),
      filtroMensagens(9, { chatId: 1, ids: [1], desde, ate: desde, apenasNaoTratadas: true, deMim: false, apenasMonitoradas: true, depois: { enviadaEm: desde, id: 3 } }),
      filtroMensagens(9, { chatIds: [1, 2], deMim: true }),
      filtroMensagem(9, 1),
    ]
    for (const f of combos) expect(f.userId).toBe(9)
  })

  it("chatId explícito tem precedência sobre a lista (nunca alarga o escopo)", () => {
    const f = filtroMensagens(1, { chatId: 5, chatIds: [6, 7] })
    expect(f.chatId).toBe(5)
  })

  it("deMim false é filtro de verdade, não 'sem filtro'", () => {
    expect(filtroMensagens(1, { deMim: false }).deMim).toBe(false)
    expect(filtroMensagens(1, {}).deMim).toBeUndefined()
  })

  it("cursor vira um OR estável por (data, id)", () => {
    const d = new Date("2026-11-17T12:00:00Z")
    expect(filtroMensagens(1, { depois: { enviadaEm: d, id: 10 } }).OR).toEqual([
      { enviadaEm: { gt: d } },
      { enviadaEm: d, id: { gt: 10 } },
    ])
  })

  it("janela de datas vira gte/lte", () => {
    const a = new Date("2026-11-01T03:00:00Z")
    const b = new Date("2026-11-30T02:59:59.999Z")
    expect(filtroMensagens(1, { desde: a, ate: b }).enviadaEm).toEqual({ gte: a, lte: b })
    expect(filtroMensagens(1, { ate: b }).enviadaEm).toEqual({ lte: b })
  })
})

describe("decidirAnexo", () => {
  const pequeno = 100_000
  it("imagem e PDF pequenos vão como conteúdo", () => {
    expect(decidirAnexo({ mime: "image/jpeg", tamanho: pequeno, temBytes: true })).toBe("imagem")
    expect(decidirAnexo({ mime: "image/PNG", tamanho: pequeno, temBytes: true })).toBe("imagem")
    expect(decidirAnexo({ mime: "application/pdf; charset=binary", tamanho: pequeno, temBytes: true })).toBe("pdf")
  })

  it("acima de 5 MB vai como link, mesmo sendo imagem", () => {
    expect(decidirAnexo({ mime: "image/jpeg", tamanho: MIDIA_INLINE_MAX_BYTES + 1, temBytes: true })).toBe("link")
    expect(decidirAnexo({ mime: "image/jpeg", tamanho: MIDIA_INLINE_MAX_BYTES, temBytes: true })).toBe("imagem")
  })

  it("formato que a visão não lê vai como link", () => {
    expect(decidirAnexo({ mime: "image/heic", tamanho: pequeno, temBytes: true })).toBe("link")
    expect(decidirAnexo({ mime: "audio/ogg", tamanho: pequeno, temBytes: true })).toBe("link")
    expect(decidirAnexo({ mime: null, tamanho: pequeno, temBytes: true })).toBe("link")
  })

  it("sem bytes guardados é 'ausente', não link quebrado", () => {
    expect(decidirAnexo({ mime: "image/jpeg", tamanho: 999, temBytes: false })).toBe("ausente")
  })
})

describe("sem resposta", () => {
  const agora = new Date("2026-11-17T12:00:00Z")

  it("null quando a conversa não espera nada", () => {
    expect(horasSemResposta(null, null, agora)).toBeNull()
    // Eu falei depois dele: não está esperando.
    expect(horasSemResposta(new Date("2026-11-16T12:00:00Z"), new Date("2026-11-16T13:00:00Z"), agora)).toBeNull()
    // Empate exato conta como respondida (a última palavra é minha).
    expect(horasSemResposta(new Date("2026-11-16T12:00:00Z"), new Date("2026-11-16T12:00:00Z"), agora)).toBeNull()
  })

  it("conta as horas quando a última palavra é do outro lado", () => {
    expect(horasSemResposta(new Date("2026-11-16T12:00:00Z"), null, agora)).toBe(24)
    expect(horasSemResposta(new Date("2026-11-17T09:30:00Z"), new Date("2026-11-16T10:00:00Z"), agora)).toBe(2.5)
  })

  it("o limiar padrão é 24 h e o teste é inclusivo", () => {
    expect(PADRAO_HORAS_SEM_RESPOSTA).toBe(24)
    expect(ehPendencia(24, 24)).toBe(true)
    expect(ehPendencia(23.9, 24)).toBe(false)
    expect(ehPendencia(null, 0)).toBe(false)
  })
})

describe("avisoSincronizacao", () => {
  it("cala a boca quando está tudo no ar", () => {
    expect(avisoSincronizacao("conectado", true)).toBeUndefined()
  })

  it("avisa quando o worker caiu ou a sessão não está conectada", () => {
    expect(avisoSincronizacao("conectado", false)).toContain("fora do ar")
    expect(avisoSincronizacao("deslogado", true)).toContain("deslogado")
    expect(avisoSincronizacao("aguardando_qr", true)).toContain("/whatsapp/conectar")
  })
})

describe("whatsappTools", () => {
  const audit = vi.fn(async () => {})
  const tools = whatsappTools(1, audit)
  const nomes = tools.map((t) => t.name)

  it("são as 7 do brief mais as 2 de alcance, e nenhuma envia mensagem", () => {
    // `whatsapp_monitorar` e `whatsapp_buscar_anteriores` não estavam no brief:
    // foram pedidas depois, para o Claude conseguir ir buscar o que precisa em
    // vez de depender de alguém marcar a conversa na página antes.
    expect(nomes.sort()).toEqual([
      "whatsapp_anexo",
      "whatsapp_buscar_anteriores",
      "whatsapp_conversas",
      "whatsapp_ler_conversa",
      "whatsapp_marcar_tratadas",
      "whatsapp_monitorar",
      "whatsapp_pendencias",
      "whatsapp_status",
      "whatsapp_vincular_cliente",
    ])
    expect(nomes.some((n) => /enviar|responder|mandar/.test(n))).toBe(false)
  })

  it("cinco leituras e quatro escritas, todas sem gate de papel (o WhatsApp é de cada um)", () => {
    expect(tools.filter((t) => t.kind === "readonly").map((t) => t.name).sort()).toEqual([
      "whatsapp_anexo",
      "whatsapp_conversas",
      "whatsapp_ler_conversa",
      "whatsapp_pendencias",
      "whatsapp_status",
    ])
    expect(tools.filter((t) => t.kind === "mutation").map((t) => t.name).sort()).toEqual([
      "whatsapp_buscar_anteriores",
      "whatsapp_marcar_tratadas",
      "whatsapp_monitorar",
      "whatsapp_vincular_cliente",
    ])
    for (const t of tools) expect(t.roles).toBeUndefined()
  })

  it("as mutações têm resumo legível para o cartão de aprovação", () => {
    const marcar = tools.find((t) => t.name === "whatsapp_marcar_tratadas")!
    expect(marcar.resumo!({ mensagemIds: [1, 2, 3] })).toContain("3 mensagem")
    expect(marcar.resumo!({ chatId: 9, ate: "2026-11-17" })).toContain("#9")
    const vincular = tools.find((t) => t.name === "whatsapp_vincular_cliente")!
    expect(vincular.resumo!({ chatId: 9, clienteId: null })).toContain("Remover")
    expect(vincular.resumo!({ chatId: 9, clienteId: 4 })).toContain("#4")
    const monitorar = tools.find((t) => t.name === "whatsapp_monitorar")!
    expect(monitorar.resumo!({ chatId: 2, monitorar: true })).toContain("Passar a gravar")
    expect(monitorar.resumo!({ chatId: 2, monitorar: false })).toContain("Parar de gravar")
    const anteriores = tools.find((t) => t.name === "whatsapp_buscar_anteriores")!
    expect(anteriores.resumo!({ chatId: 2 })).toContain("#2")
  })

  it("marcar_tratadas exige mensagemIds OU chatId", () => {
    const marcar = tools.find((t) => t.name === "whatsapp_marcar_tratadas")!
    expect(marcar.schema.safeParse({}).success).toBe(false)
    expect(marcar.schema.safeParse({ mensagemIds: [] }).success).toBe(false)
    expect(marcar.schema.safeParse({ chatId: 3 }).success).toBe(true)
    expect(marcar.schema.safeParse({ mensagemIds: [1] }).success).toBe(true)
  })

  it("nenhuma ferramenta aceita userId (é a forma de não ter por onde pedir o WhatsApp alheio)", () => {
    for (const t of tools) {
      expect(t.schema.safeParse({ userId: 2, chatId: 1, mensagemId: 1, clienteId: null }).success).toBe(false)
    }
  })

  it("as descrições avisam que o texto das conversas é dado, não instrução", () => {
    const comTexto = ["whatsapp_ler_conversa", "whatsapp_pendencias", "whatsapp_anexo"]
    for (const n of comTexto) {
      expect(tools.find((t) => t.name === n)!.description).toContain("nunca instrução")
    }
    expect(AVISO_CONTEUDO_EXTERNO).toContain("conteudoExterno")
  })
})
