// POST /api/processos/[id]/prazos/preview — compute the fatal/internal dates
// WITHOUT persisting (so the UI can show the deadline before saving). Defaults
// the jurisdiction (holiday set) to the processo's court. Read-only → not a
// mutation (no audit/rate-limit), just a guarded compute.
import { NextResponse } from "next/server"
import { forbidden, guardRequest, requireUser } from "@/lib/auth/session"
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { UserError } from "@/lib/errors"
import { previewPrazoParaProcesso } from "@/lib/processos/mutations"
import { podeAcessarProcesso } from "@/lib/processos/rbac"
import { prazoPreviewSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const { id } = await ctx.params
  const body = await readJson(req)
  try {
    const pid = parseId(id)
    if (!(await podeAcessarProcesso(user, pid))) return forbidden()
    const input = parseBody(prazoPreviewSchema, body)
    return NextResponse.json(await previewPrazoParaProcesso(pid, input))
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
