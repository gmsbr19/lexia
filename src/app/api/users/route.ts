import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { listUsers } from "@/lib/users/queries"
import { createUser } from "@/lib/users/mutations"
import { emitirConvite } from "@/lib/users/convite"
import { userCreateSchema } from "@/lib/users/schemas"
import { parseBody } from "@/lib/validation"
import { resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/users — Configurações · Usuários & permissões (admin). */
export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied

  return NextResponse.json(await listUsers())
}

/** POST /api/users — cria o usuário (sem senha) e dispara o convite de acesso.
 *  Retorna o link p/ o admin copiar (útil quando não há SMTP) + se o e-mail saiu. */
export async function POST(req: Request) {
  const body = await readJson(req)
  const origem = resolveRequestOrigin(req)
  return runMutation(
    async () => {
      const user = await createUser(parseBody(userCreateSchema, body))
      const convite = await emitirConvite(user.id, origem)
      return { ...user, ...convite }
    },
    {
      action: "user.criar",
      entity: "User",
      payload: { ...body }, // só email/nome/role — sem segredos
      roles: ["admin"],
    },
  )
}
