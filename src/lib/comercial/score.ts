// Pure scoring core for the Comercial CRM — Lead Fit/Perfil (0-100) +
// Engajamento (0-100) + Estado combinado (A/B/C/D) + prioridade de
// follow-up + sugestão de cadência + regras automáticas de perda. NO prisma
// / React imports: plain values in, plain values out (money = integer
// centavos elsewhere; aqui só números/strings) — a MESMA core alimenta o
// servidor (queries.ts → cron/LexIA) e o cliente (cm-meta.ts → aba
// Follow-up). Testável isoladamente (tests/comercial-score.test.ts).
//
// Só usa `import type` de settings.ts (tipos de config), nunca valores —
// settings.ts é SERVER ONLY (importa prisma) e este módulo também é
// consumido por componentes "use client".
import type { CriterioFitKey, FollowupConfig, ScoringConfig } from "@/lib/settings"

// Sinais reservados — derivados automaticamente do `resultado` classificado
// de cada toque (nunca marcados manualmente). settings.ts reimporta esta
// constante para validar que a config sempre os inclui.
export const SINAIS_RESULTADO = ["sem_resposta", "fria", "positiva"] as const
export type ResultadoToque = (typeof SINAIS_RESULTADO)[number]

// Defaults das duas configs (comercial.scoring/comercial.followup) — vivem
// AQUI (núcleo puro, sem prisma) e não em settings.ts porque precisam ser
// importados como VALOR (não só tipo) pelo store client-side
// (src/lib/comercial/scoring/store.ts), como fallback antes do 1º load.
// settings.ts é SERVER ONLY (importa prisma via lib/db) — importar um valor
// de lá num módulo alcançável pelo bundle do navegador arrasta o Prisma (e a
// validação de env.ts) para o cliente, onde DATABASE_URL/AUTH_SECRET não
// existem → crash em toda página. settings.ts reimporta estas constantes.
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  areaJuridica: { principais: [], secundarias: [], pontosPrincipal: 20, pontosSecundaria: 12, pontosFora: 0 },
  origem: [
    { key: "indicacao", label: "Indicação", pontos: 15 },
    { key: "organico", label: "Orgânico / site", pontos: 12 },
    { key: "google_ads", label: "Google Ads", pontos: 9 },
    { key: "meta_ads", label: "Meta Ads", pontos: 6 },
    { key: "outro", label: "Outro", pontos: 3 },
  ],
  criterios: [
    {
      key: "potencialFinanceiro",
      label: "Potencial financeiro (ticket/honorários)",
      opcoes: [
        { key: "alto", label: "Alto", pontos: 25 },
        { key: "medio", label: "Médio", pontos: 15 },
        { key: "baixo", label: "Baixo", pontos: 7 },
        { key: "indefinido", label: "Indefinido", pontos: 3 },
      ],
    },
    {
      key: "urgenciaNivel",
      label: "Urgência / prazo legal",
      opcoes: [
        { key: "alta", label: "Prazo legal iminente", pontos: 15 },
        { key: "media", label: "Urgente", pontos: 10 },
        { key: "baixa", label: "Sem pressa", pontos: 5 },
      ],
    },
    {
      key: "poderDecisao",
      label: "Poder de decisão",
      opcoes: [
        { key: "decisor", label: "Decisor", pontos: 10 },
        { key: "influenciador", label: "Influenciador", pontos: 5 },
        { key: "sem_poder", label: "Sem autonomia", pontos: 2 },
      ],
    },
    {
      key: "jurisdicao",
      label: "Jurisdição",
      opcoes: [
        { key: "local", label: "Atendida", pontos: 10 },
        { key: "proxima", label: "Atendível remotamente", pontos: 6 },
        { key: "fora", label: "Fora", pontos: 0 },
      ],
    },
    {
      key: "viabilidade",
      label: "Viabilidade do caso (avaliação do advogado)",
      opcoes: [
        { key: "alta", label: "Alta", pontos: 5 },
        { key: "media", label: "Média", pontos: 3 },
        { key: "baixa", label: "Baixa", pontos: 1 },
      ],
    },
  ],
  sinais: [
    { key: "iniciou_contato_inbound", label: "Iniciou o contato (inbound)", pontos: 15 },
    { key: "respondeu_primeiro_contato", label: "Respondeu ao 1º contato", pontos: 15 },
    { key: "respondeu_rapido", label: "Respondeu em menos de 24h", pontos: 10 },
    { key: "compareceu_reuniao", label: "Compareceu à reunião agendada", pontos: 20 },
    { key: "enviou_documentos", label: "Enviou documentos solicitados", pontos: 15 },
    { key: "visualizou_proposta", label: "Visualizou a proposta", pontos: 10 },
    { key: "respondeu_proposta", label: "Respondeu à proposta", pontos: 15 },
    { key: "no_show", label: "No-show em reunião", pontos: -15 },
    { key: "sem_resposta", label: "Interação sem resposta", pontos: -10 },
    { key: "fria", label: "Interação fria", pontos: -5 },
    { key: "positiva", label: "Interação positiva", pontos: 0 },
  ],
  limiares: { fitQualificado: 60, engajamentoQuente: 50 },
}

