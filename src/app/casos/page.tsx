import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Casos is now unified into the Processos module ("Casos & Processos"). Keep this
// route as a redirect so old deep-links (and ?caso=<id>) still resolve.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const caso = Array.isArray(sp.caso) ? sp.caso[0] : sp.caso
  redirect(caso ? `/processos?view=processos&caso=${caso}` : "/processos?view=processos")
}
