// "Autorizar" da tela de consentimento: emite o código de autorização para o
// usuário DA SESSÃO e devolve a URL de retorno que o navegador deve seguir.
// Fica DENTRO do gate de src/proxy.ts de propósito — sem sessão não há o que
// autorizar (ao contrário de /oauth/token e /oauth/register, que são públicos).
//
// O `code` só existe na resposta desta chamada. A auditoria registra o
// consentimento (quem autorizou qual cliente), nunca o código em si:
// writeAudit persiste apenas `meta.payload`.
import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { readJson, runMutation } from "@/lib/finance/api"
import { urlDeRetorno } from "@/lib/oauth/core"
import { OAuthError, emitirCodigo } from "@/lib/oauth/fluxo"
import { autorizarSchema } from "@/lib/oauth/schemas"
import { resolveRequestOrigin } from "@/lib/request-origin"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  const base = resolveRequestOrigin(req)
  return runMutation(
    async () => {
      const input = parseBody(autorizarSchema, body)
      const user = await requireUser()
      try {
        const code = await emitirCodigo(user, input, base)
        // `iss` é recomendado pelo RFC 9207 (e anunciado nos metadados): deixa o
        // cliente conferir de qual servidor veio a resposta de autorização.
        return { redirect: urlDeRetorno(input.redirect_uri, { code, state: input.state, iss: base }) }
      } catch (e) {
        // OAuthError aqui é erro de PEDIDO (cliente/redirect/recurso inválidos):
        // vira 400 com a mensagem pt-BR em vez do 500 genérico.
        if (e instanceof OAuthError) throw new UserError(e.message)
        throw e
      }
    },
    { action: "oauth.autorizar", entity: "oauth", payload: { clientId: body.client_id, redirectUri: body.redirect_uri } },
  )
}

/** GET aqui não faz sentido (a tela é /oauth/authorize). */
export function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 })
}
