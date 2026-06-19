-- Projetos & Tarefas: container de trabalho dinâmico (Projeto) + templates
-- reutilizáveis (ProjetoTemplate + itens) + Tarefa.projetoId/concluidoEm.
-- Aditivo e lossless: a string Tarefa.projeto é mantida (o seed semeia 1 Projeto
-- por área e faz o backfill de projetoId). Hand-authored para o `prisma migrate
-- dev` (db:migrate) aplicar de forma não-interativa.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- CreateTable: ProjetoTemplate
CREATE TABLE "ProjetoTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chave" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "area" TEXT,
    "cor" TEXT,
    "icone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: Projeto
CREATE TABLE "Projeto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chave" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "cor" TEXT,
    "icone" TEXT,
    "area" TEXT,
    "prazo" DATETIME,
    "responsavelId" INTEGER,
    "casoId" INTEGER,
    "clienteId" INTEGER,
    "templateOrigemId" INTEGER,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Projeto_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Projeto_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Projeto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Projeto_templateOrigemId_fkey" FOREIGN KEY ("templateOrigemId") REFERENCES "ProjetoTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: ProjetoTemplateTarefa
CREATE TABLE "ProjetoTemplateTarefa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "templateId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prio" INTEGER NOT NULL DEFAULT 3,
    "responsavelPlaceholder" TEXT,
    "offsetDias" INTEGER NOT NULL DEFAULT 0,
    "base" TEXT NOT NULL DEFAULT 'inicio',
    "dor" TEXT NOT NULL DEFAULT '[]',
    "dod" TEXT NOT NULL DEFAULT '[]',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjetoTemplateTarefa_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjetoTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTable: Tarefa gains projetoId (FK → Projeto) + concluidoEm + index
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
    "projetoId" INTEGER,
    "concluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tarefa" ("ai", "astreaId", "casoId", "clienteId", "createdAt", "criadoPorId", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "projeto", "processoId", "recur", "reminder", "responsavelId", "status", "subtasks", "titulo", "updatedAt") SELECT "ai", "astreaId", "casoId", "clienteId", "createdAt", "criadoPorId", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "projeto", "processoId", "recur", "reminder", "responsavelId", "status", "subtasks", "titulo", "updatedAt" FROM "Tarefa";
DROP TABLE "Tarefa";
ALTER TABLE "new_Tarefa" RENAME TO "Tarefa";
CREATE UNIQUE INDEX "Tarefa_astreaId_key" ON "Tarefa"("astreaId");
CREATE INDEX "Tarefa_status_idx" ON "Tarefa"("status");
CREATE INDEX "Tarefa_responsavelId_idx" ON "Tarefa"("responsavelId");
CREATE INDEX "Tarefa_criadoPorId_idx" ON "Tarefa"("criadoPorId");
CREATE INDEX "Tarefa_prazo_idx" ON "Tarefa"("prazo");
CREATE INDEX "Tarefa_data_idx" ON "Tarefa"("data");
CREATE INDEX "Tarefa_processoId_idx" ON "Tarefa"("processoId");
CREATE INDEX "Tarefa_projetoId_idx" ON "Tarefa"("projetoId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex: new tables
CREATE UNIQUE INDEX "ProjetoTemplate_chave_key" ON "ProjetoTemplate"("chave");
CREATE INDEX "ProjetoTemplate_ativo_idx" ON "ProjetoTemplate"("ativo");
CREATE UNIQUE INDEX "Projeto_chave_key" ON "Projeto"("chave");
CREATE INDEX "Projeto_status_idx" ON "Projeto"("status");
CREATE INDEX "Projeto_responsavelId_idx" ON "Projeto"("responsavelId");
CREATE INDEX "Projeto_casoId_idx" ON "Projeto"("casoId");
CREATE INDEX "Projeto_clienteId_idx" ON "Projeto"("clienteId");
CREATE INDEX "Projeto_excluidoEm_idx" ON "Projeto"("excluidoEm");
CREATE INDEX "ProjetoTemplateTarefa_templateId_idx" ON "ProjetoTemplateTarefa"("templateId");
