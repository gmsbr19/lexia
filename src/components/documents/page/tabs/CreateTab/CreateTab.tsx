"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Briefcase, FileText, Feather, Plus, Scale, Sparkles, Upload } from "lucide-react"
import { DOC_CATEGORIES, DOCUMENT_TEMPLATES } from "@/lib/documents/registry"
import type { DocCategory } from "@/lib/documents/registry"
import type { DocumentoRow } from "@/lib/documentos/types"
import { apiSend } from "@/lib/client/api"
import { emptyDoc } from "@/lib/documents/model/types"
import { abreviaturaDoTemplate, categoriaDoTemplate, dataRelativa } from "../../documents-page.data"
import { DocumentsSectionHeader } from "../SectionHeader"
import { sectionHeader, sectionTitle, sectionHint } from "../SectionHeader.css"
import { scrollArea, pageFrame, categoryIcon, templateOrb, templateMuted, documentTypeText } from "../../documents-page.css"
import {
  pageFrameCreate,
  section,
  heroTitle,
  heroLead,
  createRow,
  blankCard,
  blankIcon,
  blankBody,
  blankTitle,
  blankSub,
  uploadButton,
  uploadIcon,
  uploadBody,
  uploadTitle,
  uploadSub,
  uploadCode,
  draftGrid,
  draftLink,
  draftHeaderRow,
  draftHeaderGroup,
  draftIcon,
  draftTypeText,
  draftSourceText,
  draftBody,
  draftTitle,
  draftClientLine,
  cardFooter,
  categoryGrid,
  categoryCard,
  categoryTitle,
  categoryDescription,
} from "./CreateTab.css"

const ICON_MAP: Record<string, React.ElementType> = {
  Scroll: FileText,
  Feather,
  Briefcase,
  Scale,
}

export function DocumentsCreateTab({
  rascunhos,
  onNavigateToModelos,
  onOpenDocuments,
}: {
  rascunhos: DocumentoRow[]
  onNavigateToModelos: (filter?: DocCategory) => void
  onOpenDocuments: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const novoEmBranco = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiSend<{ ok: boolean; result: { id: number } }>("/api/documentos", "POST", {
        nome: "Documento sem título",
        template: "livre",
        status: "rascunho",
        conteudo: emptyDoc(),
      })
      router.push(`/documents/doc/${res.result.id}`)
    } catch {
      setBusy(false)
    }
  }

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
      <div className={`${pageFrame} ${pageFrameCreate}`}>
        {/* AI access lives in the global LexIA bar (no redundant in-page composer). */}
        <div className={section}>
          <h1 className={heroTitle}>O que vamos criar?</h1>
          <p className={heroLead}>Escolha um modelo abaixo ou descreva o documento na barra da LexIA.</p>

          <div className={createRow}>
            <button type="button" disabled={busy} onClick={() => void novoEmBranco()} className={blankCard}>
              <span className={blankIcon}>
                <Plus size={20} strokeWidth={2.2} />
              </span>
              <span className={blankBody}>
                <span className={blankTitle}>Começar em branco</span>
                <span className={blankSub}>Folha em branco sobre o papel timbrado padrão</span>
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => importRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                void onImport(e.dataTransfer.files?.[0])
              }}
              className={uploadButton({ drag })}
            >
              <span className={uploadIcon}>
                <Upload size={19} />
              </span>
              <span className={uploadBody}>
                <span className={uploadTitle}>Importar documento</span>
                <span className={uploadSub}>
                  Arraste um <code className={uploadCode}>.docx</code> aqui ou clique para enviar — a LexIA marca os campos.
                </span>
              </span>
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={(e) => void onImport(e.target.files?.[0] ?? undefined)}
            />
          </div>
        </div>

        {rascunhos.length > 0 && (
          <section className={section}>
            <DocumentsSectionHeader
              title="Continue de onde parou"
              subtitle={`${rascunhos.length} ${rascunhos.length === 1 ? "rascunho" : "rascunhos"} em aberto`}
              action="Ver todos"
              onAction={onOpenDocuments}
            />
            <div className={draftGrid}>
              {rascunhos.slice(0, 6).map((draft) => (
                <Link
                  key={draft.id}
                  href={`/documents/doc/${draft.id}`}
                  className={draftLink}
                >
                  <div className={draftHeaderRow}>
                    <div className={draftHeaderGroup}>
                      <div className={draftIcon}>
                        <span className={documentTypeText}>{abreviaturaDoTemplate(draft.template)}</span>
                      </div>
                      <span className={draftTypeText}>{categoriaDoTemplate(draft.template)}</span>
                    </div>
                    <span className={draftSourceText}>
                      <Sparkles size={10} strokeWidth={2} />
                      Rascunho
                    </span>
                  </div>
                  <div className={draftBody}>
                    <div className={draftTitle}>{draft.nome}</div>
                    <div className={draftClientLine}>
                      {draft.cliente ? `${draft.cliente} · ` : ""}
                      {dataRelativa(draft.atualizadoEm)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className={sectionHeader}>
            <h2 className={sectionTitle}>Navegar por tipo</h2>
            <span className={sectionHint}>Clique para ver todos os modelos daquele tipo</span>
          </div>
          <div className={categoryGrid}>
            {DOC_CATEGORIES.map((category) => {
              const Icon = ICON_MAP[category.iconName] ?? FileText
              const count = DOCUMENT_TEMPLATES.filter((template) => template.category === category.id).length

              return (
                <button key={category.id} type="button" onClick={() => onNavigateToModelos(category.id)} className={categoryCard}>
                  <div className={templateOrb} />
                  <div className={categoryIcon}>
                    <Icon size={18} strokeWidth={1.6} />
                  </div>
                  <div>
                    <div className={categoryTitle}>{category.id}</div>
                    <div className={categoryDescription}>{category.description}</div>
                  </div>
                  <div className={cardFooter}>
                    <span className={templateMuted}>{count} modelos</span>
                    <ArrowRight size={13} color="var(--text-subtle)" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
