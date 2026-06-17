export type Genero = 'masculino' | 'feminino'

export interface ContratantePF {
  tipo: 'pf'
  nome: string
  genero: Genero
  nacionalidade: string
  estadoCivil: string
  profissao: string
  rg: string
  cpf: string
  endereco: string
  email: string
}

export interface SocioPJ {
  nome: string
  genero: Genero
  nacionalidade: string
  estadoCivil: string
  profissao: string
  rg: string
  cpf: string
}

export interface ContratantePJ {
  tipo: 'pj'
  razaoSocial: string
  cnpj: string
  endereco: string
  email: string
  socios: SocioPJ[]
}

export type Contratante = ContratantePF | ContratantePJ

export type TipoHonorarios =
  | 'avista'
  | 'parcelado'
  | 'parcelas_diferentes'
  | 'exito'
  | 'avista_exito'
  | 'parcelado_exito'

export interface HonorariosAvista {
  tipo: 'avista'
  valorTotal: string
  dataPagamento: string
}

export interface HonorariosParcelado {
  tipo: 'parcelado'
  valorTotal: string
  qtParcelas: string
  valorParcelas: string
  dataPrimeiraParcela: string
}

export interface Parcela {
  valor: string
  vencimento: string
}

export interface HonorariosParcelasDiferentes {
  tipo: 'parcelas_diferentes'
  parcelas: Parcela[]
}

export interface HonorariosExito {
  tipo: 'exito'
  percentual: string
  baseCalculo: string
}

export interface HonorariosAvistaExito {
  tipo: 'avista_exito'
  valorTotal: string
  dataPagamento: string
  percentualExito: string
  baseCalculoExito: string
}

export interface HonorariosParceladoExito {
  tipo: 'parcelado_exito'
  valorTotal: string
  qtParcelas: string
  valorParcelas: string
  dataPrimeiraParcela: string
  percentualExito: string
  baseCalculoExito: string
}

export type Honorarios =
  | HonorariosAvista
  | HonorariosParcelado
  | HonorariosParcelasDiferentes
  | HonorariosExito
  | HonorariosAvistaExito
  | HonorariosParceladoExito

export interface ContratoHonorariosData {
  contratantes: Contratante[]
  objeto: string
  honorarios: Honorarios
  foro: string
  data: string
  /**
   * Per-document overrides for the standard prose clauses, keyed by clause id
   * (see lib/documents/generators/contrato-honorarios/clausulas.ts). Absent /
   * empty entries fall back to the canonical clause text. Edited by hand in the
   * form or rewritten by LexIA.
   */
  clausulas?: Record<string, string>
}

export function newContratantePF(): ContratantePF {
  return { tipo: 'pf', nome: '', genero: 'masculino', nacionalidade: '', estadoCivil: '', profissao: '', rg: '', cpf: '', endereco: '', email: '' }
}

export function newSocioPJ(): SocioPJ {
  return { nome: '', genero: 'masculino', nacionalidade: '', estadoCivil: '', profissao: '', rg: '', cpf: '' }
}

export function newContratantePJ(): ContratantePJ {
  return { tipo: 'pj', razaoSocial: '', cnpj: '', endereco: '', email: '', socios: [newSocioPJ()] }
}

export function newHonorarios(tipo: TipoHonorarios): Honorarios {
  switch (tipo) {
    case 'avista': return { tipo: 'avista', valorTotal: '', dataPagamento: '' }
    case 'parcelado': return { tipo: 'parcelado', valorTotal: '', qtParcelas: '', valorParcelas: '', dataPrimeiraParcela: '' }
    case 'parcelas_diferentes': return { tipo: 'parcelas_diferentes', parcelas: [{ valor: '', vencimento: '' }] }
    case 'exito': return { tipo: 'exito', percentual: '', baseCalculo: '' }
    case 'avista_exito': return { tipo: 'avista_exito', valorTotal: '', dataPagamento: '', percentualExito: '', baseCalculoExito: '' }
    case 'parcelado_exito': return { tipo: 'parcelado_exito', valorTotal: '', qtParcelas: '', valorParcelas: '', dataPrimeiraParcela: '', percentualExito: '', baseCalculoExito: '' }
  }
}

export function newContratoData(): ContratoHonorariosData {
  return {
    contratantes: [newContratantePF()],
    objeto: '',
    honorarios: newHonorarios('parcelado'),
    foro: 'São Paulo',
    data: '',
  }
}
