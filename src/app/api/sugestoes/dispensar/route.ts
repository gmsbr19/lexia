// POST /api/sugestoes/dispensar — snooze (default 30 days) or permanently dismiss
// a suggestion by its stable `chave` (dias = null/0 → "não sugerir novamente").
// DELETE — restore it. Any logged-in user may manage their office's suggestions.
import { z } from "zod"
import { sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { dispensar, restaurar } from "@/lib/sugestoes/dispensa"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const dispensarSchema = z.object({
  chave: z.string().min(1).max(120),
  dias: z.number().int().min(0).max(3650).nullable().optional(), // omit = 30d; 0/null = permanente
})
const restaurarSchema = z.object({ chave: z.string().min(1).max(120) })

export async function POST(req: Request) {
  const body = await readJson(req)
  const { chave, dias } = parseBody(dispensarSchema, body)
  const by = (await sessionEmail()) ?? null
  return runMutation(() => dispensar(chave, { dias, by }), {
    action: "sugestao.dispensar",
    entity: "AppSetting",
    payload: { chave, dias },
  })
}

export async function DELETE(req: Request) {
  const body = await readJson(req)
  const { chave } = parseBody(restaurarSchema, body)
  return runMutation(() => restaurar(chave), { action: "sugestao.restaurar", entity: "AppSetting", payload: { chave } })
}
