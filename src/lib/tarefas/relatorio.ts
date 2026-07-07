// Relatório diário de tarefas por e-mail. SERVER ONLY.
// Para cada usuário ativo com o opt-in ligado (default) e cuja hora configurada
// casa com a hora atual, reúne suas tarefas ATRASADAS + PARA HOJE (por prazo) e
// envia um e-mail. Sócios/admin recebem também um resumo das atrasadas da equipe.
// Dia sem pendências → envia mesmo assim com "tudo em dia".
//
// O app é request-driven (sem worker): o cron externo chama
// POST /api/jobs/relatorio-diario de hora em hora; este módulo só envia a quem
// casou a hora. Idempotência do dia via marcador em AppSetting (sem migração).
import { prisma } from "@/lib/db"
import { log } from "@/lib/log"
import {
  emailButton,
  emailCard,
  emailRow,
  escapeHtml,
  renderEmail,
} from "@/lib/notificacoes/email/layout"
import { baseUrl, getMailer } from "@/lib/notificacoes/email/mailer"
import { deveEnviarRelatorio, parsePrefs } from "@/lib/notificacoes/preferencias-core"
import { hojeISO, toISODate } from "@/lib/processos/datas"
import { getSetting, setSetting } from "@/lib/settings"

const MARCADOR_KEY = "relatorio-diario-enviado"
const TZ = "America/Sao_Paulo"
const ROLES_GESTOR = new Set(["socio", "admin"])
const MAX_LINHAS_EQUIPE = 30 // corta o e-mail da equipe p/ não estourar

function noon(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

/** Hora do relógio de parede São Paulo (0–23). */
export function horaAtualSP(now: Date = new Date()): number {
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now)
  const h = Number.parseInt(s, 10)
  return Number.isInteger(h) ? h % 24 : new Date().getHours()
}

// ── shapes ────────────────────────────────────────────────────────────────────
export interface TarefaLinha {
  id: number
  titulo: string
  prazoISO: string
  contexto?: string | null // cliente ou projeto
  responsavelNome?: string | null // usado só na seção de equipe
}

export interface RelatorioDados {
  atrasadas: TarefaLinha[]
  hoje: TarefaLinha[]
  equipe: TarefaLinha[] // atrasadas da equipe (só p/ gestor)
}

interface Destinatario {
  email: string
  nome: string
  gestor: boolean
}

// ── PURE: agrupamento + montagem do e-mail ────────────────────────────────────
/** Separa tarefas (com prazoISO) em atrasadas (prazo < hoje) e para hoje (== hoje). */
export function agruparPorPrazo(linhas: TarefaLinha[], hoje: string): { atrasadas: TarefaLinha[]; hoje: TarefaLinha[] } {
  const atrasadas: TarefaLinha[] = []
  const doDia: TarefaLinha[] = []
  for (const l of linhas) {
    if (l.prazoISO < hoje) atrasadas.push(l)
    else if (l.prazoISO === hoje) doDia.push(l)
  }
  return { atrasadas, hoje: doDia }
}

