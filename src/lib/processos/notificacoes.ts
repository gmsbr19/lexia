// Notifications "job" logic. SERVER ONLY. The app is request-driven (no worker),
// so this is invoked by POST /api/jobs/notificacoes (guarded by a shared-secret
// env token), triggered by an external cron — matching the systemd/Litestream
// deploy model (DEPLOY.md §6). Idempotent: every notification has a deterministic
// `dedupeKey`, so re-running the job creates nothing new.
//
// Every notification flows through the central service (src/lib/notificacoes/service),
// which ALSO publishes to the in-process bus → SSE → live toast. So a deadline that
// the cron surfaces pops in real time for any user with an open tab.
import { avaliarEAplicarPerdaAutomatica } from "@/lib/comercial/atividades"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { criarNotificacao } from "@/lib/notificacoes/service"
import { gestorEmails } from "@/lib/notificacoes/recipients"
import type { Modulo, Prioridade } from "@/lib/notificacoes/types"
import { getFollowupConfig, getModulosConfig, processosHabilitado } from "@/lib/settings"
import { addDiasISO, hojeISO } from "./datas"

function noon(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}
const iso = (d: Date): string => d.toISOString().slice(0, 10)

export interface GerarNotificacoesResult {
  criadas: number
  jaExistiam: number
}

// Day offsets for Tarefa.reminder labels (sub-day reminders + "Na data do prazo"
// collapse to 0 — the reminder granularity equals the cron cadence).
const REMINDER_OFFSET_DIAS: Record<string, number> = { "1 dia antes": 1 }

/**
 * Scan upcoming/overdue prazos, compromissos (eventos), tarefas (prazo + lembrete)
 * within the configured look-ahead window and create a Notificacao per responsible
 * user. Unassigned items are skipped (no destinatário). Pass `now`/`antecedenciaDias`
 * for tests/manual runs.
 */
