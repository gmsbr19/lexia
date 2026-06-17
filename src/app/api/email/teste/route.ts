// Diagnóstico de e-mail (admin) — dispara um envio REAL e devolve o backend +
// o ERRO bruto do provedor (ex.: status do Graph) na resposta, em vez de só no
// log. NÃO usa runMutation (que mascararia o erro em 500 genérico); o erro vai
// no campo `detalhe` (não `error`) para o apiSend do cliente não lançar.
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { readJson } from "@/lib/finance/api"
import { getMailer, mailerStatus } from "@/lib/notificacoes/email/mailer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const denied = await guardRequest(["admin"])
  if (denied) return denied

  const user = await requireUser()
  const body = await readJson(req)
  const to = typeof body.to === "string" && body.to.trim() ? body.to.trim() : user.email
  const { backend, ativo } = mailerStatus()

  if (!ativo) {
    return NextResponse.json({
      ok: false,
      backend,
      to,
      detalhe: "Nenhum backend de e-mail configurado (noop). Defina GRAPH_* ou SMTP_* e reinicie o servidor.",
    })
  }

  try {
    await getMailer().enviar({
      to,
      subject: "Teste de e-mail — Lexia",
      html: `<p>Este é um e-mail de teste do Lexia, enviado via <b>${backend}</b>.</p><p>Se você recebeu isto, o canal de e-mail está funcionando.</p>`,
      text: `Teste de e-mail do Lexia (backend: ${backend}). Se você recebeu isto, o canal está funcionando.`,
    })
    return NextResponse.json({ ok: true, backend, to })
  } catch (e) {
    return NextResponse.json({ ok: false, backend, to, detalhe: e instanceof Error ? e.message : String(e) })
  }
}
