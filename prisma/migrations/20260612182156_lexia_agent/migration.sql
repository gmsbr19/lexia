-- AlterTable
ALTER TABLE "LexiaMensagem" ADD COLUMN "blocks" TEXT;
ALTER TABLE "LexiaMensagem" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "LexiaMensagem" ADD COLUMN "model" TEXT;
ALTER TABLE "LexiaMensagem" ADD COLUMN "outputTokens" INTEGER;

-- CreateTable
CREATE TABLE "LexiaAcaoPendente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversaId" INTEGER NOT NULL,
    "userEmail" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "toolUseId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "contexto" TEXT NOT NULL,
    "resultJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "LexiaAcaoPendente_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "LexiaConversa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LexiaAcaoPendente_conversaId_status_idx" ON "LexiaAcaoPendente"("conversaId", "status");
