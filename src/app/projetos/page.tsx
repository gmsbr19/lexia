import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Projetos foram unificados aos Casos: a lista agora é /casos.
export default function Page() {
  redirect("/casos")
}
