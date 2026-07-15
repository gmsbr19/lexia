// Disparadores de notificação por EVENTO de negócio. SERVER ONLY.
// Contrato: NUNCA lançam para o chamador (uma falha de notificação jamais quebra
// a mutation). Cada função tem try/catch total — chame-as com `void`, sem await.
// Resolução de destinatários reusa recipients.ts; a escrita/emoção via service.ts.
import { log } from "@/lib/log"
import { avisarGestoresConclusao, getNotificacoesConfig } from "@/lib/settings"
import { getPrefs, querConclusoesEquipe } from "./preferencias"
import { emailDoUsuario, gestorEmails, nomePorEmail } from "./recipients"
import { type CriarNotificacaoInput, criarNotificacao } from "./service"
import { msgTarefaAtribuida, msgTarefaConcluida } from "./tarefa-msg"

async function entregar(input: CriarNotificacaoInput): Promise<void> {
  try {
    await criarNotificacao(input)
  } catch (e) {
    log.error({ tipo: input.tipo, err: e instanceof Error ? e.message : String(e) }, "trigger de notificação falhou")
  }
}

/** Dispara para vários destinatários, pulando o ator (não se auto-notifica). */
async function paraGestores(
  emails: string[],
  actorEmail: string | null | undefined,
  build: (to: string) => CriarNotificacaoInput,
): Promise<void> {
  const vistos = new Set<string>()
  for (const to of emails) {
    if (!to || vistos.has(to)) continue
    if (actorEmail && to === actorEmail) continue
    vistos.add(to)
    await entregar(build(to))
  }
}

// ── Tarefas (regras de delegação) ────────────────────────────────────────────
export async function notificarTarefaAtribuida(p: {
  tarefaId: number
  titulo: string
  responsavelId: number
  actorEmail?: string | null
  prazo?: Date | null
}): Promise<void> {
  try {
    const to = await emailDoUsuario(p.responsavelId)
    if (!to || (p.actorEmail && to === p.actorEmail)) return // não notifica auto-atribuição
    const atorNome = await nomePorEmail(p.actorEmail)
    await entregar({
      userEmail: to,
      tipo: "tarefa",
      modulo: "tarefas",
      refTipo: "tarefa",
      refId: p.tarefaId,
      mensagem: msgTarefaAtribuida({ atorNome, titulo: p.titulo, prazo: p.prazo }),
      actorEmail: p.actorEmail ?? null,
    })
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarTarefaAtribuida falhou")
  }
}

/**
 * Conclusão de tarefa → avisa (a) quem criou/delegou a tarefa e (b), quando a
 * regra do escritório está ligada, os sócios como supervisão — mesmo que não
 * tenham criado a tarefa. Ninguém é avisado da própria conclusão, e o criador
 * sócio recebe uma vez só.
 */
export async function notificarTarefaConcluida(p: {
  tarefaId: number
  titulo: string
  criadoPorId: number | null
  actorEmail?: string | null
  concluidoEm?: Date | null
}): Promise<void> {
  try {
    const destinos = new Set<string>()

    const criador = await emailDoUsuario(p.criadoPorId)
    // pula quando quem concluiu é o próprio criador
    if (criador && !(p.actorEmail && criador === p.actorEmail)) destinos.add(criador)

    if (avisarGestoresConclusao(await getNotificacoesConfig())) {
      for (const gestor of await gestorEmails()) {
        if (!gestor || destinos.has(gestor)) continue
        if (p.actorEmail && gestor === p.actorEmail) continue
        if (!querConclusoesEquipe(await getPrefs(gestor))) continue // opt-out pessoal
        destinos.add(gestor)
      }
    }
    if (destinos.size === 0) return

    const atorNome = await nomePorEmail(p.actorEmail) // quem concluiu (ator do evento)
    const mensagem = msgTarefaConcluida({ atorNome, titulo: p.titulo, concluidoEm: p.concluidoEm })
    for (const to of destinos) {
      await entregar({
        userEmail: to,
        tipo: "tarefa",
        modulo: "tarefas",
        refTipo: "tarefa",
        refId: p.tarefaId,
        mensagem,
        actorEmail: p.actorEmail ?? null,
      })
    }
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarTarefaConcluida falhou")
  }
}

// ── Agenda ───────────────────────────────────────────────────────────────────
export async function notificarEventoAtribuido(p: {
  eventoId: number
  titulo: string
  responsavelId: number
  actorEmail?: string | null
}): Promise<void> {
  try {
    const to = await emailDoUsuario(p.responsavelId)
    if (!to || (p.actorEmail && to === p.actorEmail)) return
    await entregar({
      userEmail: to,
      tipo: "compromisso",
      modulo: "agenda",
      refTipo: "evento",
      refId: p.eventoId,
      mensagem: `Compromisso atribuído a você: "${p.titulo}"`,
      actorEmail: p.actorEmail ?? null,
    })
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarEventoAtribuido falhou")
  }
}

