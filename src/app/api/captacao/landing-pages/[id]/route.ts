import { z } from "zod"
import { atualizarLandingPage, reativarLandingPage, revogarLandingPage } from "@/lib/captacao/landing-pages"
import { landingPageSchema } from "@/lib/captacao/schemas"
import { parseId, runMutation, type RouteCtx } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const patchSchema = landingPageSchema.extend({ ativo: z.boolean().optional() })

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const body = await req.json()
  return runMutation(
    async () => {
      const pid = parseId(id)
      const { ativo, ...rest } = parseBody(patchSchema, body)
      const row = await atualizarLandingPage(pid, rest)
      if (ativo === true) return reativarLandingPage(pid).then(() => ({ ...row, ativo: true }))
      if (ativo === false) return revogarLandingPage(pid).then(() => ({ ...row, ativo: false }))
      return row
    },
    { action: "captacao.landingPage.editar", entity: "LandingPage", entityId: id, payload: body, roles: ["admin"] },
  )
}

/** Revoga (soft) — a LP para de aceitar submits; a linha e o histórico ficam. */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  return runMutation(() => revogarLandingPage(parseId(id)), {
    action: "captacao.landingPage.revogar",
    entity: "LandingPage",
    entityId: id,
    roles: ["admin"],
  })
}
