import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Legacy path — the client detail moved to /contatos/[id]. Redirect old deep
// links (notifications, chat, bookmarks), preserving the ?tab= query string.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab
  redirect(tab ? `/contatos/${id}?tab=${tab}` : `/contatos/${id}`)
}
