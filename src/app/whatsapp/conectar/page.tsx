// /whatsapp/conectar — conexão do WhatsApp DO USUÁRIO LOGADO (auth pelo proxy +
// shell). O estado inicial é lido no servidor para a página já abrir pintada; o
// tempo real (QR, código, conexão) chega pelo SSE em /api/whatsapp/eventos.
import { AuthError } from "@/lib/auth/session"
import { ConectarApp } from "@/components/whatsapp/ConectarApp"
import { userIdDaSessao } from "@/lib/whatsapp/acesso"
import { getSessaoView, whatsappHabilitado } from "@/lib/whatsapp/sessoes"
import { SESSAO_VAZIA } from "@/lib/whatsapp/tipos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function Page() {
  if (!whatsappHabilitado()) return <NaoConfigurado />
  let inicial = SESSAO_VAZIA
  try {
    inicial = await getSessaoView(await userIdDaSessao())
  } catch (e) {
    if (!(e instanceof AuthError)) throw e // sem sessão o proxy já teria redirecionado
  }
  return <ConectarApp inicial={inicial} />
}

function NaoConfigurado() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px", display: "grid", gap: 10 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>WhatsApp</h1>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
        O módulo ainda não foi configurado neste ambiente. É preciso definir a variável{" "}
        <code style={{ fontFamily: "var(--font-mono)" }}>WHATSAPP_AUTH_KEY</code> (a chave que cifra as credenciais da
        sessão) e subir o serviço de conexão. Fale com o administrador.
      </p>
    </div>
  )
}
