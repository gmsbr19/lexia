// Zod schemas dos endpoints de notificações (preferências + simulação admin).
// Falhas viram UserError → 400 PT-BR via runMutation.
import { z } from "zod"

const moduloEnum = z.enum(["tarefas", "agenda", "processos", "comercial", "documentos", "ia", "sistema"])
const prioridadeEnum = z.enum(["baixa", "normal", "alta", "critica"])

/** Preferências por usuário (User.notifPrefs). Canais por módulo + e-mail. */
export const notifPrefsSchema = z
  .object({
    // partialRecord: o cliente envia só os módulos que mexeu (z.record com chave
    // enum é EXAUSTIVO no Zod v4 e rejeitaria um patch parcial).
    app: z.partialRecord(moduloEnum, z.boolean()).optional(),
    email: z.partialRecord(moduloEnum, z.boolean()).optional(),
    navegador: z.boolean().optional(),
    emailMinPrioridade: z.enum(["normal", "alta", "critica"]).optional(),
    relatorioDiario: z.boolean().optional(),
    relatorioHora: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (use HH:MM)")
      .optional(),
    tarefasConclusaoEquipe: z.boolean().optional(),
  })
  .strict()

/** Ferramenta de debug admin: dispara uma notificação simulada pelo caminho real. */
export const simularNotificacaoSchema = z.object({
  destinatario: z.string().min(1).max(200), // e-mail do usuário ou "me"
  modulo: moduloEnum.optional(),
  prioridade: prioridadeEnum.optional(),
  mensagem: z.string().min(1).max(500),
  link: z.string().max(300).optional(),
  enviarEmail: z.boolean().optional(),
})
