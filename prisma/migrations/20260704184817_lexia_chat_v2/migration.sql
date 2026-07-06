-- AlterTable
ALTER TABLE "LexiaMensagem" ADD COLUMN "feedback" TEXT;
ALTER TABLE "LexiaMensagem" ADD COLUMN "meta" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LexiaAcaoPendente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversaId" INTEGER NOT NULL,
    "userEmail" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'mutation',
    "toolName" TEXT NOT NULL,
    "toolUseId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "contexto" TEXT NOT NULL,
    "resultJson" TEXT,
    "respostaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "LexiaAcaoPendente_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "LexiaConversa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LexiaAcaoPendente" ("contexto", "conversaId", "createdAt", "id", "payload", "resolvedAt", "resultJson", "resumo", "status", "toolName", "toolUseId", "userEmail") SELECT "contexto", "conversaId", "createdAt", "id", "payload", "resolvedAt", "resultJson", "resumo", "status", "toolName", "toolUseId", "userEmail" FROM "LexiaAcaoPendente";
DROP TABLE "LexiaAcaoPendente";
ALTER TABLE "new_LexiaAcaoPendente" RENAME TO "LexiaAcaoPendente";
CREATE INDEX "LexiaAcaoPendente_conversaId_status_idx" ON "LexiaAcaoPendente"("conversaId", "status");
CREATE TABLE "new_LexiaConversa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT,
    "fixada" BOOLEAN NOT NULL DEFAULT false,
    "contexto" TEXT,
    "userEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LexiaConversa" ("createdAt", "id", "titulo", "updatedAt", "userEmail") SELECT "createdAt", "id", "titulo", "updatedAt", "userEmail" FROM "LexiaConversa";
DROP TABLE "LexiaConversa";
ALTER TABLE "new_LexiaConversa" RENAME TO "LexiaConversa";
CREATE INDEX "LexiaConversa_userEmail_updatedAt_idx" ON "LexiaConversa"("userEmail", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
