"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Briefcase, Feather, FileText, Plus, Scale, Upload } from "lucide-react"
import { btn } from "@/styles/components.css"
import { apiSend } from "@/lib/client/api"
import type { TemplateRow } from "@/lib/documentos/types"
import { scrollArea, pageFrame, compactSecondaryButton, categoryIcon, templateOrb, templateMuted } from "../../documents-page.css"
import {
  pageFrameTemplates,
  templateBadge,
  templateCard,
  templateChip,
  templateChipCount,
  templateChipRow,
  templateDescription,
  templateFooter,
  templateHeader,
  templatesActions,
  templatesGrid,
  templatesHeader,
  templatesTitle,
  templateTitle,
} from "./TemplatesTab.css"

const ICON_MAP: Record<string, React.ElementType> = {
  Scroll: FileText,
  Feather,
  Briefcase,
  Scale,
}

export function DocumentsTemplatesTab({ initialFilter }: { initialFilter: string }) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [activeFilter, setActiveFilter] = useState(initialFilter || "")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiSend<{ templates: TemplateRow[] }>("/api/documentos/templates", "GET")
      .then((r) => setTemplates(r.templates))
      .catch(() => {})
  }, [])

  const categorias = useMemo(() => Array.from(new Set(templates.map((t) => t.categoria))), [templates])
  const counts = useMemo(() => {
    const map: Record<string, number> = { "": templates.length }
    for (const t of templates) map[t.categoria] = (map[t.categoria] ?? 0) + 1
    return map
  }, [templates])
  const visible = activeFilter ? templates.filter((t) => t.categoria === activeFilter) : templates

  // Clicking a model forks a fresh draft (its text + fields come along) and opens
  // the WYSIWYG editor on it.
  const usar = async (t: TemplateRow) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiSend<{ ok: boolean; result: { id: number } }>("/api/documentos/de-template", "POST", { templateId: t.id })
      router.push(`/documents/doc/${res.result.id}`)
    } catch {
      setBusy(false)
    }
  }

  const importarRef = useRef<HTMLInputElement>(null)
  const onImport = async (file: File | undefined) => {
    if (!file || busy) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/documentos/importar-docx", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.result?.id) throw new Error(data?.error || "Falha ao importar")
      router.push(`/documents/doc/${data.result.id}`)
    } catch (e) {
      setBusy(false)
      window.alert(e instanceof Error ? e.message : "Falha ao importar o .docx")
    }
  }

  return (
    <div className={scrollArea}>
      <div className={`${pageFrame} ${pageFrameTemplates}`}>
        <div className={templatesHeader}>
          <h1 className={templatesTitle}>Modelos</h1>
          <div className={templatesActions}>
            <button type="button" disabled={busy} onClick={() => importarRef.current?.click()} className={`${btn({ variant: "secondary" })} ${compactSecondaryButton}`}>
              <Upload size={13} />Importar .docx
            </button>
            <input
              ref={importarRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={(e) => void onImport(e.target.files?.[0] ?? undefined)}
            />
            <button type="button" onClick={() => router.push("/documents/novo")} className={`${btn({ variant: "primary" })} ${compactSecondaryButton}`}>
              <Plus size={13} />Novo documento
            </button>
          </div>
        </div>

        <div className={templateChipRow}>
          {["", ...categorias].map((filter) => (
            <button key={filter || "todos"} type="button" onClick={() => setActiveFilter(filter)} className={templateChip({ active: activeFilter === filter })}>
              {filter || "Todos"}
              <span className={templateChipCount}>{counts[filter] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className={templatesGrid}>
          {visible.map((t) => {
            const Icon = ICON_MAP[t.icone ?? "Scroll"] ?? FileText
            return (
              <button
                key={t.id}
                type="button"
                disabled={busy}
                onClick={() => void usar(t)}
                className={templateCard}
                style={{ font: "inherit", textAlign: "left", cursor: busy ? "default" : "pointer" }}
              >
                <div className={templateOrb} />
                <div className={templateHeader}>
                  <div className={categoryIcon}>
                    <Icon size={18} strokeWidth={1.6} />
                  </div>
                  <span className={templateBadge}>{t.categoria}</span>
                </div>
                <div className={templateTitle}>{t.nome}</div>
                <div className={templateDescription}>{t.descricao || "—"}</div>
                <div className={templateFooter}>
                  <div className={templateMuted}>Usar modelo</div>
                  <ArrowRight size={13} color="var(--accent)" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
