-- API usage ledger: one row per Anthropic call (chat + background features).
-- Raw token counts only; USD is priced on read from lib/consumo/pricing.
-- Hand-authored so `prisma migrate dev` (db:migrate) applies non-interactively.

CREATE TABLE "LexiaUso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userEmail" TEXT,
    "recurso" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "LexiaUso_criadoEm_idx" ON "LexiaUso"("criadoEm");
CREATE INDEX "LexiaUso_recurso_idx" ON "LexiaUso"("recurso");
CREATE INDEX "LexiaUso_modelo_idx" ON "LexiaUso"("modelo");
