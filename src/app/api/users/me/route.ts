import { NextResponse } from "next/server"
import { requireUser, unauthorized, AuthError } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { updateOwnProfile } from "@/lib/users/mutations"
import { profilePatchSchema } from "@/lib/users/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/users/me — current session profile (Configurações · Perfil). */
export async function GET() {
  try {
    const user = await requireUser()
    return NextResponse.json(user)
  } catch (e) {
    if (e instanceof AuthError) return unauthorized()
    throw e
  }
}

/** PATCH /api/users/me — self-service nome / senha (senha requires senhaAtual). */
export async function PATCH(req: Request) {
  const body = await readJson(req)
  return runMutation(
    async () => {
      const user = await requireUser()
      return updateOwnProfile(user.email, parseBody(profilePatchSchema, body))
    },
    {
      action: "user.perfil",
      entity: "User",
      payload: { nome: (body as { nome?: unknown }).nome }, // never snapshot passwords
    },
  )
}
