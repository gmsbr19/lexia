// Tela de consentimento OAuth. Reaproveita o login e a sessão do Lexia: o gate
// de src/proxy.ts já manda quem não está logado para /login?callbackUrl=…, e
// como o callbackUrl preserva a query, os parâmetros do OAuth sobrevivem ao
// login. Um usuário com `ativo = false` nem consegue logar, então não autoriza.
//
// REGRA: erro de parâmetro é mostrado AQUI, nunca redirecionado. Redirecionar
// para uma redirect_uri que ainda não foi validada contra as registradas é
// exatamente o vazamento que a allowlist existe para impedir.
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AutorizarForm, type PedidoAutorizacao } from "@/components/auth/AutorizarForm"
import { auth } from "@/lib/auth"
import { urlDeRetorno } from "@/lib/oauth/core"
import { validarPedidoAutorizacao } from "@/lib/oauth/fluxo"
import { originFromHeaders } from "@/lib/request-origin"
import { headers } from "next/headers"
import * as css from "@/components/auth/login.css"

export const metadata: Metadata = { title: "Autorizar acesso — LexIA" }
export const dynamic = "force-dynamic"

type Params = Record<string, string | string[] | undefined>

function um(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

function Moldura({ children, subtitulo }: { children: React.ReactNode; subtitulo: string }) {
  return (
    <div className={css.page}>
      <div className={css.card}>
        <div className={css.brand}>
          <span className={css.brandMark}>L</span>
          <div>
            <div className={css.brandTitle}>LexIA</div>
            <div className={css.brandSubtitle}>{subtitulo}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export default async function AutorizarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const session = await auth()
  if (!session?.user?.email) {
    // Defesa em profundidade (o proxy já cobre isso): refaz a volta pelo login
    // preservando a query, senão o fluxo OAuth se perde.
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      const s = um(v)
      if (s) qs.set(k, s)
    }
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${qs.toString()}`)}`)
  }

  const clientId = um(sp.client_id)
  const redirectUri = um(sp.redirect_uri)
  const codeChallenge = um(sp.code_challenge)
  const metodo = um(sp.code_challenge_method)
  const responseType = um(sp.response_type)
  const state = um(sp.state)
  const scope = um(sp.scope)
  const resource = um(sp.resource)

  if (!clientId || !redirectUri || !codeChallenge) {
    return (
      <Moldura subtitulo="Autorizar acesso">
        <div className={css.errorBox}>
          Pedido de autorização incompleto (faltam client_id, redirect_uri ou code_challenge). Tente adicionar o
          conector novamente no aplicativo.
        </div>
      </Moldura>
    )
  }
  if (responseType && responseType !== "code") {
    return (
      <Moldura subtitulo="Autorizar acesso">
        <div className={css.errorBox}>Tipo de resposta não suportado: este servidor só emite código de autorização.</div>
      </Moldura>
    )
  }
  if (metodo !== "S256") {
    return (
      <Moldura subtitulo="Autorizar acesso">
        <div className={css.errorBox}>
          Este servidor exige PKCE com S256. O aplicativo pediu{" "}
          {metodo ? <code>{metodo}</code> : "nenhum método"}.
        </div>
      </Moldura>
    )
  }

  const base = originFromHeaders(await headers()) ?? ""
  const pedido: PedidoAutorizacao = {
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(state ? { state } : {}),
    ...(scope ? { scope } : {}),
    ...(resource ? { resource } : {}),
  }

  const valido = await validarPedidoAutorizacao(pedido, base)
  if ("erro" in valido) {
    return (
      <Moldura subtitulo="Autorizar acesso">
        <div className={css.errorBox}>{valido.erro}</div>
      </Moldura>
    )
  }

  const cancelarUrl = urlDeRetorno(redirectUri, { error: "access_denied", state })

  return (
    <Moldura subtitulo="Autorizar acesso">
      <p style={{ margin: "4px 0 14px", fontSize: 14, lineHeight: 1.5 }}>
        <strong>{valido.cliente.nome}</strong> está pedindo acesso ao Lexia como{" "}
        <strong>{session.user.name ?? session.user.email}</strong>.
      </p>
      <ul style={{ margin: "0 0 4px", paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
        <li>O aplicativo poderá ler e alterar os dados que o seu usuário já pode acessar no Lexia.</li>
        <li>Tudo o que ele fizer fica registrado na auditoria com o seu nome.</li>
        <li>Você pode cortar o acesso a qualquer momento desativando o seu usuário ou removendo o conector.</li>
      </ul>
      <AutorizarForm pedido={pedido} nomeApp={valido.cliente.nome} cancelarUrl={cancelarUrl} />
    </Moldura>
  )
}
