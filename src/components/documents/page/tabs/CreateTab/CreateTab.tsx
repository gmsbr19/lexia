"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Briefcase, Feather, FileText, Paperclip, Scale, Sparkles, User } from "lucide-react"
import { btn } from "@/styles/components.css"
import { DOC_CATEGORIES, DOCUMENT_TEMPLATES, getFeaturedTemplates, templateEditorPath } from "@/lib/documents/registry"
import type { DocCategory } from "@/lib/documents/registry"
import { DOCUMENT_DRAFTS, DOCUMENT_EXAMPLES, DOCUMENT_TYPE_ABBR } from "../../documents-page.data"
import { DocumentsSectionHeader } from "../SectionHeader"
import { sectionHeader, sectionTitle, sectionHint } from "../SectionHeader.css"
import { scrollArea, pageFrame, toolbarSpacer, categoryIcon, templateOrb, templateMuted, documentTypeText, documentIconBar } from "../../documents-page.css"
import {
  pageFrameCreate,
  section,
  heroTitle,
  heroLead,
  composerCard,
  composerGlow,
  composerInner,
  composerLabel,
  composerTextarea,
  composerFooter,
  composerHint,
  compactButton,
  compactGoldButton,
  exampleRow,
  exampleLabel,
  exampleChip,
  exampleChipIcon,
  exampleChipText,
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
  draftProgressBlock,
  draftProgressTrack,
  draftProgressFill,
  draftProgressLabel,
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
import { SparklesIcon } from "@/components/animate-ui/icons/sparkles"

const ICON_MAP: Record<string, React.ElementType> = {
  Scroll: FileText,
  Feather,
  Briefcase,
  Scale,
}

export function DocumentsCreateTab({
  onNavigateToModelos,
  onOpenDocuments,
}: {
  onNavigateToModelos: (filter?: DocCategory) => void
  onOpenDocuments: () => void
}) {
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
                <SparklesIcon size={11} strokeWidth={2} animate loop />
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
                  <span className={quickTemplateCode}>
                    {template.category === "Contrato" ? "CT" : template.category === "Procuração" ? "PR" : template.category === "Proposta" ? "PP" : "PJ"}
                  </span>
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
