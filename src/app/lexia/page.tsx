// /lexia — full-page LexIA assistant (conversation sidebar + wide chat). The
// shell (UnifiedShell) supplies the topbar/sidebar; this fills the content area.
import { Suspense } from "react"
import { LexiaPage } from "@/components/lexia/LexiaPage"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LexiaPage />
    </Suspense>
  )
}
