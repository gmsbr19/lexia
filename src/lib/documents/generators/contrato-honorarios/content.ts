import type { ContentBlock, ParagraphBlock, HeadingBlock, TextChunk, SignatureBlock } from '../../types'
import type {
  ContratoHonorariosData,
  Contratante,
  ContratantePF,
  ContratantePJ,
  SocioPJ,
  Honorarios,
  Genero,
  Parcela,
} from '@/lib/types/contrato-honorarios'
import { CLAUSULAS_GERAIS, CLAUSULAS_COMPROMISSO, resolveClausula } from './clausulas'

// ── helpers ───────────────────────────────────────────────────────────────────

function t(text: string): TextChunk { return { text } }
function b(text: string): TextChunk { return { text, bold: true } }
function fl(genero: Genero, m: string, f: string) { return genero === 'masculino' ? m : f }
function v(value: string, fallback: string) { return value || fallback }

function p(
  chunks: TextChunk[],
  opts?: { indent?: boolean; align?: ParagraphBlock['align'] },
): ParagraphBlock {
  return { type: 'paragraph', chunks, indent: opts?.indent, align: opts?.align ?? 'justify' }
}

function chapter(text: string): HeadingBlock { return { type: 'heading', text, level: 'chapter' } }
function clause(text: string): HeadingBlock { return { type: 'heading', text, level: 'clause' } }

// ── qualifications ────────────────────────────────────────────────────────────

function socioChunks(s: SocioPJ): TextChunk[] {
  const portador = fl(s.genero, 'portador', 'portadora')
  const inscrito = fl(s.genero, 'inscrito', 'inscrita')
  return [
    b(v(s.nome, 'nome do sócio')),
    t(`, ${v(s.nacionalidade, 'nacionalidade')}, ${v(s.estadoCivil, 'estado civil')}, ${v(s.profissao, 'profissão')}, ${portador} do RG nº ${v(s.rg, 'RG')} e ${inscrito} no CPF sob nº ${v(s.cpf, 'CPF')}`),
  ]
}

function qualPFChunks(c: ContratantePF): TextChunk[] {
  const portador = fl(c.genero, 'portador', 'portadora')
  const inscrito = fl(c.genero, 'inscrito', 'inscrita')
  const residente = fl(c.genero, 'residente e domiciliado', 'residente e domiciliada')
  return [
    b(v(c.nome, 'nome do contratante')),
    t(`, ${v(c.nacionalidade, 'nacionalidade')}, ${v(c.estadoCivil, 'estado civil')}, ${v(c.profissao, 'profissão')}, ${portador} do RG nº ${v(c.rg, 'RG')} e ${inscrito} no CPF sob nº ${v(c.cpf, 'CPF')}, ${residente} a ${v(c.endereco, 'endereço')}, e-mail: ${v(c.email, 'e-mail')}`),
  ]
}

function qualPJChunks(c: ContratantePJ): TextChunk[] {
  const representada = c.socios.length > 1
    ? 'representada neste ato pelos sócios'
    : 'representada neste ato por seu sócio'

  const socChunks: TextChunk[] = []
  c.socios.forEach((s, i) => {
    if (i > 0) socChunks.push(t(', e '))
    socChunks.push(...socioChunks(s))
  })

  return [
    b(v(c.razaoSocial, 'razão social')),
    t(`, pessoa jurídica de direito privado, inscrita no CNPJ sob nº ${v(c.cnpj, 'CNPJ')}, com sede na ${v(c.endereco, 'endereço')}, e-mail: ${v(c.email, 'e-mail')}, ${representada} `),
    ...socChunks,
  ]
}

function qualChunks(c: Contratante): TextChunk[] {
  return c.tipo === 'pf' ? qualPFChunks(c) : qualPJChunks(c)
}

function denominado(c: Contratante, plural: boolean): string {
  if (plural) return 'doravante conjuntamente denominados CONTRATANTES'
  if (c.tipo === 'pj') return 'denominada CONTRATANTE'
  return fl(c.genero, 'denominado CONTRATANTE', 'denominada CONTRATANTE')
}

// ── honorários clauses ────────────────────────────────────────────────────────

// The firm's own payment details (ships in every contract). Overridable via env
// so the repo doesn't have to change when the account does.
const BANK_INFO =
  process.env.CONTRATO_BANK_INFO ||
  'depositados no banco Itaú, agência nº 4088 e conta nº 15.991-0 ou no pix (11) 91014-4241'

const FIXED_P1 =
  'Quaisquer outras medidas judiciais necessárias, incidentais ou não, diretas ou indiretas, decorrentes do objeto do contrato, deverão ter novos honorários estimados entre as partes.'

