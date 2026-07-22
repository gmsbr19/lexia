// GET /api/comercial/dataset — the same raw Comercial dataset the server
// component fetches, exposed for client-side revalidation. Lets the client
// refresh in place (SWR) after a mutation instead of router.refresh()
// re-running the whole RSC tree and blanking the table. See
// src/lib/comercial/useComercialData.ts.
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getComercialDataset } from "@/lib/comercial/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getComercialDataset())
}
