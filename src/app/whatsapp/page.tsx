import { redirect } from "next/navigation"

export const runtime = "nodejs"

/** /whatsapp → a conexão; de lá se chega a /whatsapp/conversas. */
export default function Page() {
  redirect("/whatsapp/conectar")
}
