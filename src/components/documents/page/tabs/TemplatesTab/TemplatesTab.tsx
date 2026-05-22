import Link from "next/link"
import { ArrowRight, Briefcase, Feather, FileText, Lock, Plus, Scale, Upload } from "lucide-react"
import { btn } from "@/styles/components.css"
import { DOC_CATEGORIES, templateEditorPath } from "@/lib/documents/registry"
import { useTemplateFilter } from "../../hooks/useTemplateFilter"
import { scrollArea, pageFrame, compactSecondaryButton, categoryIcon, templateOrb, templateMuted } from "../../documents-page.css"
import {
  pageFrameTemplates,
  templateBadge,
  templateBadgeMuted,
  templateCard,
  templateCardDisabled,
  templateChip,
  templateChipRow,
  templateDescription,
  templateDisabledHeader,
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
