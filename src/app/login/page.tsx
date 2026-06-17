import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginForm } from "@/components/auth/LoginForm"

export const metadata: Metadata = { title: "Entrar — LexIA" }
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  // Already signed in → straight to the dashboard.
  const session = await auth()
  if (session?.user) redirect("/")

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
