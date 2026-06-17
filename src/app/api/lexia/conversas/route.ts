import { NextResponse } from "next/server"
import { AuthError, requireUser, unauthorized } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { listConversas } from "@/lib/lexia/queries"
import { criarConversa } from "@/lib/lexia/mutations"
import { conversaCreateSchema } from "@/lib/lexia/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/lexia/conversas — the session user's conversation history. */
export async function GET() {
  try {
    const user = await requireUser()
    return NextResponse.json(await listConversas(user.email))
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
}

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(
    async () => {
      const user = await requireUser()
      return criarConversa(user.email, parseBody(conversaCreateSchema, body).titulo)
    },
    { action: "lexia.conversa.criar", entity: "LexiaConversa" },
  )
}