export const DEFAULT_FOLLOWUP_CONFIG: FollowupConfig = {
  cadencia: [
    { dia: 0, canais: ["ligacao", "whatsapp"], objetivo: "Primeiro contato" },
    { dia: 1, canais: ["email"], objetivo: "Follow-up com material de valor" },
    { dia: 3, canais: ["ligacao", "whatsapp"], objetivo: "Reforço de valor + prova social (casos de êxito)" },
    { dia: 6, canais: ["email"], objetivo: "Conteúdo educativo sobre o tema jurídico" },
    { dia: 10, canais: ["whatsapp", "ligacao"], objetivo: "Check-in" },
    { dia: 15, canais: ["ligacao"], objetivo: "Quebra de padrão / senso de urgência" },
    { dia: 21, canais: ["email"], objetivo: "Encerramento (breakup) — última tentativa" },
  ],
  prioridade: { pesoFit: 40, pesoEng: 30, pesoUrg: 30 },
  urgenciaHorizonteDias: 7,
  regrasPerda: { semRespostaConsecutivas: 3, friasAcumuladas: 5 },
}

function clamp0a100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function pontosOpcao(opcoes: { key: string; pontos: number }[], key: string | null | undefined): number {
  if (!key) return 0
  return opcoes.find((o) => o.key === key)?.pontos ?? 0
}

// ── Fit / Perfil (0-100) ──────────────────────────────────────────────────
export interface LeadPerfil {
  area: string | null
  origem: string | null
  potencialFinanceiro: string | null
  urgenciaNivel: string | null
  poderDecisao: string | null
  jurisdicao: string | null
  viabilidade: string | null
}

/** Soma os pontos de área jurídica + origem + os critérios genéricos
 *  configurados. Campo de perfil ausente (null) soma 0 pontos — não é
 *  tratado como o pior valor da escala. Clampado 0–100. */
export function fitScore(perfil: LeadPerfil, cfg: ScoringConfig): number {
  let total = 0
  if (perfil.area) {
    if (cfg.areaJuridica.principais.includes(perfil.area)) total += cfg.areaJuridica.pontosPrincipal
    else if (cfg.areaJuridica.secundarias.includes(perfil.area)) total += cfg.areaJuridica.pontosSecundaria
    else total += cfg.areaJuridica.pontosFora
  }
  total += pontosOpcao(cfg.origem, perfil.origem)
  for (const c of cfg.criterios) {
    const chave = c.key as CriterioFitKey
    total += pontosOpcao(c.opcoes, perfil[chave])
  }
  return clamp0a100(total)
}

// ── Engajamento (0-100, acumulado por evento) ─────────────────────────────
export interface AtvSinal {
  sinais: string[]
  resultado: string | null
  ocorreuEm: string // ISO — ordena a acumulação cronológica
}

/** Acumula os pontos de cada sinal registrado (explícitos + o derivado do
 *  `resultado` classificado), em ordem cronológica, clampando 0–100 a cada
 *  passo (um "medidor" — não soma tudo primeiro para só então limitar).
 *  `resultado` texto-livre legado (fora do enum) é ignorado (não
 *  classificado). */
export function engajamentoScore(atividades: AtvSinal[], cfg: ScoringConfig): number {
  const pontosPorSinal = new Map(cfg.sinais.map((s) => [s.key, s.pontos]))
  const ordenadas = [...atividades].sort((a, b) => a.ocorreuEm.localeCompare(b.ocorreuEm))
  let total = 0
  for (const a of ordenadas) {
    for (const sinal of a.sinais) total = clamp0a100(total + (pontosPorSinal.get(sinal) ?? 0))
    if (a.resultado && (SINAIS_RESULTADO as readonly string[]).includes(a.resultado)) {
      total = clamp0a100(total + (pontosPorSinal.get(a.resultado) ?? 0))
    }
  }
  return total
}

// ── Estado combinado (matriz Fit × Engajamento) ───────────────────────────
export type Estado = "A" | "B" | "C" | "D"

export const ESTADO_META: Record<Estado, { label: string; tom: "pos" | "gold" | "blue" | "neg" }> = {
  A: { label: "Quente", tom: "pos" },
  B: { label: "Morno", tom: "gold" },
  C: { label: "Frio", tom: "blue" },
  D: { label: "Desqualificado", tom: "neg" },
}