const FIXED_P2 =
  'Os honorários de condenação (sucumbência), se houver, pertencerão ao Advogado, sem exclusão dos que ora são contratados, de conformidade com os artigos 23 da Lei nº 8.906/94 e 35, parágrafo 1º, do Código de Ética e Disciplina da Ordem dos Advogados do Brasil.'

function exitoBlock(percentual: string, base: string): ParagraphBlock {
  return p([
    b('Parágrafo Único'),
    t(` – Além dos honorários fixos acima avençados, o CONTRATADO fará jus a honorários de êxito correspondentes a ${v(percentual, '% de êxito')}% sobre ${v(base, 'base de cálculo')}, a serem pagos no momento do levantamento ou recebimento dos valores pela parte CONTRATANTE.`),
  ], { indent: true })
}

function honorariosBlocks(h: Honorarios): ContentBlock[] {
  if (h.tipo === 'avista') {
    return [
      p([t(`O CONTRATADO receberá a título de honorários contratados, o valor de R$ ${v(h.valorTotal, 'valor total')}, a serem ${BANK_INFO}, em parcela única, com vencimento em ${v(h.dataPagamento, 'data de pagamento')}.`)], { indent: true }),
      p([b('Parágrafo Primeiro'), t(` – ${FIXED_P1}`)], { indent: true }),
      p([b('Parágrafo Segundo'), t(` – ${FIXED_P2}`)], { indent: true }),
    ]
  }
  if (h.tipo === 'parcelado') {
    return [
      p([t(`O CONTRATADO receberá a título de honorários contratados, o valor pró-labore de R$ ${v(h.valorTotal, 'valor total')}, a serem ${BANK_INFO}, em ${v(h.qtParcelas, 'nº de parcelas')} parcelas fixas e sucessivas, cada uma no valor de R$ ${v(h.valorParcelas, 'valor por parcela')}, a primeira em ${v(h.dataPrimeiraParcela, 'data da 1ª parcela')}.`)], { indent: true }),
      p([b('Parágrafo Primeiro'), t(` – ${FIXED_P1}`)], { indent: true }),
      p([b('Parágrafo Segundo'), t(` – ${FIXED_P2}`)], { indent: true }),
    ]
  }
  if (h.tipo === 'parcelas_diferentes') {
    return [
      p([t(`O CONTRATADO receberá a título de honorários contratados as seguintes parcelas, a serem ${BANK_INFO}:`)], { indent: true }),
      ...h.parcelas.map((parc: Parcela, i: number) =>
        p([t(`${String(i + 1).padStart(2, '0')}. R$ ${v(parc.valor, 'valor')} – vencimento em ${v(parc.vencimento, 'data')}`)]),
      ),
      p([b('Parágrafo Único'), t(` – ${FIXED_P1}`)], { indent: true }),
    ]
  }
  if (h.tipo === 'exito') {
    return [
      p([t(`O CONTRATADO receberá a título de honorários de êxito, o percentual de ${v(h.percentual, '%')}% sobre ${v(h.baseCalculo, 'base de cálculo')}, a serem pagos no momento do levantamento ou recebimento dos valores pela parte CONTRATANTE.`)], { indent: true }),
      p([b('Parágrafo Único'), t(` – ${FIXED_P2}`)], { indent: true }),
    ]
  }
  if (h.tipo === 'avista_exito') {
    return [
      p([t(`O CONTRATADO receberá a título de honorários contratados, o valor de R$ ${v(h.valorTotal, 'valor total')}, a serem ${BANK_INFO}, em parcela única, com vencimento em ${v(h.dataPagamento, 'data de pagamento')}.`)], { indent: true }),
      exitoBlock(h.percentualExito, h.baseCalculoExito),
      p([b('Parágrafo Segundo'), t(` – ${FIXED_P2}`)], { indent: true }),
    ]
  }
  // parcelado_exito
  return [
    p([t(`O CONTRATADO receberá a título de honorários contratados, o valor pró-labore de R$ ${v(h.valorTotal, 'valor total')}, a serem ${BANK_INFO}, em ${v(h.qtParcelas, 'nº de parcelas')} parcelas fixas e sucessivas, cada uma no valor de R$ ${v(h.valorParcelas, 'valor por parcela')}, a primeira em ${v(h.dataPrimeiraParcela, 'data da 1ª parcela')}.`)], { indent: true }),
    exitoBlock(h.percentualExito, h.baseCalculoExito),
    p([b('Parágrafo Segundo'), t(` – ${FIXED_P2}`)], { indent: true }),
  ]
}

