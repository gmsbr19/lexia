"use client"

import { Suspense } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Download, Filter, MoreHorizontal, Plus, Search, Sparkles } from "lucide-react"
import { AppShell } from "@/components/shell/AppShell"
import { btn } from "@/styles/components.css"
import { templateEditorPath } from "@/lib/documents/registry"
import { DocumentsTabStrip } from "./tabs/TabStrip"
import { useTabRouting } from "./hooks/useTabRouting"
import { useDocumentFilter } from "./hooks/useDocumentFilter"
import { DocumentsCreateTab } from "./tabs/CreateTab/CreateTab"
import { DocumentsTemplatesTab } from "./tabs/TemplatesTab/TemplatesTab"
import {
  avatar,
  draftMetaBody,
  compactIconButton,
  compactSecondaryButton,
  filterBar,
  footerBar,
  librarySubtitle,
  libraryTitle,
  libraryHeader,
  pageShell,
  pageFrame,
  pageFrameLibrary,
  pager,
  scrollArea,
  searchIcon,
  searchInput,
  searchWrap,
  segmentedButton,
  segmentedGroup,
  statCard,
  statLabel,
  statTrend,
  statValue,
  statValueRow,
  statsGrid,
  tabPanel,
  table,
  tableActions,
  tableCard,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  documentCell,
  documentDetails,
  documentIcon,
  documentAiTag,
  documentActionsCell,
  documentClientText,
  documentMeta,
  documentMetaTextWrap,
  documentSeparator,
  documentStatusDot,
  documentStatusPill,
  documentDateText,
  documentTypeText,
  documentIconBar,
  documentTitle,
  toolbarSpacer,
  loadingState,
} from "./documents-page.css"
import {
  DOCUMENT_LIBRARY_FILTERS,
  DOCUMENTS,
  DOCUMENT_STATS,
  DOCUMENT_TYPE_ABBR,
} from "./documents-page.data"

function statusTone(status: string) {
  if (status === "Finalizado") return { background: "rgba(46,160,67,0.12)", color: "#2ea043" }
  if (status === "Assinado") return { background: "var(--accent-soft)", color: "var(--accent)" }
  if (status === "Rascunho") return { background: "var(--bg-sunken)", color: "var(--text-muted)" }
  return { background: "rgba(2,13,37,0.06)", color: "var(--text-muted)" }
}

function DocumentsLibraryTab() {
  const { filterType, setFilterType, query, setQuery, visibleDocuments } = useDocumentFilter()

  return (
    <div className={scrollArea}>
      <div className={`${pageFrame} ${pageFrameLibrary}`}>
        <div className={libraryHeader}>
          <h1 className={libraryTitle}>Meus documentos</h1>
          <p className={librarySubtitle}>
            {DOCUMENTS.length} documentos · 38 nos últimos 30 dias
          </p>
        </div>

        <div className={statsGrid}>
          {DOCUMENT_STATS.map((stat) => (
            <div key={stat.label} className={statCard}>
              <div className={statLabel}>{stat.label}</div>
              <div className={statValueRow}>
                <span className={statValue}>{stat.count}</span>
                <span className={statTrend({ positive: stat.trend.startsWith("+"), negative: !stat.trend.startsWith("+") })}>{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={filterBar}>
          <div className={searchWrap}>
            <div className={searchIcon}>
              <Search size={14} />
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, cliente, número..."
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
          <button type="button" className={`${btn({ variant: "secondary" })} ${compactSecondaryButton}`}>
            <Sparkles size={13} />Últimos 30 dias
          </button>
        </div>

        <div className={tableCard}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                {[
                  "Documento",
                  "Cliente",
                  "Autor",
                  "Atualizado",
                  "Status",
                  "",
                ].map((heading) => (
                  <th key={heading} className={tableHeadCell}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map((document) => {
                const tone = statusTone(document.status)
                const initials = document.author
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)

                return (
                  <tr key={document.name} className={tableRow}>
                    <td className={documentCell}>
                      <div className={documentMeta}>
                        <div className={documentIcon}>
                          <span className={documentTypeText}>
                            {DOCUMENT_TYPE_ABBR[document.type] ?? "??"}
                          </span>
                          <span className={documentIconBar} />
                        </div>
                        <div className={draftMetaBody}>
                          <div className={documentTitle}>{document.name}</div>
                          <div className={documentDetails}>
                            <span>{document.type}</span>
                            <span className={documentSeparator} />
                            <span>{document.size}</span>
                            {document.source === "ai" && (
                              <span className={documentAiTag}>
                                <Sparkles size={9} strokeWidth={2} />IA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`${documentCell} ${documentClientText}`}>{document.client}</td>
                    <td className={`${documentCell} ${documentClientText}`}>
                      <div className={documentMetaTextWrap}>
                        <div className={avatar}>{initials}</div>
                        {document.author}
                      </div>
                    </td>
                    <td className={`${documentCell} ${documentDateText}`}>{document.date}</td>
                    <td className={documentCell}>
                      <span className={documentStatusPill} style={{ background: tone.background, color: tone.color }}>
                        <span className={documentStatusDot} />
                        {document.status}
                      </span>
                    </td>
                    <td className={`${documentCell} ${documentActionsCell}`}>
                      <div className={tableActions}>
                        <button type="button" className={`${btn({ variant: "ghost" })} ${compactIconButton}`}>
                          <Download size={14} />
                        </button>
                        <button type="button" className={`${btn({ variant: "ghost" })} ${compactIconButton}`}>
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className={footerBar}>
            <span>
              Mostrando {visibleDocuments.length} de {DOCUMENTS.length} documentos
            </span>
            <div className={pager}>
              <button type="button" className={`${btn({ variant: "ghost" })} ${compactIconButton}`}>
                <ChevronLeft size={13} />
              </button>
              <button type="button" className={`${btn({ variant: "ghost" })} ${compactIconButton}`}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentsPageFallback() {
  return <div className={loadingState}>Carregando documentos...</div>
}

function DocumentsContent() {
  const { activeTab, modelosFilter, handleTabChange, handleNavigateToModelos, handleOpenDocuments } = useTabRouting()

  const tabActions =
    activeTab === "meus-documentos" ? (
      <Link href={templateEditorPath("contrato-honorarios")} className={`${btn({ variant: "primary" })} ${compactSecondaryButton}`}>
        <Plus size={13} />Novo documento
      </Link>
    ) : undefined

  return (
    <AppShell active="documentos" breadcrumb={["Documentos"]} actions={tabActions}>
      <div className={pageShell}>
        <DocumentsTabStrip activeTab={activeTab} onChange={handleTabChange} />
        <div className={tabPanel}>
          {activeTab === "criar" && <DocumentsCreateTab onNavigateToModelos={handleNavigateToModelos} onOpenDocuments={handleOpenDocuments} />}
          {activeTab === "meus-documentos" && <DocumentsLibraryTab />}
          {activeTab === "modelos" && <DocumentsTemplatesTab initialFilter={modelosFilter} />}
        </div>
      </div>
    </AppShell>
  )
}

export function DocumentsPage() {
  return (
    <Suspense fallback={<DocumentsPageFallback />}>
      <DocumentsContent />
    </Suspense>
  )
}
