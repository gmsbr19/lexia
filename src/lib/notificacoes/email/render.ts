// Renderização do e-mail de notificação — modelo 01 ("Notificação") do design
// system "LexIA · Sistema de e-mails". HTML email-safe via lib/email/layout.
// PURO/testável.
import { MODULO_LABEL, type Modulo, type Prioridade } from "../types"
import {
  emailButton,
  emailFinePrint,
  escapeHtml,
  renderEmail,
  type EmailTone,
} from "./layout"

export interface EmailEntrada {
  mensagem: string
  modulo: Modulo | null
  prioridade: Prioridade
  /** deep-link ABSOLUTO já montado (base + rota), ou null. */
  url: string | null
}

/** Tom do eyebrow: ouro reservado à LexIA, alerta para alta/crítica. */
function tomDe(modulo: Modulo | null, prioridade: Prioridade): EmailTone {
  if (modulo === "ia") return "ouro"
  if (prioridade === "alta" || prioridade === "critica") return "alerta"
  return "neutro"
}

export function renderEmailNotificacao(e: EmailEntrada): { subject: string; html: string; text: string } {
  const tag = e.modulo ? MODULO_LABEL[e.modulo] : "LexIA"
  const subject = `[LexIA · ${tag}] ${e.mensagem}`.replace(/\s+/g, " ").trim().slice(0, 160)

  const blocos =
    (e.url ? emailButton(e.url, "Abrir no LexIA") : "") +
    emailFinePrint(
      `Você recebe este aviso porque acompanha ${escapeHtml(tag)} no LexIA. Ajuste a frequência em Configurações › Notificações.`,
    )

  const html = renderEmail({
    eyebrow: { texto: tag, tom: tomDe(e.modulo, e.prioridade) },
    titulo: e.mensagem,
    blocosHtml: blocos,
  })

  const text = `${e.mensagem}${e.url ? `\n\nAbrir: ${e.url}` : ""}\n\n— LexIA · ${tag}`
  return { subject, html, text }
}
