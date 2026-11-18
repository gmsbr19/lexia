// WhatsApp — leitura/escrita da sessão e o canal app↔worker. SERVER ONLY.
//
// Divisão de responsabilidade: o WORKER é dono do estado (status, numero,
// conectadoEm, pareamento) porque só ele fala com o WhatsApp; o APP WEB só
// publica comandos e lê. Nenhuma função daqui aceita um userId vindo da
// requisição — quem chama sempre resolve o usuário da SESSÃO primeiro.
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { getSetting, setSetting } from "@/lib/settings"
import { diasDoHistorico, truncarErro, workerOnline } from "./core"
import { lerChaveAuth } from "./cripto"
import {
  CANAL_COMANDO,
  CANAL_EVENTO,
  CHAVE_WORKER,
  SESSAO_VAZIA,
  type SessaoView,
  type WhatsappComando,
  type WhatsappEvento,
  type WhatsappStatus,
} from "./tipos"

/** Teto do payload de NOTIFY no Postgres (8000 bytes); abaixo dele com folga. */
const MAX_PAYLOAD = 7_000

/**
 * O módulo só existe com WHATSAPP_AUTH_KEY definida — sem ela não há como
 * cifrar o auth state, e gravar credencial de WhatsApp em claro está fora de
 * questão. Rotas e página tratam `false` como "módulo não configurado" (404).
 */
export function whatsappHabilitado(): boolean {
  return !!(env.WHATSAPP_AUTH_KEY ?? "").trim()
}

/** A chave de cifragem, já validada. Lança se a var estiver presente e malformada. */
export function chaveAuth(): Buffer | null {
  return lerChaveAuth(env.WHATSAPP_AUTH_KEY)
}

type Heartbeat = { batidaEm?: string }

/** Estado da conexão DESTE usuário + se o worker está vivo. */
/**
 * Grava quantos dias de histórico o pareamento deve guardar. Vale do PRÓXIMO
 * trecho de sincronização em diante (o worker lê a cada trecho), então mudar o
 * número no meio de um despejo não exige reconectar.
 */
export async function definirHistoricoDias(userId: number, dias: number): Promise<number> {
  const valor = diasDoHistorico(dias)
  await prisma.whatsappSessao.upsert({
    where: { userId },
    create: { userId, historicoDias: valor },
    update: { historicoDias: valor },
  })
  return valor
}

export async function getSessaoView(userId: number): Promise<SessaoView> {
  const [s, hb] = await Promise.all([
    prisma.whatsappSessao.findUnique({
      where: { userId },
      select: { status: true, numero: true, conectadoEm: true, ultimoErro: true, pareamento: true, historicoDias: true },
    }),
    getSetting<Heartbeat>(CHAVE_WORKER),
  ])
  const online = workerOnline(hb?.batidaEm, Date.now())
  if (!s) return { ...SESSAO_VAZIA, workerOnline: online }
  return {
    status: s.status as WhatsappStatus,
    numero: s.numero,
    conectadoEm: s.conectadoEm ? s.conectadoEm.toISOString() : null,
    ultimoErro: s.ultimoErro,
    pareamento: s.pareamento,
    workerOnline: online,
    historicoDias: diasDoHistorico(s.historicoDias),
  }
}

/**
 * Manda um comando ao worker. `pg_notify` em vez de fila/broker: o Postgres já
 * está aí e o app roda numa instância só (ver docs/whatsapp-baileys.md).
 * Fire-and-forget do ponto de vista do app: se o worker estiver fora do ar, o
 * comando se perde — por isso a página mostra o estado do worker.
 */
export async function publicarComando(cmd: WhatsappComando): Promise<void> {
  await notificar(CANAL_COMANDO, cmd)
}

/** Publica um evento do worker → app web (consumido pelo SSE da página). */
export async function publicarEvento(evt: WhatsappEvento): Promise<void> {
  await notificar(CANAL_EVENTO, evt)
}

async function notificar(canal: string, payload: unknown): Promise<void> {
  const json = JSON.stringify(payload)
  if (json.length > MAX_PAYLOAD) {
    log.warn({ canal, bytes: json.length }, "whatsapp: payload de NOTIFY grande demais — descartado")
    return
  }
  // Tagged template → parâmetro de verdade (nunca interpolação de string).
  await prisma.$executeRaw`SELECT pg_notify(${canal}, ${json})`
}

// ── Escritas do WORKER ───────────────────────────────────────────────────────

export type PatchSessao = {
  status?: WhatsappStatus
  numero?: string | null
  conectadoEm?: Date | null
  ultimoErro?: string | null
  pareamento?: string | null
}

/** Upsert do estado da sessão. Só o worker chama. */
export async function salvarSessao(userId: number, patch: PatchSessao): Promise<void> {
  await prisma.whatsappSessao.upsert({
    where: { userId },
    update: patch,
    create: { userId, status: patch.status ?? "desconectado", ...patch },
  })
}

/** Status + evento numa tacada (o caminho comum do worker). */
export async function mudarStatus(userId: number, status: WhatsappStatus, patch: PatchSessao = {}): Promise<void> {
  await salvarSessao(userId, { status, ...patch })
  await publicarEvento({ tipo: "status", userId, status })
}

export async function registrarErro(userId: number, erro: unknown): Promise<void> {
  const mensagem = truncarErro(erro)
  await salvarSessao(userId, { status: "erro", ultimoErro: mensagem, pareamento: null })
  await publicarEvento({ tipo: "erro", userId, mensagem })
}

/**
 * Apaga o auth state do usuário. Chamado quando o WhatsApp diz `loggedOut`
 * (o usuário removeu o aparelho) e quando ele clica "Desconectar": a credencial
 * não fica para trás em nenhum dos dois caminhos.
 */
export async function apagarAuth(userId: number): Promise<void> {
  await prisma.whatsappAuth.deleteMany({ where: { userId } })
}

/**
 * Usuários cuja sessão o worker restaura ao subir. SÓ `conectado`: uma sessão
 * em `aguardando_qr` é alguém que nunca terminou de ler o código, e reabri-la
 * geraria QR em laço para uma tela que ninguém está olhando.
 */
export async function sessoesParaRestaurar(): Promise<number[]> {
  const rows = await prisma.whatsappSessao.findMany({
    where: { status: "conectado" },
    select: { userId: true },
  })
  return rows.map((r) => r.userId)
}

/** Um usuário desativado não conecta e tem a sessão encerrada (regra do brief). */
export async function usuarioAtivo(userId: number): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { ativo: true } })
  return !!u?.ativo
}

/** Heartbeat do worker — é o que deixa a página dizer "worker fora do ar". */
export async function baterPontoWorker(): Promise<void> {
  await setSetting(CHAVE_WORKER, { batidaEm: new Date().toISOString() } satisfies Heartbeat)
}