export function estadoLead(fit: number, eng: number, limiares: ScoringConfig["limiares"]): Estado {
  const qualificado = fit >= limiares.fitQualificado
  const quente = eng >= limiares.engajamentoQuente
  if (qualificado && quente) return "A"
  if (qualificado && !quente) return "B"
  if (!qualificado && quente) return "C"
  return "D"
}

// ── Urgência temporal + prioridade ────────────────────────────────────────
/** 0 sem follow-up definido; 100 quando vencido; rampa linear conforme a
 *  data se aproxima dentro do horizonte configurado. */
export function urgenciaTemporal(proximaAcaoEm: string | null, hojeISO: string, horizonteDias: number): number {
  if (!proximaAcaoEm) return 0
  const hoje = new Date(hojeISO).getTime()
  const alvo = new Date(proximaAcaoEm).getTime()
  if (Number.isNaN(hoje) || Number.isNaN(alvo)) return 0
  const diasRestantes = (alvo - hoje) / 86_400_000
  if (diasRestantes <= 0) return 100
  if (horizonteDias <= 0) return 100
  return clamp0a100(100 - (diasRestantes * 100) / horizonteDias)
}

export function prioridadeLead(fit: number, eng: number, urg: number, pesos: FollowupConfig["prioridade"]): number {
  const soma = pesos.pesoFit + pesos.pesoEng + pesos.pesoUrg || 1
  return clamp0a100((fit * pesos.pesoFit + eng * pesos.pesoEng + urg * pesos.pesoUrg) / soma)
}

// ── Cadência progressiva (sugestão de próximo toque) ──────────────────────
export interface ProximoToque {
  numero: number
  dataISO: string
  canais: string[]
  objetivo: string | null
}

function addDias(iso: string, dias: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + dias)
  return d.toISOString()
}

/** Nº de toques já feitos = maior `toqueNumero` registrado (resiliente a
 *  lacunas — não conta simplesmente o length). */
export function contarToques(atividades: { toqueNumero: number | null }[]): number {
  let max = 0
  for (const a of atividades) if (a.toqueNumero && a.toqueNumero > max) max = a.toqueNumero
  return max
}

/** Sugere o próximo toque da cadência a partir da âncora (dataEntrada). Uma
 *  data calculada no passado é adiantada para hoje (nunca sugere o passado).
 *  Retorna null quando a cadência já se esgotou. */
export function proximoToque(
  cadencia: FollowupConfig["cadencia"],
  toquesFeitos: number,
  ancoraISO: string,
  hojeISO: string,
): ProximoToque | null {
  const passo = cadencia[toquesFeitos]
  if (!passo) return null
  const sugerida = addDias(ancoraISO, passo.dia)
  const dataISO = sugerida < hojeISO ? hojeISO : sugerida
  return { numero: toquesFeitos + 1, dataISO, canais: passo.canais, objetivo: passo.objetivo ?? null }
}

// ── Regras automáticas de perda ────────────────────────────────────────────
export interface RegraPerdaResultado {
  perder: true
  motivo: "sem_resposta" | "desinteresse"
}

/** Avalia as atividades (qualquer ordem) contra as regras configuráveis:
 *  N toques "sem resposta" CONSECUTIVOS (uma "fria"/"positiva" quebra a
 *  sequência) → perdido por sem_resposta; M toques "fria" ACUMULADOS ao
 *  longo de toda a vida do lead → perdido por desinteresse. Avalia
 *  cronologicamente; ignora toques sem `resultado` classificado. */
export function avaliarRegrasPerda(
  atividades: { resultado: string | null; ocorreuEm: string }[],
  regras: FollowupConfig["regrasPerda"],
): RegraPerdaResultado | null {
  const classificadas = [...atividades]
    .filter((a): a is { resultado: ResultadoToque; ocorreuEm: string } =>
      !!a.resultado && (SINAIS_RESULTADO as readonly string[]).includes(a.resultado),
    )
    .sort((a, b) => a.ocorreuEm.localeCompare(b.ocorreuEm))

  let semRespostaSeguidas = 0
  let friasAcumuladas = 0
  for (const a of classificadas) {
    if (a.resultado === "sem_resposta") {
      semRespostaSeguidas++
    } else {
      semRespostaSeguidas = 0
    }
    if (a.resultado === "fria") friasAcumuladas++
    if (semRespostaSeguidas >= regras.semRespostaConsecutivas) return { perder: true, motivo: "sem_resposta" }
    if (friasAcumuladas >= regras.friasAcumuladas) return { perder: true, motivo: "desinteresse" }
  }
  return null
}

// ── util ────────────────────────────────────────────────────────────────
/** Parse seguro do JSON armazenado em `OportunidadeAtividade.sinais`. */
export function parseSinais(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []
  } catch {
    return []
  }
}
