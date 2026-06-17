-- Real-time notifications: additive columns + nullable-unique dedupeKey on
-- Notificacao, Tarefa.criadoPorId (delegation), User.notifPrefs (preferences).
-- Hand-authored so `prisma migrate dev` (db:migrate) applies non-interactively.

-- AlterTable (plain nullable scalar — no rebuild needed)
ALTER TABLE "User" ADD COLUMN "notifPrefs" TEXT;

-- RedefineTables (SQLite: nullability/FK changes require a table rebuild)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Tarefa: add criadoPorId (FK → User) for the "notify the creator on completion" rule
CREATE TABLE "new_Tarefa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT,
    "titulo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "prio" INTEGER NOT NULL DEFAULT 4,
    "projeto" TEXT NOT NULL DEFAULT 'inbox',
    "data" DATETIME,
    "hora" TEXT,
    "prazo" DATETIME,
    "notes" TEXT,
    "reminder" TEXT,
    "recur" TEXT,
    "ai" BOOLEAN NOT NULL DEFAULT false,
    "subtasks" TEXT NOT NULL DEFAULT '[]',
    "dor" TEXT NOT NULL DEFAULT '[]',
    "dod" TEXT NOT NULL DEFAULT '[]',
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "responsavelId" INTEGER,
    "criadoPorId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "clienteId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tarefa" ("ai", "astreaId", "casoId", "clienteId", "createdAt", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "projeto", "processoId", "recur", "reminder", "responsavelId", "status", "subtasks", "titulo", "updatedAt") SELECT "ai", "astreaId", "casoId", "clienteId", "createdAt", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "projeto", "processoId", "recur", "reminder", "responsavelId", "status", "subtasks", "titulo", "updatedAt" FROM "Tarefa";
DROP TABLE "Tarefa";
ALTER TABLE "new_Tarefa" RENAME TO "Tarefa";
CREATE UNIQUE INDEX "Tarefa_astreaId_key" ON "Tarefa"("astreaId");
CREATE INDEX "Tarefa_status_idx" ON "Tarefa"("status");
CREATE INDEX "Tarefa_responsavelId_idx" ON "Tarefa"("responsavelId");
CREATE INDEX "Tarefa_criadoPorId_idx" ON "Tarefa"("criadoPorId");
CREATE INDEX "Tarefa_prazo_idx" ON "Tarefa"("prazo");
CREATE INDEX "Tarefa_data_idx" ON "Tarefa"("data");
CREATE INDEX "Tarefa_processoId_idx" ON "Tarefa"("processoId");

-- Notificacao: make dedupeKey nullable + add modulo/prioridade/link/actorEmail/grupoKey/contador
CREATE TABLE "new_Notificacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userEmail" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "refTipo" TEXT,
    "refId" INTEGER,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "modulo" TEXT,
    "prioridade" TEXT DEFAULT 'normal',
    "link" TEXT,
    "actorEmail" TEXT,
    "grupoKey" TEXT,
    "contador" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Notificacao" ("id", "userEmail", "tipo", "refTipo", "refId", "mensagem", "lida", "dedupeKey", "createdAt") SELECT "id", "userEmail", "tipo", "refTipo", "refId", "mensagem", "lida", "dedupeKey", "createdAt" FROM "Notificacao";
DROP TABLE "Notificacao";
ALTER TABLE "new_Notificacao" RENAME TO "Notificacao";
CREATE UNIQUE INDEX "Notificacao_dedupeKey_key" ON "Notificacao"("dedupeKey");
CREATE INDEX "Notificacao_userEmail_lida_idx" ON "Notificacao"("userEmail", "lida");
CREATE INDEX "Notificacao_createdAt_idx" ON "Notificacao"("createdAt");
CREATE INDEX "Notificacao_userEmail_modulo_idx" ON "Notificacao"("userEmail", "modulo");
CREATE INDEX "Notificacao_userEmail_grupoKey_idx" ON "Notificacao"("userEmail", "grupoKey");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
