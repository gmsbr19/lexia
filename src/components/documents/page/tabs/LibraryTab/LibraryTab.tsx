"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Filter, FileText, MoreHorizontal, Search, Trash2, FolderOpen } from "lucide-react"
import { btn } from "@/styles/components.css"
import { tokens } from "@/styles/tokens.css"
import { apiSend, ApiError } from "@/lib/client/api"
import { toast } from "@/lib/client/toast"
import type { DocumentoRow, DocumentoStatus } from "@/lib/documentos/types"
import { DOCUMENTO_STATUS_LABEL } from "@/lib/documentos/types"
import { useDocumentFilter } from "../../hooks/useDocumentFilter"
import { scrollArea, pageFrame, toolbarSpacer, compactSecondaryButton, documentTypeText, documentIconBar } from "../../documents-page.css"
import {
  pageFrameLibrary,
  libraryHeader,
  libraryTitle,
  librarySubtitle,
  filterBar,
  searchWrap,
  searchIcon,
  searchInput,
  segmentedGroup,
  segmentedButton,
  tableCard,
  table,
  tableHeadRow,
  tableHeadCell,
  tableRow,
  documentCell,
  documentMeta,
  draftMetaBody,
  documentIcon,
  documentTitle,
  documentDetails,
  documentSeparator,
  documentMetaTextWrap,
  avatar,
  documentClientText,
  documentDateText,
  documentStatusPill,
  documentStatusDot,
  formatoText,
  tableActions,
  documentActionsCell,
  compactIconButton,
  footerBar,
  rowMenuWrap,
  rowMenu,
  rowMenuItem,
  rowMenuItemDanger,
  rowMenuDivider,
  emptyState,
  emptyIcon,
  emptyTitle,
  emptyDesc,
} from "./LibraryTab.css"
import { DOCUMENT_LIBRARY_FILTERS, abreviaturaDoTemplate, categoriaDoTemplate, dataRelativa } from "../../documents-page.data"

function statusTone(status: DocumentoStatus): { background: string; color: string } {
  switch (status) {
    case "finalizado":
      return { background: tokens.color.okSoft, color: tokens.color.ok }
    case "enviado":
      return { background: tokens.color.warnSoft, color: tokens.color.warn }
    case "fechado":
      return { background: tokens.color.okSoft, color: tokens.color.ok }
    case "rascunho":
    default:
      return { background: tokens.color.bgSunken, color: tokens.color.textMuted }
  }
}

function documentoHref(doc: DocumentoRow): string {
  // Every document opens in the WYSIWYG (rich-text) editor at /documents/doc/[id].
  return `/documents/doc/${doc.id}`
}

