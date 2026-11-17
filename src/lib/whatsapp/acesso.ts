// WhatsApp — resolução do usuário da SESSÃO. SERVER ONLY.
//
// É o único lugar de onde as rotas do módulo tiram um userId. Nenhuma delas
// aceita um id vindo da URL ou do corpo: isolamento por usuário é a regra
// central do módulo (ver docs/whatsapp-baileys.md § Segurança), e a forma de
// garanti-la é não ter por onde pedir o WhatsApp de outra pessoa.
import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth/session"
import { UserError } from "@/lib/errors"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"
import { whatsappHabilitado } from "./sessoes"

/** O id do usuário logado. Lança (→ 400/401 pelo envelope de runMutation). */
export async function userIdDaSessao(): Promise<number> {
  const user = await requireUser()
  const id = await userIdPorEmail(user.email)
  if (!id) throw new UserError("Usuário da sessão não encontrado")
  return id
}

/**
 * 404 quando o módulo não está configurado (sem WHATSAPP_AUTH_KEY). 404 e não
 * 403: para quem não ligou o módulo, ele simplesmente não existe — mesmo padrão
 * do /api/mcp sem token.
 */
export function moduloDesligado(): NextResponse | null {
  if (whatsappHabilitado()) return null
  return NextResponse.json({ error: "Módulo de WhatsApp não configurado" }, { status: 404 })
}
