// WhatsApp — ponte LISTEN/NOTIFY → EventEmitter em processo, do lado do APP WEB.
// SERVER ONLY (runtime nodejs; o Edge não tem socket TCP para o Postgres).
//
// POR QUE um client `pg` e não o Prisma: `LISTEN` é uma conexão que fica ABERTA
// recebendo notificações assíncronas, e o Prisma não expõe isso (`$executeRaw`
// devolve a conexão ao pool logo depois, matando o LISTEN). Então o módulo abre
// UMA conexão dedicada por processo e redistribui os eventos em memória — o
// mesmo desenho do bus de notificações (src/lib/notificacoes/bus.ts), com o
// Postgres fazendo o papel de broker entre o worker e o app.
//
// Fixado em globalThis para sobreviver ao HMR do Next em dev (igual ao
// PrismaClient): sem isso cada reload abriria outra conexão LISTEN órfã.
import { EventEmitter } from "node:events"
import { Client } from "pg"
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { lerEvento } from "./core"
import { CANAL_EVENTO, type WhatsappEvento } from "./tipos"

type Ponte = {
  emitter: EventEmitter
  client: Client | null
  conectando: boolean
  tentativa: number
  timer: ReturnType<typeof setTimeout> | null
}

const globalForBus = globalThis as unknown as { whatsappBus?: Ponte }

function criarPonte(): Ponte {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(0) // 1 listener por conexão SSE aberta
  return { emitter, client: null, conectando: false, tentativa: 0, timer: null }
}

const ponte: Ponte = globalForBus.whatsappBus ?? criarPonte()
if (process.env.NODE_ENV !== "production") globalForBus.whatsappBus = ponte

/** Canal por usuário: a entrega já sai filtrada na origem. */
function canal(userId: number): string {
  return "wa-" + userId
}

async function conectar(): Promise<void> {
  if (ponte.client || ponte.conectando) return
  ponte.conectando = true
  const client = new Client({ connectionString: env.DATABASE_URL, application_name: "lexia-whatsapp-listen" })
  try {
    client.on("notification", (msg) => {
      if (msg.channel !== CANAL_EVENTO || !msg.payload) return
      const evt = lerEvento(msg.payload)
      if (evt) ponte.emitter.emit(canal(evt.userId), evt)
    })
    // Uma conexão LISTEN cai sozinha (reinício do banco, idle timeout do
    // pooler). O `error` é tratado aqui porque num Client sem handler ele
    // viraria exceção não capturada e derrubaria o processo do app.
    client.on("error", (e) => {
      log.warn({ err: e instanceof Error ? e.message : String(e) }, "whatsapp: conexão LISTEN caiu")
      derrubarEAgendar()
    })
    client.on("end", () => derrubarEAgendar())
    await client.connect()
    await client.query("LISTEN " + CANAL_EVENTO)
    ponte.client = client
    ponte.tentativa = 0
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e) }, "whatsapp: não foi possível abrir o LISTEN")
    try {
      await client.end()
    } catch {
      /* já caiu */
    }
    agendarReconexao()
  } finally {
    ponte.conectando = false
  }
}

function derrubarEAgendar(): void {
  const c = ponte.client
  ponte.client = null
  if (c) void c.end().catch(() => {})
  agendarReconexao()
}

function agendarReconexao(): void {
  // Só vale reconectar se ainda há alguém ouvindo (aba aberta na página).
  if (ponte.timer || !temAssinantes()) return
  const espera = Math.min(30_000, 1_000 * 2 ** Math.min(ponte.tentativa++, 5))
  ponte.timer = setTimeout(() => {
    ponte.timer = null
    if (temAssinantes()) void conectar()
  }, espera)
  // Um timer pendurado não deve impedir o processo de encerrar.
  ponte.timer.unref?.()
}

function temAssinantes(): boolean {
  return ponte.emitter.eventNames().some((n) => ponte.emitter.listenerCount(n) > 0)
}

/**
 * Inscreve um callback nos eventos de UM usuário. Devolve o cancelamento.
 * A conexão LISTEN é aberta na primeira inscrição (preguiçosa: quem nunca abre
 * a página de WhatsApp não paga uma conexão a mais no banco).
 */
export function assinarEventos(userId: number, cb: (evt: WhatsappEvento) => void): () => void {
  ponte.emitter.on(canal(userId), cb)
  void conectar()
  return () => {
    ponte.emitter.off(canal(userId), cb)
  }
}