function RowMenu({ doc }: { doc: DocumentoRow }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function run(label: string, fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      toast(label)
      setOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Não foi possível concluir a ação"
      toast(message, { kind: "error" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={wrapRef} className={rowMenuWrap}>
      <button
        type="button"
        aria-label="Mais ações"
        className={`${btn({ variant: "ghost" })} ${compactIconButton}`}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className={rowMenu} onClick={(event) => event.stopPropagation()}>
          <button type="button" className={rowMenuItem} onClick={() => router.push(documentoHref(doc))}>
            <FolderOpen size={14} />
            Abrir
          </button>
          <div className={rowMenuDivider} />
          <button
            type="button"
            className={`${rowMenuItem} ${rowMenuItemDanger}`}
            disabled={busy}
            onClick={() => run("Documento excluído", () => apiSend(`/api/documentos/${doc.id}`, "DELETE"))}
          >
            <Trash2 size={14} />
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

export function DocumentsLibraryTab({ documentos }: { documentos: DocumentoRow[] }) {
  const router = useRouter()
  const { filterType, setFilterType, query, setQuery, visibleDocuments } = useDocumentFilter(documentos)

  const hasDocuments = documentos.length > 0

  return (
    <div className={scrollArea}>
      <div className={`${pageFrame} ${pageFrameLibrary}`}>
        <div className={libraryHeader}>
          <h1 className={libraryTitle}>Meus documentos</h1>
          <p className={librarySubtitle}>
            {hasDocuments
              ? `${documentos.length} ${documentos.length === 1 ? "documento" : "documentos"}`
              : "Nenhum documento gerado ainda"}
          </p>
        </div>

        {!hasDocuments ? (
          <div className={tableCard}>
            <div className={emptyState}>
              <div className={emptyIcon}>
                <FileText size={32} strokeWidth={1.4} />
              </div>
              <div className={emptyTitle}>Você ainda não gerou documentos</div>
              <p className={emptyDesc}>
                Comece um documento em branco, importe um .docx ou use um modelo — a LexIA ajuda a redigir. Os documentos criados aparecem aqui.
              </p>
              <button
                type="button"
                className={btn({ variant: "secondary" })}
                style={{ height: 34 }}
                onClick={() => router.push("/documents/novo")}
              >
                Criar primeiro documento
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={filterBar}>
              <div className={searchWrap}>
                <div className={searchIcon}>
                  <Search size={14} />
                </div>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome, cliente, status..."
                  className={searchInput}
                />
              </div>
              <div className={segmentedGroup}>
                {DOCUMENT_LIBRARY_FILTERS.map((label) => (
                  <button key={label} type="button" onClick={() => setFilterType(label)} className={segmentedButton({ active: filterType === label })}>
                    {label}
                  </button>
                ))}
              </div>
              <div className={toolbarSpacer} />
              <button type="button" className={`${btn({ variant: "secondary" })} ${compactSecondaryButton}`}>
                <Filter size={13} />Filtros
              </button>
            </div>

            <div className={tableCard}>
              <table className={table}>
                <thead>
                  <tr className={tableHeadRow}>
                    {["Documento", "Cliente", "Autor", "Atualizado", "Status", "Formato", ""].map((heading, index) => (
                      <th key={heading || `col-${index}`} className={tableHeadCell}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDocuments.map((doc) => {
                    const tone = statusTone(doc.status)
                    const autor = doc.criadoPor ?? "—"
                    const initials = autor
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()

                    return (
                      <tr
                        key={doc.id}
                        className={tableRow}
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(documentoHref(doc))}
                      >
                        <td className={documentCell}>
                          <div className={documentMeta}>
                            <div className={documentIcon}>
                              <span className={documentTypeText}>{abreviaturaDoTemplate(doc.template)}</span>
                              <span className={documentIconBar} />
                            </div>
                            <div className={draftMetaBody}>
                              <div className={documentTitle}>{doc.nome}</div>
                              <div className={documentDetails}>
                                <span>{categoriaDoTemplate(doc.template)}</span>
                                {doc.caso && (
                                  <>
                                    <span className={documentSeparator} />
                                    <span>{doc.caso}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`${documentCell} ${documentClientText}`}>{doc.cliente ?? "—"}</td>
                        <td className={`${documentCell} ${documentClientText}`}>
                          <div className={documentMetaTextWrap}>
                            <div className={avatar}>{initials || "—"}</div>
                            {autor}
                          </div>
                        </td>
                        <td className={`${documentCell} ${documentDateText}`}>{dataRelativa(doc.atualizadoEm)}</td>
                        <td className={documentCell}>
                          <span className={documentStatusPill} style={{ background: tone.background, color: tone.color }}>
                            <span className={documentStatusDot} />
                            {DOCUMENTO_STATUS_LABEL[doc.status]}
                          </span>
                        </td>
                        <td className={documentCell}>
                          <span className={formatoText}>{doc.formato ?? "—"}</span>
                        </td>
                        <td className={`${documentCell} ${documentActionsCell}`}>
                          <div className={tableActions} onClick={(event) => event.stopPropagation()}>
                            <RowMenu doc={doc} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className={footerBar}>
                <span>
                  Mostrando {visibleDocuments.length} de {documentos.length}{" "}
                  {documentos.length === 1 ? "documento" : "documentos"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
