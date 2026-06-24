// Abstração plugável de envio de e-mail. SERVER ONLY. Mesmo padrão do AnexoStore
// (src/lib/lexia/anexos/storage.ts): troca o backend sem mexer no resto.
// Sem SMTP configurado, usa o noopMailer → o app funciona 100% (só registra log).
import { env } from "@/lib/env"
import { log } from "@/lib/log"
import { getGraphToken } from "@/lib/graph/token"
import { currentRequestOrigin } from "@/lib/request-origin"

export interface EmailMsg {
  to: string
  subject: string
  html: string
  text: string
}

export interface Mailer {
  readonly ativo: boolean
  enviar(msg: EmailMsg): Promise<void>
}

const noopMailer: Mailer = {
  ativo: false,
  async enviar(msg) {
    log.info({ to: msg.to, subject: msg.subject }, "email (noop — nenhum backend configurado)")
  },
}

function smtpMailer(): Mailer {
  // nodemailer é importado dinamicamente só quando o canal está ativo (não pesa
  // o bundle/boot quando o e-mail não é usado). O transport é criado uma vez.
  let transportP: Promise<import("nodemailer").Transporter> | null = null
  const getTransport = () => {
    if (!transportP) {
      transportP = import("nodemailer").then((m) =>
        m.default.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT ?? 587,
          secure: env.SMTP_SECURE,
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        }),
      )
    }
    return transportP
  }
  return {
    ativo: true,
    async enviar(msg) {
      const transport = await getTransport()
      await transport.sendMail({
        from: env.SMTP_FROM ?? env.SMTP_USER,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      })
    },
  }
}

// Envio via Microsoft Graph (POST /users/{sender}/sendMail) com token de
// aplicação (client credentials). O remetente é a caixa GRAPH_MAIL_SENDER —
// não há campo `from` em EmailMsg, igual ao SMTP.
function graphMailer(): Mailer {
  const sender = env.GRAPH_MAIL_SENDER as string
  return {
    ativo: true,
    async enviar(msg) {
      const token = await getGraphToken({
        tenantId: env.GRAPH_TENANT_ID as string,
        clientId: env.GRAPH_CLIENT_ID as string,
        clientSecret: env.GRAPH_CLIENT_SECRET as string,
      })
      const toRecipients = msg.to
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((address) => ({ emailAddress: { address } }))
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            subject: msg.subject,
            body: { contentType: "HTML", content: msg.html },
            toRecipients,
          },
          saveToSentItems: true,
        }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => "")
        throw new Error(`Graph sendMail falhou (${res.status}): ${detail.slice(0, 300)}`)
      }
    },
  }
}

/** Graph configurado? (todas as vars de app + caixa remetente presentes) */
function graphConfigurado(): boolean {
  return !!(env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET && env.GRAPH_MAIL_SENDER)
}

export type MailBackend = "graph" | "smtp" | "noop"

/** Decide o backend a partir de MAIL_PROVIDER + vars presentes. */
function selecionarBackend(): MailBackend {
  if (env.MAIL_PROVIDER === "graph") return graphConfigurado() ? "graph" : "noop"
  if (env.MAIL_PROVIDER === "smtp") return env.SMTP_HOST ? "smtp" : "noop"
  if (graphConfigurado()) return "graph"
  if (env.SMTP_HOST) return "smtp"
  return "noop"
}

let cached: Mailer | null = null
let cachedKind: MailBackend = "noop"
export function getMailer(): Mailer {
  if (!cached) {
    cachedKind = selecionarBackend()
    cached = cachedKind === "graph" ? graphMailer() : cachedKind === "smtp" ? smtpMailer() : noopMailer
  }
  return cached
}

/** Backend de e-mail ativo + se está utilizável — para o painel de diagnóstico. */
export function mailerStatus(): { backend: MailBackend; ativo: boolean } {
  getMailer()
  return { backend: cachedKind, ativo: cachedKind !== "noop" }
}

/** Base absoluta p/ os deep-links do e-mail. Cadeia de prioridade:
 *  APP_BASE_URL (produção explícita) → origin param (ngrok/VPS via request)
 *  → AUTH_URL (NextAuth) → null (sem deep-link no e-mail). */
export function baseUrl(origin?: string | null): string | null {
  return env.APP_BASE_URL ?? origin ?? currentRequestOrigin() ?? process.env.AUTH_URL ?? null
}

/** O canal de e-mail está utilizável? Basta o SMTP — sem `baseUrl` o e-mail é
 *  enviado mesmo assim, só sem o botão de deep-link. */
export function emailDisponivel(): boolean {
  return getMailer().ativo
}