// ── Processos & Prazos ───────────────────────────────────────────────────────
export async function notificarPrazoConfirmado(p: {
  prazoId: number
  descricao: string
  processoId: number | null
  responsavelUserId: number | null
  actorEmail?: string | null
  dataFatalISO?: string | null
}): Promise<void> {
  try {
    const venc = p.dataFatalISO ? ` — vence ${p.dataFatalISO}` : ""
    const msg = `Prazo confirmado: "${p.descricao}"${venc}`
    const resp = await emailDoUsuario(p.responsavelUserId)
    if (resp && !(p.actorEmail && resp === p.actorEmail)) {
      await entregar({
        userEmail: resp,
        tipo: "prazo",
        modulo: "processos",
        refTipo: "prazo",
        refId: p.prazoId,
        processoId: p.processoId,
        mensagem: msg,
        prioridade: "alta",
        actorEmail: p.actorEmail ?? null,
      })
    }
    // cópia ao gestor (supervisão), exceto o próprio responsável (já avisado) e o ator
    const gestores = (await gestorEmails()).filter((g) => g !== resp)
    await paraGestores(gestores, p.actorEmail, (to) => ({
      userEmail: to,
      tipo: "prazo",
      modulo: "processos",
      refTipo: "prazo",
      refId: p.prazoId,
      processoId: p.processoId,
      mensagem: msg,
      prioridade: "alta",
      actorEmail: p.actorEmail ?? null,
    }))
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarPrazoConfirmado falhou")
  }
}

export async function notificarPrazoCumprido(p: {
  prazoId: number
  descricao: string
  processoId: number | null
  actorEmail?: string | null
}): Promise<void> {
  try {
    const gestores = await gestorEmails()
    await paraGestores(gestores, p.actorEmail, (to) => ({
      userEmail: to,
      tipo: "prazo",
      modulo: "processos",
      refTipo: "prazo",
      refId: p.prazoId,
      processoId: p.processoId,
      mensagem: `Prazo cumprido: "${p.descricao}"`,
      prioridade: "baixa",
      actorEmail: p.actorEmail ?? null,
    }))
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarPrazoCumprido falhou")
  }
}

// ── Comercial ────────────────────────────────────────────────────────────────
export async function notificarLeadConvertido(p: {
  leadId: number
  nome: string
  actorEmail?: string | null
}): Promise<void> {
  try {
    const gestores = await gestorEmails()
    await paraGestores(gestores, null /* avisa todos os gestores, inclusive quem converteu */, (to) => ({
      userEmail: to,
      tipo: "lead",
      modulo: "comercial",
      refTipo: "lead",
      refId: p.leadId,
      mensagem: `Lead convertido: ${p.nome}`,
      prioridade: "normal",
      actorEmail: p.actorEmail ?? null,
    }))
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarLeadConvertido falhou")
  }
}

// ── Documentos ───────────────────────────────────────────────────────────────
export async function notificarDocumento(p: {
  documentoId: number
  nome: string
  status: string // 'enviado' | 'fechado'
  criadoPor?: string | null
  actorEmail?: string | null
}): Promise<void> {
  try {
    const verbo = p.status === "fechado" ? "contrato fechado" : "enviado para assinatura"
    const msg = `Documento ${verbo}: ${p.nome}`
    const destinos = new Set<string>()
    if (p.criadoPor) destinos.add(p.criadoPor)
    for (const g of await gestorEmails()) destinos.add(g)
    for (const to of destinos) {
      if (p.actorEmail && to === p.actorEmail) continue
      await entregar({
        userEmail: to,
        tipo: "documento",
        modulo: "documentos",
        refTipo: "documento",
        refId: p.documentoId,
        mensagem: msg,
        prioridade: "normal",
        actorEmail: p.actorEmail ?? null,
      })
    }
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarDocumento falhou")
  }
}

// ── LexIA (conclusão em segundo plano) ───────────────────────────────────────
/**
 * Avisa o próprio usuário que a LexIA terminou um turno enquanto a barra estava
 * fechada (ele delegou algo e foi trabalhar). É uma AUTO-notificação — não pula
 * o ator (o "ator" é a LexIA, não o usuário). `resumo` é o pedido do usuário,
 * truncado no cliente; o link reabre a conversa.
 */
export async function notificarLexiaConcluiu(p: {
  userEmail: string
  conversaId: number | null
  resumo?: string | null
}): Promise<void> {
  try {
    const resumo = (p.resumo ?? "").trim()
    const mensagem = resumo ? `LexIA concluiu: "${resumo}"` : "LexIA concluiu sua solicitação"
    await entregar({
      userEmail: p.userEmail,
      tipo: "lexia",
      modulo: "ia",
      refTipo: "conversa",
      refId: p.conversaId,
      link: p.conversaId ? `/lexia?conversa=${p.conversaId}` : "/lexia",
      mensagem,
      prioridade: "normal",
    })
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarLexiaConcluiu falhou")
  }
}

// ── Sistema ──────────────────────────────────────────────────────────────────
export async function notificarCapturaFalha(p: {
  fonte: string
  escopo: string
  erro?: string | null
}): Promise<void> {
  try {
    const gestores = await gestorEmails()
    const grupoKey = `captura-falha-${p.fonte}`
    for (const to of gestores) {
      await entregar({
        userEmail: to,
        tipo: "captura",
        modulo: "sistema",
        refTipo: "captura",
        refId: null,
        link: "/processos?view=captura",
        mensagem: `Falha na captura ${p.fonte} (${p.escopo})${p.erro ? `: ${p.erro}` : ""}`,
        prioridade: "alta",
        grupoKey, // agrupa falhas repetidas da mesma fonte
      })
    }
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, "notificarCapturaFalha falhou")
  }
}
