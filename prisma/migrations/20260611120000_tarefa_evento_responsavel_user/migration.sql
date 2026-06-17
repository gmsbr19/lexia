-- Repoint Tarefa.responsavelId and Evento.responsavelId from Conta (sócio) to
-- User (registered users). Existing assignments referenced Conta ids that do
-- not map to Users, so they are cleared (responsavelId omitted from the copy →
-- defaults to NULL).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

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
    "casoId" INTEGER,
    "clienteId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tarefa" ("id", "astreaId", "titulo", "status", "done", "prio", "projeto", "data", "hora", "prazo", "notes", "reminder", "recur", "ai", "subtasks", "dor", "dod", "origem", "geradoPorApp", "ordem", "casoId", "clienteId", "createdAt", "updatedAt") SELECT "id", "astreaId", "titulo", "status", "done", "prio", "projeto", "data", "hora", "prazo", "notes", "reminder", "recur", "ai", "subtasks", "dor", "dod", "origem", "geradoPorApp", "ordem", "casoId", "clienteId", "createdAt", "updatedAt" FROM "Tarefa";
DROP TABLE "Tarefa";
ALTER TABLE "new_Tarefa" RENAME TO "Tarefa";
CREATE UNIQUE INDEX "Tarefa_astreaId_key" ON "Tarefa"("astreaId");
CREATE INDEX "Tarefa_status_idx" ON "Tarefa"("status");
CREATE INDEX "Tarefa_responsavelId_idx" ON "Tarefa"("responsavelId");
CREATE INDEX "Tarefa_prazo_idx" ON "Tarefa"("prazo");
CREATE INDEX "Tarefa_data_idx" ON "Tarefa"("data");

CREATE TABLE "new_Evento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'reuniao',
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME,
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "local" TEXT,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmado',
    "responsavelId" INTEGER,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Evento" ("id", "titulo", "tipo", "dataInicio", "dataFim", "diaInteiro", "local", "descricao", "status", "clienteId", "casoId", "origem", "geradoPorApp", "createdAt", "updatedAt") SELECT "id", "titulo", "tipo", "dataInicio", "dataFim", "diaInteiro", "local", "descricao", "status", "clienteId", "casoId", "origem", "geradoPorApp", "createdAt", "updatedAt" FROM "Evento";
DROP TABLE "Evento";
ALTER TABLE "new_Evento" RENAME TO "Evento";
CREATE INDEX "Evento_dataInicio_idx" ON "Evento"("dataInicio");
CREATE INDEX "Evento_clienteId_idx" ON "Evento"("clienteId");
CREATE INDEX "Evento_casoId_idx" ON "Evento"("casoId");
CREATE INDEX "Evento_responsavelId_idx" ON "Evento"("responsavelId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
