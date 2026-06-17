// Primitivas de layout para todos os e-mails do app — HTML "email-safe"
// (tabelas + estilos inline, largura fixa 600px). Recria o design system
// "LexIA · Sistema de e-mails": header navy com a assinatura Lex+IA e régua
// dourada, corpo claro, eyebrow colorido por tom, card de detalhe FAFAF7,
// CTA único dourado (ou outline secundário) e rodapé com a assinatura do
// escritório. PURO/testável — sem Prisma/env.

// Tokens do design system (mantidos como literais para sobreviverem em
// clientes de e-mail que ignoram CSS/variáveis).
export const EMAIL = {
  navy: "#020D25",
  gold: "#C0A147",
  ink: "#020D25",
  /** Texto de leitura — navy a 64%. */
  body: "rgba(2,13,37,0.64)",
  /** Notas/legendas — navy a 56%. */
  note: "rgba(2,13,37,0.56)",
  /** Rótulos de linha — navy a 44%. */
  faint: "rgba(2,13,37,0.44)",
  surface: "#FAFAF7",
  line: "rgba(2,13,37,0.08)",
  logoInk: "#F5F1E4",
  link: "#9A7F2E",
} as const

/** Tons de eyebrow / badge (cor do texto, fundo do badge). */
export type EmailTone = "neutro" | "ouro" | "alerta" | "sucesso"
const TONE: Record<EmailTone, { fg: string; badgeBg: string }> = {
  neutro: { fg: EMAIL.faint, badgeBg: "rgba(2,13,37,0.06)" },
  ouro: { fg: EMAIL.link, badgeBg: "rgba(180,126,18,0.12)" },
  alerta: { fg: "#B47E12", badgeBg: "rgba(180,126,18,0.12)" },
  sucesso: { fg: "#1F8A4C", badgeBg: "rgba(31,138,76,0.10)" },
}

/** Assinatura do escritório no rodapé (compartilhada por todos os modelos). */
const ESCRITORIO = {
  nome: "NCM Advogados",
  endereco:
    "Av. Marquês de São Vicente, 1619, Sala 505 · Barra Funda, São Paulo - SP · CEP 01139-003",
  email: "contato@ncm.adv.br",
} as const

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const FONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

/** Eyebrow em caixa alta acima do título, colorido pelo tom. */
export function emailEyebrow(text: string, tone: EmailTone = "neutro"): string {
  return `<p style="margin:0 0 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:${TONE[tone].fg};">${escapeHtml(text)}</p>`
}

/** Badge de status (pílula) — usado no canto dos cards. */
export function emailBadge(text: string, tone: EmailTone = "neutro"): string {
  const t = TONE[tone]
  return `<span style="display:inline-block;font-size:12px;font-weight:500;color:${t.fg};background:${t.badgeBg};border-radius:6px;padding:5px 11px;">${escapeHtml(text)}</span>`
}

/** Linha rótulo→valor de um card de detalhe. `value` já deve vir escapado/markup. */
export function emailRow(label: string, valueHtml: string, opts?: { num?: boolean }): string {
  const num = opts?.num ? "font-variant-numeric:tabular-nums;" : ""
  return `<tr>
    <td style="font-size:14px;color:${EMAIL.body};padding:3px 0;">${escapeHtml(label)}</td>
    <td align="right" style="font-size:14px;font-weight:500;color:${EMAIL.ink};padding:3px 0;${num}">${valueHtml}</td>
  </tr>`
}

/** Card de detalhe FAFAF7 que envolve um conjunto de `emailRow`. */
export function emailCard(rowsHtml: string): string {
  return `<tr><td style="padding:0 40px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL.surface};border:1px solid ${EMAIL.line};border-radius:14px;border-collapse:separate;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
      </td></tr>
    </table>
  </td></tr>`
}

/** CTA único. `variant:"primary"` = botão dourado; `"secondary"` = outline. */
export function emailButton(
  href: string,
  label: string,
  variant: "primary" | "secondary" = "primary",
): string {
  const a = escapeHtml(href)
  if (variant === "secondary") {
    return `<tr><td style="padding:0 40px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="border:1px solid rgba(2,13,37,0.16);border-radius:8px;">
          <a href="${a}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:500;line-height:1;color:${EMAIL.ink};text-decoration:none;border-radius:8px;letter-spacing:-0.01em;">${escapeHtml(label)}</a>
        </td>
      </tr></table>
    </td></tr>`
  }
  return `<tr><td style="padding:0 40px 18px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="${EMAIL.gold}" style="border-radius:8px;">
        <a href="${a}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:500;line-height:1;color:${EMAIL.navy};text-decoration:none;border-radius:8px;letter-spacing:-0.01em;">${escapeHtml(label)}</a>
      </td>
    </tr></table>
  </td></tr>`
}

/** Bloco de "letra miúda" abaixo do CTA. `html` já deve vir escapado/markup. */
export function emailFinePrint(html: string): string {
  return `<tr><td style="padding:0 40px 40px;">
    <p style="margin:0;font-size:13px;line-height:1.6;color:${EMAIL.note};">${html}</p>
  </td></tr>`
}

export interface EmailDoc {
  /** Eyebrow + tom acima do título. */
  eyebrow?: { texto: string; tom?: EmailTone }
  /** Título h1 (será escapado). */
  titulo: string
  /** Parágrafo de abertura (HTML já montado — use `escapeHtml` no texto puro). Opcional. */
  introHtml?: string
  /** Linhas internas já montadas (cards, CTA, fine print) entre corpo e rodapé. */
  blocosHtml: string
}

/**
 * Monta o documento completo: header navy (Lex+IA + régua dourada) → corpo
 * (eyebrow/título/intro) → blocos → rodapé com a assinatura do escritório.
 */
export function renderEmail(doc: EmailDoc): string {
  const eyebrow = doc.eyebrow ? emailEyebrow(doc.eyebrow.texto, doc.eyebrow.tom) : ""
  const intro = doc.introHtml
    ? `<p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:${EMAIL.body};">${doc.introHtml}</p>`
    : ""
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#e7e6e0;font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e7e6e0;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border-collapse:collapse;font-family:${FONT};">
      <tr><td style="background:${EMAIL.navy};padding:24px 40px;border-bottom:2px solid ${EMAIL.gold};">
        <span style="font-size:20px;font-weight:600;letter-spacing:-0.02em;color:${EMAIL.logoInk};">Lex<span style="color:${EMAIL.gold};">IA</span></span>
      </td></tr>
      <tr><td style="padding:40px 40px 8px;">
        ${eyebrow}
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.025em;color:${EMAIL.ink};">${escapeHtml(doc.titulo)}</h1>
        ${intro}
      </td></tr>
      ${doc.blocosHtml}
      <tr><td style="background:${EMAIL.surface};border-top:1px solid ${EMAIL.line};padding:26px 40px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:500;color:${EMAIL.ink};">${ESCRITORIO.nome}</p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:${EMAIL.note};">${ESCRITORIO.endereco}<br>${ESCRITORIO.email}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
