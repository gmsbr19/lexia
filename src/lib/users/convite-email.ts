// E-mail de convite de acesso — modelo 03 ("Convite / novo usuário") do design
// system "LexIA · Sistema de e-mails", via lib/notificacoes/email/layout.
// SERVER ONLY. Envio best-effort: nunca lança e retorna `false` quando o canal
// está em noop (sem SMTP/Graph) ou em erro, para o admin saber que precisa
// copiar o link manualmente.
import { log } from "@/lib/log"
import {
  emailButton,
  emailCard,
  emailFinePrint,
  emailRow,
  escapeHtml,
  renderEmail,
} from "@/lib/notificacoes/email/layout"
import { getMailer } from "@/lib/notificacoes/email/mailer"

export interface ConviteEmailEntrada {
  nome: string
  /** E-mail de acesso do convidado (mostrado no card). Opcional. */
  email?: string | null
  /** link ABSOLUTO da página de ativação, ou null (sem base configurada). */
  url: string | null
}

export function renderEmailConvite(e: ConviteEmailEntrada): { subject: string; html: string; text: string } {
  const subject = "Você foi convidado para o LexIA"
  const nome = escapeHtml(e.nome.trim().split(/\s+/)[0] || e.nome)

  const card = e.email
    ? emailCard(emailRow("E-mail de acesso", escapeHtml(e.email)))
    : ""

  const blocos =
    card +
    (e.url ? emailButton(e.url, "Criar meu acesso") : "") +
    emailFinePrint(
      `Você definirá sua própria senha no próximo passo. O convite é pessoal e expira em <span style="color:#020D25;font-weight:500;">7 dias</span>. Não esperava este convite? É só ignorar este e-mail.`,
    )

  const html = renderEmail({
    eyebrow: { texto: "Convite para o escritório", tom: "ouro" },
    titulo: "Você foi convidado para o LexIA",
    introHtml: `Olá, ${nome}. Sua conta no LexIA foi criada. Crie seu acesso para começar a gerar documentos, acompanhar casos e prazos.`,
    blocosHtml: blocos,
  })

  const text = `Olá, ${e.nome}.

Sua conta no LexIA foi criada. Para ativá-la, defina a sua senha e confirme o seu nome:
${e.url ? `\n${e.url}\n` : ""}
Este link é pessoal e expira em 7 dias.

— LexIA · NCM Advogados`

  return { subject, html, text }
}

/** Envia o convite. Retorna true só quando o e-mail foi de fato despachado. */
export async function enviarConvite(to: string, nome: string, url: string | null): Promise<boolean> {
  const mailer = getMailer()
  if (!mailer.ativo) return false
  const { subject, html, text } = renderEmailConvite({ nome, email: to, url })
  try {
    await mailer.enviar({ to, subject, html, text })
    return true
  } catch (err) {
    log.error({ to, err: err instanceof Error ? err.message : String(err) }, "envio do convite de acesso falhou")
    return false
  }
}