function ddmm(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function linhaHtml(l: TarefaLinha, opts?: { comResponsavel?: boolean }): string {
  const ctx: string[] = []
  if (opts?.comResponsavel && l.responsavelNome) ctx.push(l.responsavelNome)
  if (l.contexto) ctx.push(l.contexto)
  const sufixo = ctx.length
    ? ` <span style="color:rgba(2,13,37,0.44);">· ${escapeHtml(ctx.join(" · "))}</span>`
    : ""
  return emailRow(l.titulo, `${ddmm(l.prazoISO)}${sufixo}`, { num: true })
}

function bloco(titulo: string, linhas: TarefaLinha[], opts?: { comResponsavel?: boolean }): string {
  const cabecalho = `<tr><td style="padding:2px 40px 8px;"><p style="margin:0;font-size:13px;font-weight:600;letter-spacing:-0.01em;color:#020D25;">${escapeHtml(titulo)}</p></td></tr>`
  const rows = linhas.map((l) => linhaHtml(l, opts)).join("")
  return cabecalho + emailCard(rows)
}

/** Monta o e-mail (subject/html/text) do relatório de UM usuário. PURO. */
export function montarEmailRelatorio(
  nome: string,
  dados: RelatorioDados,
  base: string | null,
): { subject: string; html: string; text: string } {
  const nAtr = dados.atrasadas.length
  const nHoje = dados.hoje.length
  const vazio = nAtr === 0 && nHoje === 0

  const subject = vazio
    ? "Tarefas do dia — tudo em dia"
    : `Tarefas do dia — ${nAtr} atrasada${nAtr === 1 ? "" : "s"}, ${nHoje} para hoje`

  const introHtml = vazio
    ? "Você não tem tarefas atrasadas nem com prazo para hoje."
    : `Você tem <b>${nAtr}</b> atrasada${nAtr === 1 ? "" : "s"} e <b>${nHoje}</b> com prazo para hoje.`

  let blocos = ""
  if (vazio) {
    blocos += emailCard(
      `<tr><td style="font-size:14px;color:rgba(2,13,37,0.64);padding:3px 0;">Tudo em dia — nenhuma pendência. ✓</td></tr>`,
    )
  } else {
    if (nAtr) blocos += bloco(`Atrasadas (${nAtr})`, dados.atrasadas)
    if (nHoje) blocos += bloco(`Para hoje (${nHoje})`, dados.hoje)
  }

  if (dados.equipe.length) {
    const mostradas = dados.equipe.slice(0, MAX_LINHAS_EQUIPE)
    const resto = dados.equipe.length - mostradas.length
    blocos += bloco(`Equipe — atrasadas (${dados.equipe.length})`, mostradas, { comResponsavel: true })
    if (resto > 0) {
      blocos += `<tr><td style="padding:0 40px 20px;"><p style="margin:0;font-size:12px;color:rgba(2,13,37,0.56);">e mais ${resto} tarefa${resto === 1 ? "" : "s"} atrasada${resto === 1 ? "" : "s"}.</p></td></tr>`
    }
  }

  if (base) blocos += emailButton(`${base}/tarefas`, "Abrir tarefas")

  const html = renderEmail({
    eyebrow: { texto: "Tarefas · Relatório do dia", tom: "ouro" },
    titulo: `Bom dia, ${primeiroNome(nome)}`,
    introHtml,
    blocosHtml: blocos,
  })

  const text = montarTexto(nome, dados, base)
  return { subject, html, text }
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome
}

function montarTexto(nome: string, dados: RelatorioDados, base: string | null): string {
  const linhas: string[] = [`Relatório do dia — ${nome}`, ""]
  const sec = (t: string, arr: TarefaLinha[], comResp?: boolean) => {
    if (!arr.length) return
    linhas.push(`${t}:`)
    for (const l of arr) {
      const resp = comResp && l.responsavelNome ? ` (${l.responsavelNome})` : ""
      const ctx = l.contexto ? ` — ${l.contexto}` : ""
      linhas.push(`  • ${l.titulo}${resp} — ${ddmm(l.prazoISO)}${ctx}`)
    }
    linhas.push("")
  }
  if (!dados.atrasadas.length && !dados.hoje.length) linhas.push("Tudo em dia — nenhuma pendência.", "")
  sec("Atrasadas", dados.atrasadas)
  sec("Para hoje", dados.hoje)
  sec("Equipe — atrasadas", dados.equipe, true)
  if (base) linhas.push(`Abrir tarefas: ${base}/tarefas`)
  return linhas.join("\n")
}

// ── SERVER: coleta + envio ────────────────────────────────────────────────────
export interface EnviarRelatoriosOpts {
  hoje?: string
  horaAtual?: number
  /** Envia só a este e-mail, ignorando hora/opt-in/marcador (botão "testar"). */
  somenteEmail?: string
}

export interface EnviarRelatoriosResult {
  enviados: number
  pulados: number
  falhas: number
}

/**
 * Determina os destinatários e envia o relatório. Best-effort por usuário (uma
 * falha de e-mail não interrompe os demais). Marca no AppSetting quem já recebeu
 * hoje (idempotência); o modo "somenteEmail" (teste) NÃO grava o marcador.
 */
export async function enviarRelatoriosDiarios(opts?: EnviarRelatoriosOpts): Promise<EnviarRelatoriosResult> {
  const hoje = opts?.hoje ?? hojeISO()
  const horaAtual = opts?.horaAtual ?? horaAtualSP()
  const teste = !!opts?.somenteEmail

  const usuarios = await prisma.user.findMany({
    where: { ativo: true, ...(teste ? { email: opts?.somenteEmail } : {}) },
    select: { id: true, email: true, nome: true, role: true, notifPrefs: true },
  })

  const marcador = teste ? {} : (await getSetting<Record<string, string>>(MARCADOR_KEY)) ?? {}

  const destinatarios: Destinatario[] = []
  for (const u of usuarios) {
    if (!u.email) continue
    if (!teste) {
      const prefs = parsePrefs(u.notifPrefs)
      if (!deveEnviarRelatorio(prefs, horaAtual)) continue
      if (marcador[u.email] === hoje) continue // já enviado hoje
    }
    destinatarios.push({ email: u.email, nome: u.nome, gestor: ROLES_GESTOR.has(u.role) })
  }

  if (!destinatarios.length) return { enviados: 0, pulados: 0, falhas: 0 }

  // Tarefas dos destinatários com prazo <= hoje (atrasadas + hoje).
  const emails = destinatarios.map((d) => d.email)
  const pendentes = await prisma.tarefa.findMany({
    where: {
      done: false,
      prazo: { not: null, lte: noon(hoje) },
      responsavel: { email: { in: emails } },
    },
    select: {
      id: true,
      titulo: true,
      prazo: true,
      responsavel: { select: { email: true } },
      cliente: { select: { nome: true } },
      projetoRef: { select: { nome: true } },
    },
  })
  const porEmail = new Map<string, TarefaLinha[]>()
  for (const t of pendentes) {
    const email = t.responsavel?.email
    if (!email || !t.prazo) continue
    const linha: TarefaLinha = {
      id: t.id,
      titulo: t.titulo,
      prazoISO: toISODate(t.prazo),
      contexto: t.cliente?.nome ?? t.projetoRef?.nome ?? null,
    }
    const arr = porEmail.get(email)
    if (arr) arr.push(linha)
    else porEmail.set(email, [linha])
  }

  // Atrasadas da equipe inteira (só se houver algum gestor entre os destinatários).
  let equipe: TarefaLinha[] = []
  if (destinatarios.some((d) => d.gestor)) {
    const atrasadasEquipe = await prisma.tarefa.findMany({
      where: { done: false, prazo: { not: null, lt: noon(hoje) }, responsavelId: { not: null } },
      orderBy: { prazo: "asc" },
      select: {
        id: true,
        titulo: true,
        prazo: true,
        responsavel: { select: { nome: true } },
        cliente: { select: { nome: true } },
        projetoRef: { select: { nome: true } },
      },
    })
    equipe = atrasadasEquipe
      .filter((t) => t.prazo)
      .map((t) => ({
        id: t.id,
        titulo: t.titulo,
        prazoISO: toISODate(t.prazo as Date),
        contexto: t.cliente?.nome ?? t.projetoRef?.nome ?? null,
        responsavelNome: t.responsavel?.nome ?? null,
      }))
  }

  const base = baseUrl()
  const mailer = getMailer()
  let enviados = 0
  let falhas = 0

  for (const d of destinatarios) {
    const { atrasadas, hoje: doDia } = agruparPorPrazo(porEmail.get(d.email) ?? [], hoje)
    const dados: RelatorioDados = { atrasadas, hoje: doDia, equipe: d.gestor ? equipe : [] }
    const { subject, html, text } = montarEmailRelatorio(d.nome, dados, base)
    try {
      await mailer.enviar({ to: d.email, subject, html, text })
      enviados++
      if (!teste) marcador[d.email] = hoje
    } catch (e) {
      falhas++
      log.error({ to: d.email, err: e instanceof Error ? e.message : String(e) }, "relatório diário: falha ao enviar")
    }
  }

  if (!teste && enviados > 0) await setSetting(MARCADOR_KEY, marcador)

  return { enviados, pulados: 0, falhas }
}
