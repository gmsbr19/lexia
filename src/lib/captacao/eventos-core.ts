// Núcleo puro da emissão/retratação de eventos de conversão — mapeia
// transições do CRM (etapa do funil, atividade de reunião) para os 4 eventos
// canônicos, decide quais eventos uma REGRESSÃO de etapa invalida, e calcula
// o valor a enviar. Sem Prisma/React — testável isoladamente (ver
// tests/captacao-eventos-core.test.ts, tests/captacao-valores.test.ts).
// Chamado por ./eventos.ts (Prisma).

export type EventoCanonico = "formulario_enviado" | "lead_qualificado" | "reuniao_realizada" | "contrato_assinado"

export interface MapaFunil {
  etapasQualificado: string[] // chaves de etapa do pipeline configurável
  etapasGanho: string[] // hoje só ['ganho'] (terminal fixo) — aberto p/ o futuro
  reuniao: { tipos: string[]; resultados: string[] }
}

/**
 * Que evento canônico uma transição de etapa representa — ou nenhum. Trata
 * uma chave de etapa DESCONHECIDA (removida do pipeline pelo admin depois de
 * mapeada) como "nenhum evento", nunca adivinha (mesma lição do bug de
 * `getFunil` da Fase 1 do Comercial: `Map.get(etapa) ?? 0` fazia lead sumir
 * silenciosamente — aqui o equivalente seria emitir o evento errado).
 */
export function eventoParaEtapa(etapa: string, mapa: MapaFunil): EventoCanonico | null {
  if (mapa.etapasGanho.includes(etapa)) return "contrato_assinado"
  if (mapa.etapasQualificado.includes(etapa)) return "lead_qualificado"
  return null
}

/** Uma OportunidadeAtividade conta como "reunião realizada" pela configuração
 *  do admin (tipo + resultado, ambos configuráveis). */
export function ehReuniaoRealizada(tipo: string, resultado: string | null, mapa: Pick<MapaFunil, "reuniao">): boolean {
  return mapa.reuniao.tipos.includes(tipo) && resultado != null && mapa.reuniao.resultados.includes(resultado)
}

function impliesGanho(etapa: string, mapa: MapaFunil): boolean {
  return mapa.etapasGanho.includes(etapa)
}
function impliesQualificado(etapa: string, mapa: MapaFunil): boolean {
  return impliesGanho(etapa, mapa) || mapa.etapasQualificado.includes(etapa)
}

/**
 * Uma mudança de etapa (`cur` → `next`) só dispara RETRACT quando ela deixa
 * de satisfazer algo que satisfazia antes — nunca ao contrário (avançar
 * nunca retrata). Compara os dois "limiares" que os 4 eventos canônicos
 * representam:
 *   - contrato_assinado ↔ etapa implica "ganho"
 *   - lead_qualificado  ↔ etapa implica "qualificado" (inclui "ganho")
 * `formulario_enviado` e `reuniao_realizada` são fatos históricos (o
 * formulário foi enviado / a reunião aconteceu) — independem da etapa atual
 * e NUNCA são retratados por uma mudança de etapa.
 *
 * Exemplos: ganho→qualificado retrata só contrato_assinado (o lead CONTINUA
 * qualificado); ganho→novo retrata os dois; proposta→qualificado (ambas
 * qualificadas) não retrata nada — não é uma regressão de verdade.
 */
export function avaliarRetratacaoPorEtapa(curEtapa: string, nextEtapa: string, mapa: MapaFunil): EventoCanonico[] {
  const retratar: EventoCanonico[] = []
  if (impliesGanho(curEtapa, mapa) && !impliesGanho(nextEtapa, mapa)) retratar.push("contrato_assinado")
  if (impliesQualificado(curEtapa, mapa) && !impliesQualificado(nextEtapa, mapa)) retratar.push("lead_qualificado")
  return retratar
}

export type ModoValor = "fixo" | "fit" | "real"

export interface RegraValorEvento {
  modo: ModoValor
  fixoCents?: number | null
  porArea?: Record<string, number>
  fitFaixas?: { min: number; cents: number }[]
}

export interface ValorResultado {
  cents: number
  motivo: string
}

/**
 * Valor a enviar para um evento — três modos configuráveis por evento: fixo
 * (com override por área), por faixa de Fit score, ou o valor REAL do
 * contrato (só faz sentido p/ `contrato_assinado`; sem contrato vinculado,
 * cai p/ 0 com o motivo explicando por quê — nunca inventa um número). Sem
 * regra configurada → 0, evento ainda é emitido (o valor pode ser ajustado
 * depois via RESTATE sem perder o evento original).
 */
export function valorDoEvento(
  lead: { area: string | null; fit?: number | null; valorRealCents?: number | null },
  regra: RegraValorEvento | undefined,
): ValorResultado {
  if (!regra) return { cents: 0, motivo: "sem regra de valor configurada para este evento" }
  if (regra.modo === "real") {
    if (lead.valorRealCents && lead.valorRealCents > 0) {
      return { cents: lead.valorRealCents, motivo: "valor real do contrato/lançamento vinculado" }
    }
    return { cents: 0, motivo: "modo real, mas o lead não tem contrato/lançamento vinculado ainda" }
  }
  if (regra.modo === "fit") {
    const fit = lead.fit ?? 0
    const faixas = [...(regra.fitFaixas ?? [])].sort((a, b) => b.min - a.min)
    const faixa = faixas.find((f) => fit >= f.min)
    if (faixa) return { cents: faixa.cents, motivo: `faixa de fit ≥ ${faixa.min} (fit atual: ${fit})` }
    return { cents: 0, motivo: `fit atual (${fit}) abaixo de todas as faixas configuradas` }
  }
  // modo "fixo" (padrão): valor por área tem precedência sobre o fixo genérico
  if (lead.area && regra.porArea?.[lead.area] != null) {
    return { cents: regra.porArea[lead.area], motivo: `valor fixo por área (${lead.area})` }
  }
  return { cents: regra.fixoCents ?? 0, motivo: "valor fixo padrão" }
}
