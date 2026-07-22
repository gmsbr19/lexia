// Envio best-effort do e-mail de uma notificação. SERVER ONLY. Nunca lança —
// uma falha de SMTP só vira log e jamais afeta a notificação in-app/mutation.
import { log } from "@/lib/log"
import type { Modulo, Prioridade } from "../types"
import { baseUrl, emailDisponivel, getMailer } from "./mailer"
import { renderEmailNotificacao } from "./render"

export interface EnviarEntrada {
  to: string
  mensagem: string
  modulo: Modulo | null
  prioridade: Prioridade
  /** rota interna (relativa); vira URL absoluta com a base do app. */
  link: string | null
  /** corpo HTML rico opcional (ex.: texto do comentário). */
  corpoHtml?: string | null
  /** rótulo do CTA (default "Abrir no LexIA"). */
  ctaLabel?: string | null
}

export async function enviarEmailNotificacao(e: EnviarEntrada): Promise<void> {
  if (!emailDisponivel()) return
  const base = baseUrl()
  const url = e.link && base ? `${base}${e.link}` : null
  const { subject, html, text } = renderEmailNotificacao({
    mensagem: e.mensagem,
    modulo: e.modulo,
    prioridade: e.prioridade,
    url,
    corpoHtml: e.corpoHtml ?? null,
    ctaLabel: e.ctaLabel ?? null,
  })
  try {
    await getMailer().enviar({ to: e.to, subject, html, text })
  } catch (err) {
    log.error({ to: e.to, err: err instanceof Error ? err.message : String(err) }, "envio de e-mail de notificação falhou")
  }
}
