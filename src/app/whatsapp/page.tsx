import { redirect } from "next/navigation"

export const runtime = "nodejs"

/** /whatsapp → a única página do módulo hoje. (/whatsapp/conversas é a fase 3.) */
export default function Page() {
  redirect("/whatsapp/conectar")
}
