export type DocCategory = 'Contrato' | 'Procuração' | 'Proposta' | 'Parecer Jurídico'

export interface DocumentTemplate {
  id: string
  category: DocCategory
  name: string
  description: string
  clauseCount?: number
  lastRevision?: string
  featured: boolean
  usageCount: number
  available: boolean
}

export interface DocCategoryMeta {
  id: DocCategory
  iconName: string
  description: string
}

export const DOC_CATEGORIES: DocCategoryMeta[] = [
  { id: 'Contrato',        iconName: 'Scroll',   description: 'Prestação de serviços, locação, honorários e demais avenças.' },
  { id: 'Procuração',      iconName: 'Feather',  description: 'Ad judicia, com poderes específicos ou cláusulas reservadas.' },
  { id: 'Proposta',        iconName: 'Briefcase',description: 'Carta-proposta de honorários e escopo de atuação técnica.' },
  { id: 'Parecer Jurídico',iconName: 'Scale',    description: 'Análise técnica fundamentada com conclusão e recomendações.' },
]

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'contrato-honorarios',
    category: 'Contrato',
    name: 'Contrato de Honorários Advocatícios',
    description: 'Para honorários mensais, parcelados, por êxito ou combinados.',
    clauseCount: 17,
    lastRevision: 'mai/2026',
    featured: true,
    usageCount: 142,
    available: true,
  },
  {
    id: 'contrato-prestacao-servicos',
    category: 'Contrato',
    name: 'Contrato de Prestação de Serviços Advocatícios',
    description: 'Para demandas específicas com escopo e valor definidos.',
    clauseCount: 14,
    lastRevision: 'mar/2026',
    featured: true,
    usageCount: 38,
    available: true,
  },
  {
    id: 'procuracao-ad-judicia',
    category: 'Procuração',
    name: 'Procuração Ad Judicia',
    description: 'Poderes gerais para representação em todas as instâncias.',
    clauseCount: 6,
    featured: false,
    usageCount: 0,
    available: false,
  },
  {
    id: 'procuracao-poderes-especificos',
    category: 'Procuração',
    name: 'Procuração com Poderes Específicos',
    description: 'Procuração com poderes limitados a ato ou processo determinado.',
    clauseCount: 4,
    featured: false,
    usageCount: 0,
    available: false,
  },
  {
    id: 'proposta-honorarios',
    category: 'Proposta',
    name: 'Carta-Proposta de Honorários',
    description: 'Proposta formal com escopo técnico e condições de pagamento.',
    featured: false,
    usageCount: 0,
    available: false,
  },
  {
    id: 'parecer-juridico',
    category: 'Parecer Jurídico',
    name: 'Parecer Jurídico',
    description: 'Análise técnica fundamentada com embasamento doutrinário e jurisprudencial.',
    featured: false,
    usageCount: 0,
    available: false,
  },
]

export function getTemplate(id: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesByCategory(category: DocCategory): DocumentTemplate[] {
  return DOCUMENT_TEMPLATES.filter(t => t.category === category)
}

export function getFeaturedTemplates(): DocumentTemplate[] {
  return DOCUMENT_TEMPLATES
    .filter(t => t.featured && t.available)
    .sort((a, b) => b.usageCount - a.usageCount)
}

export function templateEditorPath(id: string): string {
  return `/documents/editor/${id}`
}
