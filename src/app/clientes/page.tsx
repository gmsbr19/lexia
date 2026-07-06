import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Legacy path — the page moved to /contatos. Preserve old deep links (old
// notifications, bookmarks) by redirecting, keeping any query string.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v)
    else if (Array.isArray(v) && v[0]) qs.set(k, v[0])
  }
  const q = qs.toString()
  redirect(q ? `/contatos?${q}` : "/contatos")
}
