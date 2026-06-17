// Single source of truth for the contract's prose clauses (the "static" clauses
// in chapters IV and V). Shared by the generator (content.ts → DOCX/PDF/HTML) and
// the live A4 preview (ContratoHonorariosPreview.tsx) so the text never drifts.
//
// Each clause has a stable `id` so a document can override its text per-instance
// (data.clausulas[id]) — edited by hand in the form OR rewritten by LexIA. When no
// override exists the canonical `texto` is used.
//
// Pure module (no server-only imports) so the client preview can import it too.
import type { ContratoHonorariosData } from "@/lib/types/contrato-honorarios"

export interface ClausulaDef {
  id: string
  titulo: string
  grupo: "gerais" | "compromisso"
  /** Short hint shown to LexIA so it knows what the clause governs. */
  assunto: string
  texto: string
}

// Chapter IV — Das Disposições Gerais
export const CLAUSULAS_GERAIS: ClausulaDef[] = [
  {
    id: "terceira",
    titulo: "CLÁUSULA TERCEIRA",
    grupo: "gerais",
    assunto: "título executivo extrajudicial e juros de mora por atraso",
    texto:
      "Este contrato enquadra-se no rol dos títulos executivos extrajudiciais, nos termos do artigo 784, Inciso XII, do Código de Processo Civil, combinado com o artigo 24 da Lei 8.906/94 (EOAB). Fica estabelecido que em caso de atraso serão cobrados juros de mora na razão de 1% (um por cento) ao mês.",
  },
  {
    id: "quarta",
    titulo: "CLÁUSULA QUARTA",
    grupo: "gerais",
    assunto: "honorários devidos na proporção dos serviços em caso de desistência/revogação",
    texto:
      "Fica estabelecido que, iniciados os serviços especificados na cláusula 01, são devidos os honorários contratados na proporção dos serviços prestados, ainda que em caso de desistência por parte do CONTRATANTE, ou se for revogado o mandato do CONTRATADO sem sua culpa, ou, ainda, por acordo do CONTRATANTE com a parte contrária, sem a devida aquiescência do CONTRATADO, podendo este exigir os honorários de imediato.",
  },
  {
    id: "quinta",
    titulo: "CLÁUSULA QUINTA",
    grupo: "gerais",
    assunto: "abrangência das instâncias cobertas pelos honorários e despesas processuais por conta do contratante",
    texto:
      "Fica estabelecido que os honorários contratados abarcam os serviços prestados até a última instância superior, correndo todas as despesas processuais, custas e outros emolumentos por conta do CONTRATANTE.",
  },
  {
    id: "sexta",
    titulo: "CLÁUSULA SEXTA",
    grupo: "gerais",
    assunto: "atividade de meio (não de resultado) e titularidade da sucumbência",
    texto:
      "Sendo o exercício profissional do CONTRATADO uma atividade de meio e não de resultado, fica estabelecido que os honorários avençados na Cláusula 02 serão sempre devidos, independentemente do resultado da ação. Os honorários devidos à sucumbência, se houver, pertencerão única e exclusivamente ao CONTRATADO, nos termos do art. 23 do EOAB, Lei 8.906/94, que poderá de imediato recebê-los em Juízo ou fora dele, ao final da ação, ou promover a competente execução em seu próprio nome, ou em nome do CONTRATANTE, nada tendo este a reclamar ou receber.",
  },
  {
    id: "setima",
    titulo: "CLÁUSULA SÉTIMA",
    grupo: "gerais",
    assunto: "desconto/compensação dos honorários sobre valores levantados",
    texto:
      "No caso de levantamento ou recebimento de valores pelo CONTRATADO, através de alvará, mandado de pagamento ou qualquer outro meio, poderá o CONTRATADO descontar e/ou compensar os honorários contratados que lhe são devidos, inclusive os da sucumbência, e outros valores devidos.",
  },
]

