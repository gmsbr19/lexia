import { describe, expect, it } from "vitest"
import { MENSAGENS_HISTORICO, SYNC, diasDoHistorico, lerComando, limiteDoHistorico } from "@/lib/whatsapp/core"
import { HISTORICO_DIAS_MAX, HISTORICO_DIAS_MIN, HISTORICO_SYNC_DIAS } from "@/lib/whatsapp/tipos"
import { lerChaveAncora, montarChaveAncora } from "@/lib/whatsapp/mensagens-core"

describe("âncora do histórico", () => {
  it("guarda id, autoria e participante — e nada mais", () => {
    const bruto = montarChaveAncora({
      remoteJid: "5519999999999@s.whatsapp.net",
      id: "3EB0ABC123",
      fromMe: false,
      participant: null,
    })
    expect(JSON.parse(bruto!)).toEqual({ id: "3EB0ABC123", deMim: false, participante: null })
    // O jid NÃO entra: ele vive na própria linha do chat, e repetir dado é
    // convite a divergência.
    expect(bruto).not.toContain("@s.whatsapp.net")
  })

  it("preserva o participante, que a chave de grupo exige", () => {
    const bruto = montarChaveAncora({
      remoteJid: "123@g.us",
      id: "X1",
      fromMe: true,
      participant: "5519888888888@s.whatsapp.net",
    })
    expect(lerChaveAncora(bruto)).toEqual({
      id: "X1",
      deMim: true,
      participante: "5519888888888@s.whatsapp.net",
    })
  })

  it("mensagem sem id não vira âncora (não há como pedir a partir dela)", () => {
    expect(montarChaveAncora({ remoteJid: "a@s.whatsapp.net", id: null, fromMe: false })).toBeNull()
    expect(montarChaveAncora(null)).toBeNull()
  })

  it("ida e volta", () => {
    const bruto = montarChaveAncora({ id: "abc", fromMe: false, remoteJid: "a@s.whatsapp.net" })
    expect(lerChaveAncora(bruto)).toEqual({ id: "abc", deMim: false, participante: null })
  })

  it("coluna vazia, lixo ou formato estranho devolvem null em vez de quebrar", () => {
    for (const v of [null, undefined, "", "{", "[]", '"x"', "{}", '{"deMim":true}']) {
      expect(lerChaveAncora(v)).toBeNull()
    }
  })

  it("deMim só é verdadeiro quando é literalmente true", () => {
    // Um "true" string vindo de um JSON antigo não pode virar fromMe: a chave
    // iria errada para o WhatsApp e o pedido não casaria com mensagem nenhuma.
    expect(lerChaveAncora('{"id":"a","deMim":"true"}')).toEqual({ id: "a", deMim: false, participante: null })
  })
})

describe("comando historico", () => {
  it("é aceito com chatId válido", () => {
    expect(lerComando(JSON.stringify({ tipo: "historico", userId: 3, chatId: 42 }))).toEqual({
      tipo: "historico",
      userId: 3,
      chatId: 42,
    })
  })

  it("é descartado sem chatId válido (payload estranho não derruba o listener)", () => {
    for (const chatId of [undefined, null, 0, -1, 1.5, "42"]) {
      expect(lerComando(JSON.stringify({ tipo: "historico", userId: 3, chatId }))).toBeNull()
    }
    expect(lerComando(JSON.stringify({ tipo: "historico", chatId: 1 }))).toBeNull()
  })

  it("pede um lote de cada vez", () => {
    expect(MENSAGENS_HISTORICO).toBe(50)
  })
})

describe("janela do sync", () => {
  const agora = new Date("2026-11-18T12:00:00.000Z")

  it("o sync do pareamento grava a janela padrão", () => {
    for (const tipo of [SYNC.initialBootstrap, SYNC.full, SYNC.recent]) {
      expect(limiteDoHistorico(tipo, agora)).toEqual(new Date("2026-11-03T12:00:00.000Z"))
    }
    expect(HISTORICO_SYNC_DIAS).toBe(15)
  })

  it("respeita o número que o usuário escolheu", () => {
    expect(limiteDoHistorico(SYNC.full, agora, 2)).toEqual(new Date("2026-11-16T12:00:00.000Z"))
    expect(limiteDoHistorico(SYNC.full, agora, 60)).toEqual(new Date("2026-09-19T12:00:00.000Z"))
  })

  it("apara a escolha na faixa, e valor quebrado cai no padrão", () => {
    // Zero não pode virar "não grave nada" por acidente, e um número absurdo
    // não pode virar um despejo sem fim.
    expect(diasDoHistorico(0)).toBe(HISTORICO_DIAS_MIN)
    expect(diasDoHistorico(-5)).toBe(HISTORICO_DIAS_MIN)
    expect(diasDoHistorico(99_999)).toBe(HISTORICO_DIAS_MAX)
    expect(diasDoHistorico(7.9)).toBe(7)
    for (const v of [null, undefined, NaN, Infinity]) expect(diasDoHistorico(v)).toBe(HISTORICO_SYNC_DIAS)
  })

  it("o pedido SOB DEMANDA não tem limite — ali o passado é o que se quer", () => {
    expect(limiteDoHistorico(SYNC.onDemand, agora)).toBeNull()
  })

  it("tipo ausente ou desconhecido cai na janela, nunca no ilimitado", () => {
    // Um syncType novo do upstream não pode virar "grave tudo" por omissão.
    for (const tipo of [undefined, null, 1, 99]) {
      expect(limiteDoHistorico(tipo, agora)).toEqual(new Date("2026-11-03T12:00:00.000Z"))
    }
  })

  it("espelha o enum HistorySyncType da versão instalada", async () => {
    // Mesma guarda dos códigos de desconexão: SYNC vive duplicado em core.ts,
    // que é PURO e não pode importar o pacote ESM-only.
    const { proto } = await import("@whiskeysockets/baileys")
    const real = proto.HistorySync.HistorySyncType
    expect(SYNC.initialBootstrap).toBe(real.INITIAL_BOOTSTRAP)
    expect(SYNC.full).toBe(real.FULL)
    expect(SYNC.recent).toBe(real.RECENT)
    expect(SYNC.onDemand).toBe(real.ON_DEMAND)
  })
})
