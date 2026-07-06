import { describe, expect, it } from "vitest"
import { encodeSse } from "@/lib/lexia/agent/sse"
import type { SseEvent } from "@/lib/lexia/types"

function parse(frame: string): { event: string; data: unknown } {
  const [eventLine, dataLine] = frame.trim().split("\n")
  return { event: eventLine.replace("event: ", ""), data: JSON.parse(dataLine.replace("data: ", "")) }
}

describe("encodeSse — eventos novos da Fase 1", () => {
  it("card", () => {
    const ev: SseEvent = { type: "card", card: { type: "search", query: "aurora", grupos: [] } }
    const { event, data } = parse(encodeSse(ev))
    expect(event).toBe("card")
    expect(data).toEqual(ev)
  })

  it("choice", () => {
    const ev: SseEvent = { type: "choice", acaoId: 7, pergunta: "Qual João?", opcoes: ["João Silva", "João Souza"], multipla: false, permitirOutro: true }
    const { event, data } = parse(encodeSse(ev))
    expect(event).toBe("choice")
    expect(data).toEqual(ev)
  })

  it("cut", () => {
    const ev: SseEvent = { type: "cut" }
    const { event, data } = parse(encodeSse(ev))
    expect(event).toBe("cut")
    expect(data).toEqual(ev)
  })

  it("thinking", () => {
    const ev: SseEvent = { type: "thinking", delta: "Avaliando o pedido…" }
    const { event, data } = parse(encodeSse(ev))
    expect(event).toBe("thinking")
    expect(data).toEqual(ev)
  })

  it("followups", () => {
    const ev: SseEvent = { type: "followups", itens: ["Redigir cobrança", "Agendar lembrete"] }
    const { event, data } = parse(encodeSse(ev))
    expect(event).toBe("followups")
    expect(data).toEqual(ev)
  })

  it("done carrega fontes quando presente", () => {
    const ev: SseEvent = {
      type: "done",
      model: "claude-sonnet-4-6",
      inputTokens: 100,
      outputTokens: 50,
      fontes: [{ tipo: "andamento", titulo: "Juntada de petição", rota: "/processos/1" }],
    }
    const { event, data } = parse(encodeSse(ev))
    expect(event).toBe("done")
    expect(data).toEqual(ev)
  })

  it("error carrega código estruturado quando presente", () => {
    const ev: SseEvent = { type: "error", mensagem: "Sem conexão", codigo: "offline" }
    const { event, data } = parse(encodeSse(ev))
    expect(event).toBe("error")
    expect(data).toEqual(ev)
  })

  it("done/error continuam válidos sem os campos novos (compatibilidade)", () => {
    const done: SseEvent = { type: "done", model: "claude-haiku-4-5", inputTokens: 1, outputTokens: 1 }
    const err: SseEvent = { type: "error", mensagem: "Erro genérico" }
    expect(parse(encodeSse(done)).data).toEqual(done)
    expect(parse(encodeSse(err)).data).toEqual(err)
  })
})
