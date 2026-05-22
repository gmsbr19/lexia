"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { AppShell } from "@/components/shell/AppShell"
import { btn } from "@/styles/components.css"
import { templateEditorPath } from "@/lib/documents/registry"
import { DocumentsTabStrip } from "./tabs/TabStrip"
import { useTabRouting } from "./hooks/useTabRouting"
import { DocumentsCreateTab } from "./tabs/CreateTab/CreateTab"
import { DocumentsTemplatesTab } from "./tabs/TemplatesTab/TemplatesTab"
import { DocumentsLibraryTab } from "./tabs/LibraryTab/LibraryTab"
import { pageShell, tabPanel, compactSecondaryButton, loadingState } from "./documents-page.css"

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
