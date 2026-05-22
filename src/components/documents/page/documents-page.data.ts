export const DOCUMENT_DRAFTS = [
  { name: "Contrato de Honorários — Helena Vargas", type: "Contrato", client: "Helena Vargas", modified: "há 2 horas", progress: 72, templateId: "contrato-honorarios", source: "ai" },
  { name: "Procuração ad judicia — Construtora Aurora", type: "Procuração", client: "Aurora S/A", modified: "ontem", progress: 40, templateId: "contrato-honorarios", source: "manual" },
  { name: "Parecer — Cláusula 4.2 (Mendonça)", type: "Parecer Jurídico", client: "Mendonça & Filhos", modified: "3 mar", progress: 88, templateId: "contrato-honorarios", source: "ai" },
]

export const DOCUMENTS = [
  { name: "Contrato de Honorários — Helena Vargas", type: "Contrato", client: "Helena Vargas", author: "Rafael Moraes", date: "há 4 min", status: "Finalizado", size: "324 KB", source: "ai" },
  { name: "Procuração ad judicia — Construtora Aurora S/A", type: "Procuração", client: "Aurora S/A", author: "Camila Reis", date: "ontem · 17:42", status: "Assinado", size: "118 KB", source: "manual" },
  { name: "Parecer — Cláusula 4.2 do contrato Mendonça", type: "Parecer Jurídico", client: "Mendonça & Filhos", author: "Rafael Moraes", date: "3 mar 2026", status: "Finalizado", size: "446 KB", source: "ai" },
  { name: "Proposta de honorários — Tech Holding LTDA", type: "Proposta", client: "Tech Holding", author: "Camila Reis", date: "2 mar 2026", status: "Rascunho", size: "86 KB", source: "manual" },
  { name: "Contrato de cessão — Editora Linhares", type: "Contrato", client: "Editora Linhares", author: "Rafael Moraes", date: "28 fev 2026", status: "Assinado", size: "512 KB", source: "ai" },
  { name: "Procuração específica — Imóvel Vila Madalena", type: "Procuração", client: "Família Soares", author: "Diego Tomé", date: "26 fev 2026", status: "Finalizado", size: "94 KB", source: "manual" },
  { name: "Parecer — Impacto LGPD em sistema CRM", type: "Parecer Jurídico", client: "HelpFlow Brasil", author: "Camila Reis", date: "22 fev 2026", status: "Em revisão", size: "612 KB", source: "ai" },
]

export const DOCUMENT_STATS = [
  { label: "Contratos", count: 76, trend: "+12%" },
  { label: "Procurações", count: 38, trend: "+4%" },
  { label: "Pareceres", count: 19, trend: "−2%" },
  { label: "Propostas", count: 9, trend: "+22%" },
]

export const DOCUMENT_TYPE_ABBR: Record<string, string> = {
  Contrato: "CT",
  Procuração: "PR",
  Proposta: "PP",
  "Parecer Jurídico": "PJ",
}

export const DOCUMENT_EXAMPLES = [
  "Contrato de honorários mensais R$ 8.500",
  "Procuração ad judicia para ação trabalhista",
  "Proposta de consultoria empresarial",
  "Parecer sobre impacto da LGPD",
]

export const DOCUMENT_LIBRARY_FILTERS = ["Todos", "Contratos", "Procurações", "Propostas", "Pareceres"] as const
