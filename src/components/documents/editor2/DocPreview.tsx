"use client"

import { useMemo } from "react"
import { documentToPreviewHtml } from "@/lib/documents/render/html"
import type { LexDoc, MarginsMm } from "@/lib/documents/model/types"

// On-screen A4 preview: renders the SAME canonical content (documentToPreviewHtml
// shares DOC_CONTENT_CSS with the PDF path) inside a sandboxed iframe, so the app's
// global CSS can't leak in. The PDF export is the paginated source of truth.
export function DocPreview({
  doc,
  letterheadDataUrl,
  marginsMm,
  valores,
  zoom = 0.74,
}: {
  doc: LexDoc
  letterheadDataUrl?: string | null
  marginsMm?: MarginsMm
  valores?: Record<string, string>
  zoom?: number
}) {
  const html = useMemo(
    () => documentToPreviewHtml(doc, { letterheadDataUrl: letterheadDataUrl ?? null, marginsMm, valores, zoom }),
    [doc, letterheadDataUrl, marginsMm, valores, zoom],
  )

  return (
    <div style={{ height: "100%", overflow: "auto", background: "#eef0f3" }}>
      <iframe
        title="Pré-visualização do documento"
        srcDoc={html}
        sandbox=""
        style={{ width: "100%", height: "100%", border: 0, display: "block", background: "transparent" }}
      />
    </div>
  )
}