// Chapter V — Do Compromisso e Das Despesas
export const CLAUSULAS_COMPROMISSO: ClausulaDef[] = [
  {
    id: "oitava",
    titulo: "CLÁUSULA OITAVA — DO COMPROMISSO",
    grupo: "compromisso",
    assunto: "dever do contratante de prestar informações fiéis",
    texto:
      "O CONTRATANTE se compromete a prestar todas, e fiéis, informações relacionadas ao fato constitutivo do seu direito, bem como subsidiar com instrumentos a evidenciá-lo, na medida do possível, e atender/responder ao CONTRATADO quando solicitado, através dos meios estipulados na Cláusula 09. Caso o CONTRATANTE oculte informação necessária da qual tenha ou deveria ter conhecimento, que possa de alguma forma prejudicar o andamento regular, bem como o êxito da demanda, o CONTRATADO não poderá ser responsabilizado, devendo, ainda, o CONTRATANTE pagar ao CONTRATADO todo prejuízo que, eventualmente, possa acarretar.",
  },
  {
    id: "nona",
    titulo: "CLÁUSULA NONA — DA COMUNICAÇÃO",
    grupo: "compromisso",
    assunto: "manutenção dos meios de contato atualizados",
    texto:
      "O CONTRATANTE se compromete a manter atualizados os meios de contato ora avençados para a boa comunicação das partes. Em caso de alteração de algum dos contatos, deverá ser informado imediata e inequivocamente ao CONTRATADO.",
  },
  {
    id: "decima",
    titulo: "CLÁUSULA DÉCIMA",
    grupo: "compromisso",
    assunto: "responsabilidade do contratante por atos que dependam dele",
    texto:
      "Se porventura o CONTRATADO depender do CONTRATANTE para promover algum ato extrajudicial ou judicial, e este não o corresponder tempestivamente, a responsabilidade recairá exclusivamente sobre o CONTRATANTE, não podendo arguí-la em seu favor posteriormente.",
  },
  {
    id: "decima_primeira",
    titulo: "CLÁUSULA DÉCIMA PRIMEIRA — DAS DESPESAS",
    grupo: "compromisso",
    assunto: "despesas processuais e administrativas por conta do contratante",
    texto:
      "Todas as despesas efetuadas pelo CONTRATADO, desde que devidamente comprovadas, ligadas direta ou indiretamente com o objeto deste contrato, incluindo-se fotocópias, digitalizações, emolumentos, serviços dos correios, custas judiciais, custas de cartórios extrajudiciais, entre outras, ficarão a cargo do CONTRATANTE, sem qualquer prejuízo dos honorários contratados.",
  },
  {
    id: "decima_segunda",
    titulo: "CLÁUSULA DÉCIMA SEGUNDA",
    grupo: "compromisso",
    assunto: "despesas de transporte local (ônibus, metrô, Uber/táxi)",
    texto:
      "Todas as despesas inerentes a transporte coletivo (ônibus, metrô etc.) municipal e intermunicipal necessárias para o cumprimento do contrato serão custeadas pelo CONTRATANTE, independentemente de prévio ajuste, através de reembolso e com a discriminação da diligência efetuada, sem qualquer prejuízo dos honorários contratados. Em caso de urgência, o CONTRATADO poderá utilizar-se de Uber/táxi para locomoção ao fórum para realização de diligências de audiência e/ou oitiva de testemunha, ou qualquer outro local para promoção de ato judicial, cabendo ao CONTRATANTE o devido reembolso.",
  },
  {
    id: "decima_terceira",
    titulo: "CLÁUSULA DÉCIMA TERCEIRA",
    grupo: "compromisso",
    assunto: "despesas de viagem interestadual/internacional",
    texto:
      "Todas as despesas necessárias para o caso de locomoção interestadual ou internacional, gastos de viagem como transporte terrestre e/ou aéreo, hospedagem em hotel e alimentação ficarão a cargo do CONTRATANTE, sem qualquer prejuízo dos honorários contratados. No caso das despesas de transporte interestadual ou internacional e hotelaria, as partes deverão ajustar previamente, até 05 (cinco) dias antes da diligência a ser cumprida. No que concerne a alimentação noutra Comarca, Estado ou País, dar-se-á através de reembolso do que fora devidamente comprovado.",
  },
  {
    id: "decima_quarta",
    titulo: "CLÁUSULA DÉCIMA QUARTA",
    grupo: "compromisso",
    assunto: "compensação dos reembolsos quando do recebimento de valores",
    texto:
      "Em caso de reembolso a ser efetuado pelo CONTRATANTE em favor do CONTRATADO, este poderá compensá-lo quando do recebimento ou levantamento de valores, conforme cláusula 07.",
  },
  {
    id: "decima_quinta",
    titulo: "CLÁUSULA DÉCIMA QUINTA — DA CONTRATAÇÃO DE TERCEIROS",
    grupo: "compromisso",
    assunto: "contratação de profissionais de outras áreas",
    texto:
      "Se no decurso do processo houver a necessidade da contratação de profissional(is) de outra(s) área(s), o CONTRATADO poderá indicar escritório ou profissional de sua confiança, cabendo ao CONTRATANTE aceitá-lo ou não, sendo certo que qualquer despesa, incluindo honorários do terceiro contratado, ficará a expensas do CONTRATANTE.",
  },
  {
    id: "decima_sexta",
    titulo: "CLÁUSULA DÉCIMA SEXTA — DA RESCISÃO",
    grupo: "compromisso",
    assunto: "rescisão por descumprimento e citação postal",
    texto:
      "A parte que descumprir qualquer das cláusulas deste contrato dará à outra o direito de rescindir o presente instrumento, sem qualquer interpelação, judicial ou extrajudicial, ficando desobrigada a parte inocente a dar continuidade a este contrato. Ademais, acordam as partes que, em caso de necessidade de ajuizamento de ações relativas a esse instrumento, a citação se dará por via postal, com aviso de recebimento (AR), cabendo ao vencedor honorário na razão de 20% (vinte por cento) sobre o do proveito econômico obtido, a título de verba sucumbencial.",
  },
]

