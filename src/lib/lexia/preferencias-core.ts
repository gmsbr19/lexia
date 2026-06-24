// Lógica PURA das preferências da LexIA (sem Prisma) — testável isolada, mesmo
// padrão de src/lib/notificacoes/preferencias-core.ts. Define o estilo (persona +
// instruções editáveis), o modo do agente, o modelo e os toggles, e MONTA o
// bloco <personalizacao> que vai no contexto volátil do turno (NÃO no system
// prompt cacheado — ver agent/prompt.ts).

export type LexiaPersona = "custom" | "senior" | "cordial" | "analista"
export type LexiaAgentMode = "agente" | "pergunta" | "plano"
export type LexiaModelo = "auto" | "rapido" | "avancado"

/** Documento de instruções editável (modal Personalizar a LexIA). */
export interface LexiaInstrucoes {
  identidade: string
  interacao: string
  memorias: string[]
}

export interface LexiaPrefs {
  /** estilo selecionado na grade de personas */
  persona?: LexiaPersona
  /** documento de instruções editável */
  instrucoes?: Partial<LexiaInstrucoes>
  /** Agente (executa, gated) · Pergunta (só consulta) · Planejamento (plano→aprovação) */
  agentMode?: LexiaAgentMode
  /** acesso à web (consultar leis/jurisprudência online) — persistido; ainda sem tool */
  webAccess?: boolean
  /** ligado: implementa sem confirmar; desligado (padrão): pede confirmação */
  autoMode?: boolean
  /** Automático (roteamento) · Rápido (Sonnet) · Avançado (Opus) */
  modelo?: LexiaModelo
}

export const DEFAULT_INSTRUCOES: LexiaInstrucoes = {
  identidade:
    "Você é a LexIA, assistente do escritório. Tem acesso a clientes, casos, contratos, prazos processuais, financeiro e agenda. Cita legislação e jurisprudência quando pertinente, respeita o sigilo profissional e nunca inventa números de processo ou valores.",
  interacao:
    "Responde em português jurídico claro e formal. Destaca prazos fatais, valores em aberto e riscos. Encerra com próximos passos acionáveis e, quando útil, oferece minutar documentos ou criar tarefas.",
  memorias: ["Datas no formato dd/mm/aaaa e valores em R$."],
}

/** Preferências efetivas (defaults aplicados) — o que a UI exibe e o agente usa. */
export const DEFAULT_PREFS: Required<Omit<LexiaPrefs, "instrucoes">> & { instrucoes: LexiaInstrucoes } = {
  persona: "senior",
  instrucoes: DEFAULT_INSTRUCOES,
  agentMode: "agente",
  webAccess: true,
  autoMode: false,
  modelo: "auto",
}

export type LexiaPrefsResolved = typeof DEFAULT_PREFS

/** JSON cru do banco → objeto parcial (tolerante a null/lixo), sem aplicar defaults. */
export function parseLexiaPrefs(raw: string | null | undefined): LexiaPrefs {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === "object" ? (v as LexiaPrefs) : {}
  } catch {
    return {}
  }
}

/** Preenche os defaults sobre um objeto parcial → preferências efetivas. */
export function resolveLexiaPrefs(p: LexiaPrefs | null | undefined): LexiaPrefsResolved {
  const base = p ?? {}
  return {
    persona: base.persona ?? DEFAULT_PREFS.persona,
    instrucoes: {
      identidade: base.instrucoes?.identidade ?? DEFAULT_INSTRUCOES.identidade,
      interacao: base.instrucoes?.interacao ?? DEFAULT_INSTRUCOES.interacao,
      memorias:
        Array.isArray(base.instrucoes?.memorias) && base.instrucoes!.memorias.length > 0
          ? base.instrucoes!.memorias
          : DEFAULT_INSTRUCOES.memorias,
    },
    agentMode: base.agentMode ?? DEFAULT_PREFS.agentMode,
    webAccess: base.webAccess ?? DEFAULT_PREFS.webAccess,
    autoMode: base.autoMode ?? DEFAULT_PREFS.autoMode,
    modelo: base.modelo ?? DEFAULT_PREFS.modelo,
  }
}

const PERSONA_TOM: Record<LexiaPersona, string> = {
  senior: "advogado sênior — técnico, formal e preciso",
  cordial: "cordial — caloroso e próximo, mantendo o rigor jurídico",
  analista: "analista — estruturado e baseado em dados, com listas e números quando ajudar",
  custom: "",
}

const MODO_DIRETRIZ: Record<LexiaAgentMode, string> = {
  agente: "",
  pergunta:
    "MODO PERGUNTA: apenas responda e consulte os dados; NÃO proponha nem execute criações, edições ou exclusões.",
  plano:
    "MODO PLANEJAMENTO: antes de agir, apresente um plano sucinto das ações que pretende executar e só prossiga após o usuário aprovar.",
}

/**
 * Bloco <personalizacao> anexado ao contexto volátil do turno (NUNCA ao CORE
 * cacheado): tom da persona + instruções do usuário + modo do agente. Mantém o
 * texto enxuto; campos vazios são omitidos. PURO (testável).
 */
export function personalizacaoPrompt(p: LexiaPrefs | null | undefined): string {
  const r = resolveLexiaPrefs(p)
  const linhas: string[] = []
  const tom = PERSONA_TOM[r.persona]
  if (tom) linhas.push(`Tom de comunicação: ${tom}.`)
  if (r.instrucoes.identidade.trim()) linhas.push(`Identidade: ${r.instrucoes.identidade.trim()}`)
  if (r.instrucoes.interacao.trim()) linhas.push(`Estilo de interação: ${r.instrucoes.interacao.trim()}`)
  const mem = r.instrucoes.memorias.map((m) => m.trim()).filter(Boolean)
  if (mem.length) linhas.push(`Preferências registradas: ${mem.join("; ")}.`)
  const modo = MODO_DIRETRIZ[r.agentMode]
  if (modo) linhas.push(modo)
  if (linhas.length === 0) return ""
  return `\n<personalizacao>\n${linhas.join("\n")}\n</personalizacao>`
}
