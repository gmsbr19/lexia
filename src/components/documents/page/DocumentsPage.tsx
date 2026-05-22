"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { DocumentsTabStrip } from "./tabs/TabStrip"
import { DocumentsSectionHeader } from "./tabs/SectionHeader"
import { sectionHeader, sectionTitle, sectionHint } from "./tabs/SectionHeader.css"
import { useTabRouting } from "./hooks/useTabRouting"
import { useDocumentFilter } from "./hooks/useDocumentFilter"
import { useTemplateFilter } from "./hooks/useTemplateFilter"
import {
  ArrowRight,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  Feather,
  FileText,
  Filter,
  Lock,
  MoreHorizontal,
  Paperclip,
  Plus,
  Scale,
  Search,
  Sparkles,
  Upload,
  User,
} from "lucide-react"
import { AppShell } from "@/components/shell/AppShell"
import { btn } from "@/styles/components.css"
import {
  DOC_CATEGORIES,
  DOCUMENT_TEMPLATES,
  getFeaturedTemplates,
  templateEditorPath,
  type DocCategory,
} from "@/lib/documents/registry"
import {
  avatar,
  cardFooter,
  categoryCard,
  categoryDescription,
  categoryGrid,
  categoryIcon,
  categoryTitle,
  composerCard,
  composerFooter,
  composerGlow,
  composerHint,
  composerInner,
  composerLabel,
  composerTextarea,
  draftIcon,
  draftGrid,
  draftLink,
  draftHeaderRow,
  draftHeaderGroup,
  draftMeta,
  draftMetaBody,
  draftBody,
  draftClientLine,
  draftProgressBlock,
  draftTypeText,
  draftSourceText,
  draftProgressLabel,
  draftProgressFill,
  draftProgressMeta,
  draftProgressTrack,
  draftProgressWrap,
  draftSubtitle,
  draftTitle,
  exampleChip,
  exampleChipIcon,
  exampleChipText,
  exampleLabel,
  exampleRow,
  featuredCard,
  featuredDescription,
  featuredGrid,
  quickTemplateIcon,
  quickTemplateCode,
  quickTemplateBar,
  quickTemplateBody,
  quickTemplateTitle,
  quickTemplateSubtitle,
  quickTemplateArrow,
  featuredTitle,
  compactButton,
  compactGoldButton,
  compactIconButton,
  compactPageAction,
  compactSecondaryButton,
  filterBar,
  footerBar,
  heroLead,
  heroTitle,
  librarySubtitle,
  libraryTitle,
  libraryHeader,
  pageShell,
  pageFrame,
  pageFrameCreate,
  pageFrameLibrary,
  pageFrameTemplates,
  pager,
  scrollArea,
  searchIcon,
  searchInput,
  searchWrap,
  section,
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
  templateBadge,
  templateBadgeMuted,
  templateCard,
  templateCardDisabled,
  templateChip,
  templateDescription,
  templateFooter,
  templateHeader,
  templateDisabledHeader,
  templateMuted,
  templateOrb,
  templatesTitle,
  templateTitle,
  templatesActions,
  templatesGrid,
  templatesHeader,
  templateChipRow,
  toolbarSpacer,
  loadingState,
  sectionCard,
} from "./documents-page.css"
import {
  DOCUMENT_DRAFTS,
  DOCUMENT_EXAMPLES,
  DOCUMENT_LIBRARY_FILTERS,
  DOCUMENTS,
  DOCUMENT_STATS,
  DOCUMENT_TYPE_ABBR,
} from "./documents-page.data"

const ICON_MAP: Record<string, React.ElementType> = {
  Scroll: FileText,
  Feather,
  Briefcase,
  Scale,
}

function statusTone(status: string) {
  if (status === "Finalizado") return { background: "rgba(46,160,67,0.12)", color: "#2ea043" }
  if (status === "Assinado") return { background: "var(--accent-soft)", color: "var(--accent)" }
  if (status === "Rascunho") return { background: "var(--bg-sunken)", color: "var(--text-muted)" }
  return { background: "rgba(2,13,37,0.06)", color: "var(--text-muted)" }
}

