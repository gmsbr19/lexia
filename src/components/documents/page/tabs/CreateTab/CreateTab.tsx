"use client"

import Link from "next/link"
import { ArrowRight, Briefcase, FileText, Feather, Scale, Sparkles } from "lucide-react"
import { DOC_CATEGORIES, DOCUMENT_TEMPLATES, getFeaturedTemplates, templateEditorPath } from "@/lib/documents/registry"
import type { DocCategory } from "@/lib/documents/registry"
import type { DocumentoRow } from "@/lib/documentos/types"
import { abreviaturaDoTemplate, categoriaDoTemplate, dataRelativa } from "../../documents-page.data"
import { DocumentsSectionHeader } from "../SectionHeader"
import { sectionHeader, sectionTitle, sectionHint } from "../SectionHeader.css"
import { scrollArea, pageFrame, categoryIcon, templateOrb, templateMuted, documentTypeText } from "../../documents-page.css"
import {
  pageFrameCreate,
  section,
  heroTitle,
  heroLead,
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
  featuredGrid,
  featuredCard,
  quickTemplateIcon,
  quickTemplateCode,
  quickTemplateBar,
  quickTemplateBody,
  quickTemplateTitle,
  quickTemplateSubtitle,
  quickTemplateArrow,
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
  const featuredTemplates = getFeaturedTemplates()

  return (
    <div className={scrollArea}>
      <div className={`${pageFrame} ${pageFrameCreate}`}>
        {/* AI access lives in the global LexIA bar (no redundant in-page composer). */}
        <div className={section}>
          <h1 className={heroTitle}>O que vamos criar?</h1>
          <p className={heroLead}>Escolha um modelo abaixo ou descreva o documento na barra da LexIA.</p>
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
                  href={`${templateEditorPath(draft.template)}?documento=${draft.id}`}
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

        <section className={section}>
          <DocumentsSectionHeader title="Atalhos do escritório" subtitle="Modelos prontos para começar" action="Ver biblioteca" onAction={() => onNavigateToModelos()} />
          <div className={featuredGrid}>
            {featuredTemplates.map((template) => (
              <Link key={template.id} href={templateEditorPath(template.id)} className={featuredCard}>
                <div className={quickTemplateIcon}>
                  <span className={quickTemplateCode}>
                    {template.category === "Contrato" ? "CT" : template.category === "Procuração" ? "PR" : template.category === "Proposta" ? "PP" : "PJ"}
                  </span>
                  <span className={quickTemplateBar} />
                </div>
                <div className={quickTemplateBody}>
                  <div className={quickTemplateTitle}>{template.name}</div>
                  <div className={quickTemplateSubtitle}>{template.category}</div>
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
