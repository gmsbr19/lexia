"use client"

import { use, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { tokens } from "@/styles/tokens.css"

interface Props {
  params: Promise<{ templateId: string }>
}

/**
 * Legacy review subroute — the review flow now lives at `/documents/preview`.
 * Redirect there, carrying ?documento= (and ?templateId= as a fallback) so the
 * preview page can fetch the right Documento (or fall back to a blank contrato).
 */
export default function ReviewRedirect({ params }: Props) {
  const { templateId } = use(params)
  const router = useRouter()
  const search = useSearchParams()

  useEffect(() => {
    const qs = new URLSearchParams()
    const documento = search.get("documento")
    if (documento) qs.set("documento", documento)
    qs.set("templateId", search.get("templateId") ?? templateId)
    router.replace(`/documents/preview?${qs.toString()}`)
  }, [router, search, templateId])

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: tokens.color.textMuted, fontSize: 14 }}>
      Abrindo revisão…
    </div>
  )
}