function DocumentsCreateTab({ onNavigateToModelos, onOpenDocuments }: { onNavigateToModelos: (filter?: DocCategory) => void; onOpenDocuments: () => void }) {
  const [prompt, setPrompt] = useState("")
  const featuredTemplates = getFeaturedTemplates()

  return (
    <div className={scrollArea}>
      <div className={`${pageFrame} ${pageFrameCreate}`}>
        <div className={section}>
          <h1 className={heroTitle}>O que vamos criar?</h1>
          <p className={heroLead}>Descreva o documento — a IA escolhe o modelo e preenche para você.</p>

          <div className={composerCard}>
            <div className={composerGlow} />
            <div className={composerInner}>
              <div className={composerLabel}>
                <Sparkles size={11} strokeWidth={2} />
                Assistente LexIA
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Descreva o documento que precisa criar. Ex: contrato de honorários para Helena Vargas, R$ 12.000 fixos + 20% sobre êxito, foro de São Paulo…"
                className={composerTextarea}
              />

              <div className={composerFooter}>
                <button type="button" className={`${btn({ variant: "ghost" })} ${compactButton}`}>
                  <Paperclip size={12} />
                  Anexar caso
                </button>
                <button type="button" className={`${btn({ variant: "ghost" })} ${compactButton}`}>
                  <User size={12} />
                  Vincular cliente
                </button>
                <div className={toolbarSpacer} />
                <span className={composerHint}>A IA escolhe o modelo ideal</span>
                <button type="button" className={`${btn({ variant: "gold" })} ${compactGoldButton}`}>
                  <Sparkles size={12} strokeWidth={2} />
                  Criar com IA
                </button>
              </div>
            </div>
          </div>

          <div className={exampleRow}>
            <span className={exampleLabel}>Exemplos:</span>
            {DOCUMENT_EXAMPLES.map((example) => (
              <button key={example} type="button" className={exampleChip} onClick={() => setPrompt(example)}>
                <Sparkles size={10} strokeWidth={2} className={exampleChipIcon} />
                <span className={exampleChipText}>{example}</span>
              </button>
            ))}
          </div>
        </div>

        <section className={section}>
          <DocumentsSectionHeader title="Continue de onde parou" subtitle="3 rascunhos em aberto" action="Ver todos" onAction={onOpenDocuments} />
          <div className={draftGrid}>
            {DOCUMENT_DRAFTS.map((draft) => (
              <Link key={draft.name} href={templateEditorPath(draft.templateId)} className={draftLink}>
                <div className={draftHeaderRow}>
                  <div className={draftHeaderGroup}>
                    <div className={draftIcon}>
                      <span className={documentTypeText}>{DOCUMENT_TYPE_ABBR[draft.type] ?? "??"}</span>
                      <span className={documentIconBar} />
                    </div>
                    <span className={draftTypeText}>{draft.type}</span>
                  </div>
                  {draft.source === "ai" && (
                    <span className={draftSourceText}>
                      <Sparkles size={10} strokeWidth={2} />
                      IA
                    </span>
                  )}
                </div>
                <div className={draftBody}>
                  <div className={draftTitle}>{draft.name}</div>
                  <div className={draftClientLine}>
                    {draft.client} · {draft.modified}
                  </div>
                </div>
                <div className={draftProgressBlock}>
                  <div className={draftProgressTrack}>
                    <div className={draftProgressFill} style={{ width: `${draft.progress}%` }} />
                  </div>
                  <div className={draftProgressLabel}>{draft.progress}% completo</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={section}>
          <DocumentsSectionHeader title="Atalhos do escritório" subtitle="Modelos mais usados no último mês" action="Ver biblioteca" onAction={() => onNavigateToModelos()} />
          <div className={featuredGrid}>
            {featuredTemplates.map((template) => (
              <Link key={template.id} href={templateEditorPath(template.id)} className={featuredCard}>
                <div className={quickTemplateIcon}>
                  <span className={quickTemplateCode}>{template.category === "Contrato" ? "CT" : template.category === "Procuração" ? "PR" : template.category === "Proposta" ? "PP" : "PJ"}</span>
                  <span className={quickTemplateBar} />
                </div>
                <div className={quickTemplateBody}>
                  <div className={quickTemplateTitle}>{template.name}</div>
                  <div className={quickTemplateSubtitle}>
                    {template.category} · Usado {template.usageCount}×
                  </div>
                </div>
                <ArrowRight className={quickTemplateArrow} size={14} />
              </Link>
            ))}
          </div>
        </section>

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

function DocumentsTemplatesTab({ initialFilter }: { initialFilter: string }) {
  const { activeFilter, setActiveFilter, visibleTemplates } = useTemplateFilter(initialFilter)

  return (
    <div className={scrollArea}>
      <div className={`${pageFrame} ${pageFrameTemplates}`}>
        <div className={templatesHeader}>
          <h1 className={templatesTitle}>Modelos</h1>
          <div className={templatesActions}>
            <button type="button" className={`${btn({ variant: "secondary" })} ${compactSecondaryButton}`}>
              <Upload size={13} />Importar .docx
            </button>
            <button type="button" className={`${btn({ variant: "primary" })} ${compactSecondaryButton}`}>
              <Plus size={13} />Novo modelo
            </button>
          </div>
        </div>

        <div className={templateChipRow}>
          {[
            "",
            ...DOC_CATEGORIES.map((category) => category.id),
          ].map((filter) => (
            <button key={filter || "todos"} type="button" onClick={() => setActiveFilter(filter)} className={templateChip({ active: activeFilter === filter })}>
              {filter || "Todos"}
            </button>
          ))}
        </div>

        <div className={templatesGrid}>
          {visibleTemplates.map((template) => {
            const category = DOC_CATEGORIES.find((entry) => entry.id === template.category)
            const Icon = ICON_MAP[category?.iconName ?? "Scroll"] ?? FileText

            if (!template.available) {
              return (
                <div key={template.id} className={`${templateCard} ${templateCardDisabled}`}>
                  <div className={templateDisabledHeader}>
                    <div className={categoryIcon}>
                      <Icon size={18} strokeWidth={1.6} />
                    </div>
                    <span className={`${templateBadge} ${templateBadgeMuted}`}>
                      <Lock size={9} />Em breve
                    </span>
                  </div>
                  <div className={templateTitle}>{template.name}</div>
                  <div className={templateDescription}>{template.description}</div>
                </div>
              )
            }

            return (
              <Link key={template.id} href={templateEditorPath(template.id)} className={templateCard}>
                <div className={templateOrb} />
                <div className={templateHeader}>
                  <div className={categoryIcon}>
                    <Icon size={18} strokeWidth={1.6} />
                  </div>
                  <span className={templateBadge}>{template.category}</span>
                </div>
                <div className={templateTitle}>{template.name}</div>
                <div className={templateDescription}>{template.description}</div>
                <div className={templateFooter}>
                  <div className={templateMuted}>
                    {template.clauseCount ? `${template.clauseCount} cláusulas` : ""}
                    {template.clauseCount && template.lastRevision ? " · " : ""}
                    {template.lastRevision ? `Rev. ${template.lastRevision}` : ""}
                  </div>
                  <ArrowRight size={13} color="var(--accent)" />
                </div>
              </Link>
            )
          })}
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