export async function gerarNotificacoes(opts?: { hoje?: string; antecedenciaDias?: number }): Promise<GerarNotificacoesResult> {
  const hoje = opts?.hoje ?? hojeISO()
  const dias = opts?.antecedenciaDias ?? env.NOTIF_ANTECEDENCIA_DIAS
  const limite = addDiasISO(hoje, dias)
  const processosOk = processosHabilitado(await getModulosConfig())

  let criadas = 0
  let jaExistiam = 0

  const upsert = async (
    userEmail: string,
    tipo: string,
    refTipo: string,
    refId: number,
    janela: string,
    mensagem: string,
    extra: { modulo: Modulo; prioridade?: Prioridade; processoId?: number | null },
  ) => {
    const row = await criarNotificacao({
      userEmail,
      tipo,
      refTipo,
      refId,
      mensagem,
      // dedupeKey é GLOBAL @unique → inclui o destinatário, senão a cópia ao 2º
      // gestor colidiria com a do 1º e só um receberia.
      dedupeKey: `${tipo}-${refTipo}-${refId}-${janela}-${userEmail}`,
      modulo: extra.modulo,
      prioridade: extra.prioridade ?? "normal",
      processoId: extra.processoId ?? null,
    })
    if (row) criadas++
    else jaExistiam++
  }

  // ── Prazos (pendentes + propostos pela IA) — puladas por inteiro quando Casos &
  // Processos está temporariamente desativado (Configurações → Módulos).
  if (processosOk) {
    // ── Prazos pendentes vencendo (ou vencidos) até o limite, com responsável ──
    // O advogado responsável é o destinatário primário; os sócios/gestores recebem
    // uma CÓPIA de cada prazo (responsabilidade é do advogado, supervisão é do gestor).
    const gestores = await gestorEmails()
    const prazos = await prisma.prazo.findMany({
      where: {
        excluidoEm: null,
        status: "pendente",
        dataFatal: { lte: noon(limite) },
        responsavelUserId: { not: null },
        processo: { excluidoEm: null },
      },
      select: {
        id: true,
        descricao: true,
        dataFatal: true,
        responsavelUser: { select: { email: true, nome: true } },
        processo: { select: { id: true, numeroCnj: true } },
      },
    })
    for (const p of prazos) {
      const email = p.responsavelUser?.email
      if (!email) continue
      const fatalISO = iso(p.dataFatal)
      const vencido = fatalISO < hoje
      const venc = vencido ? "VENCIDO" : `vence ${fatalISO}`
      const ref = p.processo?.numeroCnj ? ` (${p.processo.numeroCnj})` : ""
      const prioridade: Prioridade = vencido ? "alta" : "normal"
      const processoId = p.processo?.id ?? null
      await upsert(email, "prazo", "prazo", p.id, fatalISO, `Prazo "${p.descricao}"${ref} — ${venc}`, {
        modulo: "processos",
        prioridade,
        processoId,
      })
      // cópia ao gestor (janela "-g" no dedupeKey p/ não colidir com a do responsável)
      const resp = p.responsavelUser?.nome ? ` · resp. ${p.responsavelUser.nome}` : ""
      for (const g of gestores) {
        if (g === email) continue // o gestor já é o responsável
        await upsert(g, "prazo", "prazo", p.id, `${fatalISO}-g`, `Prazo "${p.descricao}"${ref} — ${venc}${resp}`, {
          modulo: "processos",
          prioridade,
          processoId,
        })
      }
    }

    // ── Prazos PROPOSTOS pela IA, aguardando confirmação — só ao advogado responsável ──
    // (rascunho; NÃO copia o gestor — a cópia ao gestor só vale após confirmar).
    const propostos = await prisma.prazo.findMany({
      where: { excluidoEm: null, status: "proposto", processo: { excluidoEm: null } },
      select: {
        id: true,
        descricao: true,
        responsavelUser: { select: { email: true } },
        processo: { select: { id: true, numeroCnj: true } },
      },
    })
    for (const p of propostos) {
      const ref = p.processo?.numeroCnj ? ` (${p.processo.numeroCnj})` : ""
      const msg = `Prazo proposto pela IA a confirmar: "${p.descricao}"${ref}`
      const processoId = p.processo?.id ?? null
      const email = p.responsavelUser?.email
      if (email) {
        await upsert(email, "prazo-proposto", "prazo", p.id, "proposto", msg, { modulo: "processos", processoId })
      } else {
        // rascunho sem responsável: aciona o gestor para não ficar sem dono e sem alerta
        for (const g of gestores)
          await upsert(g, "prazo-proposto", "prazo", p.id, "proposto-g", `${msg} — sem responsável`, {
            modulo: "processos",
            processoId,
          })
      }
    }
  }

  // ── Compromissos (audiência/perícia/reunião) próximos, com responsável ──
  const eventos = await prisma.evento.findMany({
    where: {
      status: "confirmado",
      tipo: { in: ["audiencia", "pericia", "reuniao", "prazo"] },
      dataInicio: { gte: noon(hoje), lte: noon(limite) },
      responsavelId: { not: null },
    },
    select: { id: true, titulo: true, tipo: true, dataInicio: true, responsavel: { select: { email: true } } },
  })
  for (const e of eventos) {
    const email = e.responsavel?.email
    if (!email) continue
    const dataISO = iso(e.dataInicio)
    await upsert(email, "compromisso", "evento", e.id, dataISO, `${e.titulo} — ${dataISO}`, { modulo: "agenda" })
  }

  // ── Tarefas com prazo próximo, não concluídas, com responsável ──
  const tarefas = await prisma.tarefa.findMany({
    where: {
      done: false,
      prazo: { not: null, lte: noon(limite) },
      responsavelId: { not: null },
    },
    select: { id: true, titulo: true, prazo: true, responsavel: { select: { email: true } } },
  })
  for (const t of tarefas) {
    const email = t.responsavel?.email
    if (!email || !t.prazo) continue
    const prazoISO = iso(t.prazo)
    const prioridade: Prioridade = prazoISO < hoje ? "alta" : "normal"
    await upsert(email, "tarefa", "tarefa", t.id, prazoISO, `Tarefa "${t.titulo}" — prazo ${prazoISO}`, {
      modulo: "tarefas",
      prioridade,
    })
  }

  // ── Follow-up de oportunidades (Comercial), vencido ou dentro da janela ──
  const followUps = await prisma.lead.findMany({
    where: {
      etapa: { notIn: ["ganho", "perdido"] },
      proximaAcaoEm: { not: null, lte: noon(limite) },
      responsavelUserId: { not: null },
    },
    select: { id: true, nome: true, proximaAcaoEm: true, responsavelUser: { select: { email: true } } },
  })
  for (const l of followUps) {
    const email = l.responsavelUser?.email
    if (!email || !l.proximaAcaoEm) continue
    const acaoISO = iso(l.proximaAcaoEm)
    const vencido = acaoISO < hoje
    const prioridade: Prioridade = vencido ? "alta" : "normal"
    await upsert(email, "lead-followup", "lead", l.id, acaoISO, `Follow-up "${l.nome}" — ${vencido ? "VENCIDO" : "hoje"}`, {
      modulo: "comercial",
      prioridade,
    })
  }

  // ── Auto-perdido (Comercial): varredura catch-up ──────────────────────────
  // O caminho principal roda síncrono em atividades.ts criarAtividade; este
  // bloco só cobre mudança de limiar na config (recalibração retroativa) e
  // qualquer falha pontual do caminho síncrono. Idempotente por construção: um
  // lead marcado perdido sai do `etapa: {notIn}` no próximo run, nunca
  // re-dispara notificação.
  const leadsAbertos = await prisma.lead.findMany({
    where: { etapa: { notIn: ["ganho", "perdido"] } },
    select: { id: true, nome: true, responsavelUserId: true },
  })
  if (leadsAbertos.length) {
    const followupCfg = await getFollowupConfig()
    const atividadesTodas = await prisma.oportunidadeAtividade.findMany({
      where: { leadId: { in: leadsAbertos.map((l) => l.id) } },
      orderBy: { ocorreuEm: "asc" },
      select: { leadId: true, resultado: true, ocorreuEm: true },
    })
    const porLead = new Map<number, { resultado: string | null; ocorreuEm: string }[]>()
    for (const a of atividadesTodas) {
      const arr = porLead.get(a.leadId) ?? []
      arr.push({ resultado: a.resultado, ocorreuEm: a.ocorreuEm.toISOString() })
      porLead.set(a.leadId, arr)
    }
    for (const l of leadsAbertos) {
      await avaliarEAplicarPerdaAutomatica(l, porLead.get(l.id) ?? [], followupCfg.regrasPerda)
    }
  }

  // ── Lembretes de tarefas (Tarefa.reminder) — disparados pela cadência do cron ──
  // O alvo é a data AGENDADA (`data`) menos o offset do label; idempotente por janela.
  const tarefasLembrete = await prisma.tarefa.findMany({
    where: { done: false, reminder: { not: null }, data: { not: null }, responsavelId: { not: null } },
    select: { id: true, titulo: true, data: true, reminder: true, responsavel: { select: { email: true } } },
  })
  for (const t of tarefasLembrete) {
    const email = t.responsavel?.email
    if (!email || !t.data || !t.reminder || t.reminder === "Sem lembrete") continue
    const dataISO = iso(t.data)
    const offset = REMINDER_OFFSET_DIAS[t.reminder] ?? 0
    const lembreteISO = addDiasISO(dataISO, -offset)
    if (hoje < lembreteISO || hoje > dataISO) continue // ainda não é hora, ou a data já passou
    await upsert(email, "lembrete", "tarefa", t.id, lembreteISO, `Lembrete: "${t.titulo}" em ${dataISO}`, {
      modulo: "tarefas",
    })
  }

  return { criadas, jaExistiam }
}
