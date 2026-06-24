import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"
import { createArea } from "@/lib/areas/mutations"
import { getAreas } from "@/lib/areas/queries"
import { areaCreateSchema } from "@/lib/areas/schemas"
import { ROLES_AREA } from "@/lib/areas/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getAreas())
}

export async function POST(req: Request) {
  const body = await req.json()
  return runMutation(() => createArea(parseBody(areaCreateSchema, body)), {
    action: "area.criar",
    entity: "AreaDireito",
    payload: body,
    roles: ROLES_AREA,
  })
}
