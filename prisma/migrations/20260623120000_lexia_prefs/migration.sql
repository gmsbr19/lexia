-- LexIA · preferências por usuário (User.lexiaPrefs).
-- JSON: persona, instrucoes{identidade,interacao,memorias[]}, agentMode, webAccess,
-- autoMode, modelo. null = padrões (ver src/lib/lexia/preferencias.ts).
ALTER TABLE "User" ADD COLUMN "lexiaPrefs" TEXT;
