import { describe, expect, it } from "vitest"
import { emitNotificacao, subscribe } from "@/lib/notificacoes/bus"
import type { NotificacaoEvent, NotificacaoRow } from "@/lib/notificacoes/types"

function fakeEvent(id: number): NotificacaoEvent {
  const notif: NotificacaoRow = {
    id,
    tipo: "simulada",
    modulo: "sistema",
    prioridade: "normal",
    refTipo: null,
    refId: null,
    mensagem: `msg ${id}`,
    link: null,
    actorEmail: null,
    contador: 1,
    lida: false,
    createdAt: "2026-06-15T12:00:00.000Z",
  }
  return { kind: "nova", notif }
}

describe("bus de notificações", () => {
  it("entrega só os eventos do próprio usuário", () => {
    const aRecebidos: NotificacaoEvent[] = []
    const bRecebidos: NotificacaoEvent[] = []
    const offA = subscribe("a@x.com", (e) => aRecebidos.push(e))
    const offB = subscribe("b@x.com", (e) => bRecebidos.push(e))

    emitNotificacao("a@x.com", fakeEvent(1))
    emitNotificacao("b@x.com", fakeEvent(2))

    expect(aRecebidos.map((e) => ("notif" in e ? e.notif.id : null))).toEqual([1])
    expect(bRecebidos.map((e) => ("notif" in e ? e.notif.id : null))).toEqual([2])
    offA()
    offB()
  })

  it("para de entregar após o unsubscribe", () => {
    const recebidos: NotificacaoEvent[] = []
    const off = subscribe("c@x.com", (e) => recebidos.push(e))
    emitNotificacao("c@x.com", fakeEvent(1))
    off()
    emitNotificacao("c@x.com", fakeEvent(2))
    expect(recebidos.map((e) => ("notif" in e ? e.notif.id : null))).toEqual([1])
  })
})
