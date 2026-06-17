import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { searchAll } from "@/lib/search"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/search?q= — grouped live results for the Spotlight (⌘K) modal. */
export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const q = new URL(req.url).searchParams.get("q") ?? ""
  return NextResponse.json(await searchAll(q.slice(0, 120)))
}