// ── static clauses ────────────────────────────────────────────────────────────
// The prose clauses (chapters IV/V) live in ./clausulas as the single source of
// truth shared with the live preview. Their text is resolved per-document so any
// per-instance override (hand-edited or rewritten by LexIA) is honoured here.

// ── main builder ──────────────────────────────────────────────────────────────

export function buildContratoHonorarios(data: ContratoHonorariosData): ContentBlock[] {
  const plural = data.contratantes.length > 1
  const blocks: ContentBlock[] = []

  // Title
  blocks.push(p([b('CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS')], { align: 'center' }))

  // Chapter I — Das Partes
  blocks.push(chapter('Capítulo I — Das Partes'))

  const partesChunks: TextChunk[] = [t('Por este instrumento particular de contrato que entre si celebram: de um lado, ')]
  data.contratantes.forEach((c, i) => {
    if (i > 0) partesChunks.push(t('; '))
    partesChunks.push(...qualChunks(c))
    if (!plural) partesChunks.push(t(`, ${denominado(c, false)}`))
  })
  if (plural) partesChunks.push(t(`, ${denominado(data.contratantes[0], true)}`))
  partesChunks.push(
    t('; e de outro lado, '),
    b('LEONARDO DA COSTA ALMEIDA COLLARES MIGUEL'),
    t(', brasileiro, casado, advogado regularmente inscrito nos quadros da Ordem dos Advogados do Brasil – Seccional São Paulo, sob o nº 523.685, com escritório profissional situado na Avenida Marquês de São Vicente, 1619, Sala 505, Barra Funda, São Paulo – SP, CEP 01139-003, denominado '),
    b('CONTRATADO'),
    t('.'),
  )
  blocks.push(p(partesChunks, { indent: true }))

  blocks.push(p([
    t('Que doravante serão referidos no singular apenas como '),
    b('CONTRATANTE'),
    t(' e '),
    b('CONTRATADO'),
    t('; ajustam entre si, com fulcro no artigo 22 da Lei nº 8.906/94, mediante as seguintes cláusulas e condições:'),
  ], { indent: true }))

  // Chapter II — Do Objeto
  blocks.push(chapter('Capítulo II — Do Objeto'))
  blocks.push(clause('CLÁUSULA PRIMEIRA'))
  blocks.push(p([
    t('O CONTRATADO obriga-se, face ao mandato que lhe é outorgado, que faz parte integrante deste contrato, a prestar os serviços advocatícios concernentes a '),
    t(v(data.objeto, 'objeto dos serviços')),
    t('.'),
  ], { indent: true }))

  // Chapter III — Dos Honorários
  blocks.push(chapter('Capítulo III — Dos Honorários'))
  blocks.push(clause('CLÁUSULA SEGUNDA'))
  blocks.push(...honorariosBlocks(data.honorarios))

  // Chapter IV — Disposições Gerais
  blocks.push(chapter('Capítulo IV — Das Disposições Gerais'))
  for (const def of CLAUSULAS_GERAIS) {
    blocks.push(clause(def.titulo))
    blocks.push(p([t(resolveClausula(data, def))], { indent: true }))
  }

  // Chapter V — Compromisso e Despesas
  blocks.push(chapter('Capítulo V — Do Compromisso e Das Despesas'))
  for (const def of CLAUSULAS_COMPROMISSO) {
    blocks.push(clause(def.titulo))
    blocks.push(p([t(resolveClausula(data, def))], { indent: true }))
  }

  // Chapter VI — Foro
  blocks.push(chapter('Capítulo VI — Do Foro de Eleição'))
  blocks.push(clause('CLÁUSULA DÉCIMA SÉTIMA'))
  blocks.push(p([
    t(`Fica eleito o foro da Comarca de ${v(data.foro, 'cidade')} para dirimir as dúvidas oriundas deste contrato, renunciando as partes a qualquer outro por mais privilegiado que seja.`),
  ], { indent: true }))

  blocks.push(p([
    t('E, por estarem, assim, justos e contratados, firmam o presente instrumento, para um só efeito.'),
  ], { indent: true }))

  // Signature block
  const signerRows = data.contratantes.map((c, i) => ({
    label: plural ? `Contratante ${i + 1}` : 'Contratante',
    name: c.tipo === 'pf' ? c.nome : c.razaoSocial,
  }))

  const sigBlock: SignatureBlock = {
    type: 'signatures',
    dateCity: `${v(data.foro, 'cidade')}, ${v(data.data, 'data')}.`,
    rows: [
      ...signerRows,
      { label: 'Contratado', name: 'LEONARDO DA COSTA ALMEIDA COLLARES MIGUEL' },
      { label: 'Testemunha 1' },
      { label: 'Testemunha 2' },
    ],
  }
  blocks.push(sigBlock)

  return blocks
}
