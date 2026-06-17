// Pub/sub em processo para entrega em tempo real das notificações. SERVER ONLY.
// Deploy single-server (systemd) → um EventEmitter em memória basta; não há
// Redis/LISTEN-NOTIFY (e o SQLite não tem pub/sub). Se um dia escalar
// horizontalmente, troca-se SÓ este arquivo por um broker.
//
// Fixado em globalThis para sobreviver ao HMR do Next em dev (mesmo padrão do
// PrismaClient em src/lib/db/client.ts) — senão cada reload criaria um emitter
// novo e as conexões SSE abertas ficariam órfãs.
import { EventEmitter } from "node:events"
import type { NotificacaoEvent } from "./types"

const globalForBus = globalThis as unknown as { notifBus?: EventEmitter }

function criarBus(): EventEmitter {
  const e = new EventEmitter()
  e.setMaxListeners(0) // 1 listener por conexão SSE (aba aberta) — sem teto/warning
  return e
}

export const notifBus: EventEmitter = globalForBus.notifBus ?? criarBus()
if (process.env.NODE_ENV !== "production") globalForBus.notifBus = notifBus

// Canal por usuário: o nome do evento é o e-mail, então a entrega já é filtrada
// na origem (um assinante só recebe os eventos do seu próprio e-mail).
export function emitNotificacao(userEmail: string, evt: NotificacaoEvent): void {
  notifBus.emit(userEmail, evt)
}

/** Inscreve um callback nos eventos de um usuário. Retorna a função de cancelamento. */
export function subscribe(userEmail: string, cb: (evt: NotificacaoEvent) => void): () => void {
  notifBus.on(userEmail, cb)
  return () => {
    notifBus.off(userEmail, cb)
  }
}
