"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { btn } from "@/styles/components.css"
import type { DocumentoRow } from "@/lib/documentos/types"
import { DocumentsTabStrip } from "./tabs/TabStrip"
import { useTabRouting } from "./hooks/useTabRouting"
import { DocumentsCreateTab } from "./tabs/CreateTab/CreateTab"
import { DocumentsTemplatesTab } from "./tabs/TemplatesTab/TemplatesTab"
import { DocumentsLibraryTab } from "./tabs/LibraryTab/LibraryTab"
import { TimbradosManager } from "../timbrados/TimbradosManager"
import { pageShell, tabPanel, compactSecondaryButton, loadingState } from "./documents-page.css"

function DocumentsPageFallback() {
  return <div className={loadingState}>Carregando documentos...</div>
}

function DocumentsContent({ documentos }: { documentos: DocumentoRow[] }) {
  const { activeTab, modelosFilter, handleTabChange, handleNavigateToModelos, handleOpenDocuments } = useTabRouting()

  const rascunhos = documentos.filter((doc) => doc.status === "rascunho")

  const tabActions =
    activeTab === "meus-documentos" ? (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/documents/novo" className={`${btn({ variant: "primary" })} ${compactSecondaryButton}`}>
          <Plus size={13} />Novo documento
        </Link>
      </div>
    ) : undefined

  return (
    <>
      <div className={pageShell}>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DocumentsTabStrip activeTab={activeTab} onChange={handleTabChange} />
          </div>
          {tabActions && (
            <div style={{ display: "flex", alignItems: "center", paddingRight: 40, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              {tabActions}
            </div>
          )}
        </div>
        <div className={tabPanel}>
          {activeTab === "criar" && (
            <DocumentsCreateTab rascunhos={rascunhos} onNavigateToModelos={handleNavigateToModelos} onOpenDocuments={handleOpenDocuments} />
          )}
          {activeTab === "meus-documentos" && <DocumentsLibraryTab documentos={documentos} />}
          {activeTab === "modelos" && <DocumentsTemplatesTab initialFilter={modelosFilter} />}
          {activeTab === "timbrados" && <TimbradosManager embedded />}
        </div>
      </div>
    </>
  )
}

export function DocumentsPage({ documentos }: { documentos: DocumentoRow[] }) {
  return (
    <Suspense fallback={<DocumentsPageFallback />}>
      <DocumentsContent documentos={documentos} />
    </Suspense>
  )
}
