// Startup environment validation — fail fast with a readable list of missing
// vars instead of crashing mid-request. Imported at the top of every server
// entry seam (`src/lib/db/client.ts`, `src/lib/auth/index.ts`) so any server
// boot path validates before serving. See `.env.example` for documentation.
// SERVER ONLY.
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória (ex.: file:./dev.db)"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET deve ter pelo menos 32 caracteres (gere com: openssl rand -base64 32)"),
  // Optional — only needed for the respective import CLIs / PDF generation.
  ASTREA_BACKUP_DIR: z.string().optional(),
  GENIONS_CSV: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  CONTRATO_BANK_INFO: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(), // enables the LexIA chat (Claude API)
  ANTHROPIC_ADMIN_KEY: z.string().optional(), // Admin key (sk-ant-admin…) for the Consumo (cost) tab
  // Shared secret guarding the cron-triggered jobs (e.g. POST /api/jobs/notificacoes).
  // The app is request-driven (no worker); an external cron calls the endpoint with
  // header `X-Job-Token: <JOBS_TOKEN>`. When unset, the job endpoint is disabled.
  JOBS_TOKEN: z.string().optional(),
  // Default safety margin (dias úteis antes da data fatal) for new prazos.
  PRAZO_MARGEM_DIAS: z.coerce.number().int().min(0).max(30).optional().default(2),
  // How many days ahead the notifications job looks for upcoming prazos/compromissos.
  NOTIF_ANTECEDENCIA_DIAS: z.coerce.number().int().min(1).max(60).optional().default(7),
  // Chave PÚBLICA da API do DataJud (CNJ) — divulgada na wiki oficial, pode rotacionar.
  // Sem ela, a captura de ANDAMENTOS (DataJud) fica desabilitada (a de intimações via
  // Comunica/DJEN não precisa de chave). Ver .env.example para o valor público atual.
  DATAJUD_API_KEY: z.string().optional(),
  // Janela (dias) varrida a cada rodada de captura de intimações no Comunica/DJEN.
  CAPTURA_JANELA_DIAS: z.coerce.number().int().min(1).max(60).optional().default(7),
  // ── Notificações por e-mail (canal opcional) ───────────────────────────────
  // Sem SMTP configurado o app funciona 100% (só registra em log em vez de enviar).
  // Base absoluta para os deep-links dos e-mails (ex.: https://lexia.escritorio.com).
  // Reusa AUTH_URL quando presente; sem nenhum dos dois, o e-mail fica desabilitado.
  APP_BASE_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  SMTP_FROM: z.string().optional(), // ex.: "Lexia <no-reply@escritorio.com>"
  // ── E-mail via Microsoft Graph (alternativa ao SMTP) ───────────────────────
  // App registration (Entra ID) com permissão de APLICAÇÃO Mail.Send + consent
  // de admin. Envia como a caixa GRAPH_MAIL_SENDER (UPN/objectId). Pode apontar
  // para o mesmo app do ONEDRIVE_*. Sem essas vars, cai no SMTP/noop.
  GRAPH_TENANT_ID: z.string().optional(),
  GRAPH_CLIENT_ID: z.string().optional(),
  GRAPH_CLIENT_SECRET: z.string().optional(),
  GRAPH_MAIL_SENDER: z.string().optional(),
  // Backend de e-mail: "auto" (graph se configurado, senão smtp), "graph", "smtp".
  MAIL_PROVIDER: z.enum(["auto", "graph", "smtp"]).optional().default("auto"),
  // Backend de armazenamento dos anexos da LexIA (default "db" = base64 no banco).
  ANEXO_STORAGE: z.enum(["db", "onedrive"]).optional().default("db"),
  // OneDrive do escritório — esqueleto (só usado quando ANEXO_STORAGE=onedrive).
  ONEDRIVE_TENANT_ID: z.string().optional(),
  ONEDRIVE_CLIENT_ID: z.string().optional(),
  ONEDRIVE_CLIENT_SECRET: z.string().optional(),
  ONEDRIVE_DRIVE_ID: z.string().optional(),
  ONEDRIVE_FOLDER: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
  throw new Error(`Variáveis de ambiente inválidas ou ausentes:\n${issues}`)
}

export const env = parsed.data