/** Every clause that can be overridden / rewritten, in document order. */
export const CLAUSULAS_EDITAVEIS: ClausulaDef[] = [...CLAUSULAS_GERAIS, ...CLAUSULAS_COMPROMISSO]

/** Lookup by id. */
export const CLAUSULA_BY_ID: Record<string, ClausulaDef> = Object.fromEntries(
  CLAUSULAS_EDITAVEIS.map((c) => [c.id, c]),
)

/** Valid clause ids (used to validate AI suggestions before applying). */
export const CLAUSULA_IDS: ReadonlySet<string> = new Set(CLAUSULAS_EDITAVEIS.map((c) => c.id))

type WithClausulas = Pick<ContratoHonorariosData, "clausulas">

/** Effective text of a clause: the per-document override (if non-empty) or the canonical default. */
export function resolveClausula(data: WithClausulas, def: ClausulaDef): string {
  const override = data.clausulas?.[def.id]
  return override != null && override.trim() !== "" ? override : def.texto
}

/** True when this document overrides the clause's default text. */
export function isClausulaOverridden(data: WithClausulas, id: string): boolean {
  const override = data.clausulas?.[id]
  const def = CLAUSULA_BY_ID[id]
  if (override == null || !def) return false
  return override.trim() !== "" && override !== def.texto
}

/** Immutably set a clause override on the contract data. */
export function setClausulaOverride<T extends WithClausulas>(data: T, id: string, value: string): T {
  return { ...data, clausulas: { ...(data.clausulas ?? {}), [id]: value } }
}

/** Immutably remove a clause override (revert to the canonical text). */
export function clearClausulaOverride<T extends WithClausulas>(data: T, id: string): T {
  if (!data.clausulas || !(id in data.clausulas)) return data
  const next = { ...data.clausulas }
  delete next[id]
  return { ...data, clausulas: Object.keys(next).length ? next : undefined }
}
