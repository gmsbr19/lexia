// Nomes das ações de conversão no Google Ads — CONSTANTES, sem acento, NUNCA
// renomear (o casamento com o Google é POR NOME, não por id — o feed CSV não
// carrega nenhum identificador do Google, só esses textos exatos). Se o nome
// mudar aqui, o Google Ads passa a ver uma ação NOVA e o histórico de
// otimização daquela ação se perde. SERVER+CLIENT safe (sem I/O).
import type { EventoCanonico } from "./eventos-core"

export const ACAO_NOME: Record<EventoCanonico, string> = {
  formulario_enviado: "NCM Formulario Enviado",
  lead_qualificado: "NCM Lead Qualificado",
  reuniao_realizada: "NCM Reuniao Realizada",
  contrato_assinado: "NCM Contrato Assinado",
}

export const EVENTOS_CANONICOS: EventoCanonico[] = [
  "formulario_enviado",
  "lead_qualificado",
  "reuniao_realizada",
  "contrato_assinado",
]

export function nomeDaAcao(tipo: string): string {
  return ACAO_NOME[tipo as EventoCanonico] ?? tipo
}
