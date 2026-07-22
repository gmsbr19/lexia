-- CreateTable
CREATE TABLE "OportunidadeAtividade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leadId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT,
    "resultado" TEXT,
    "ocorreuEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OportunidadeAtividade_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OportunidadeAtividade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "genionsId" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'outro',
    "campanhaId" INTEGER,
    "area" TEXT,
    "etapa" TEXT NOT NULL DEFAULT 'novo',
    "valorEstimadoCents" INTEGER,
    "dataEntrada" DATETIME NOT NULL,
    "dataConversao" DATETIME,
    "motivoPerda" TEXT,
    "motivoPerdaCategoria" TEXT,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "honorarioId" INTEGER,
    "lancamentoId" INTEGER,
    "responsavelUserId" INTEGER,
    "proximaAcaoEm" DATETIME,
    "proximaAcaoNota" TEXT,
    "temperatura" TEXT,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_honorarioId_fkey" FOREIGN KEY ("honorarioId") REFERENCES "Honorario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "honorarioId", "id", "lancamentoId", "motivoPerda", "nome", "observacoes", "origem", "telefone", "updatedAt", "valorEstimadoCents") SELECT "area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "honorarioId", "id", "lancamentoId", "motivoPerda", "nome", "observacoes", "origem", "telefone", "updatedAt", "valorEstimadoCents" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_genionsId_key" ON "Lead"("genionsId");
CREATE INDEX "Lead_etapa_idx" ON "Lead"("etapa");
CREATE INDEX "Lead_origem_idx" ON "Lead"("origem");
CREATE INDEX "Lead_area_idx" ON "Lead"("area");
CREATE INDEX "Lead_campanhaId_idx" ON "Lead"("campanhaId");
CREATE INDEX "Lead_dataEntrada_idx" ON "Lead"("dataEntrada");
CREATE INDEX "Lead_responsavelUserId_idx" ON "Lead"("responsavelUserId");
CREATE INDEX "Lead_proximaAcaoEm_idx" ON "Lead"("proximaAcaoEm");
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
    "leadId" INTEGER,
    "projetoId" INTEGER,
    "secaoId" INTEGER,
    "concluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_secaoId_fkey" FOREIGN KEY ("secaoId") REFERENCES "ProjetoSecao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tarefa" ("ai", "astreaId", "casoId", "clienteId", "concluidoEm", "createdAt", "criadoPorId", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "processoId", "projeto", "projetoId", "recur", "reminder", "responsavelId", "secaoId", "status", "subtasks", "titulo", "updatedAt") SELECT "ai", "astreaId", "casoId", "clienteId", "concluidoEm", "createdAt", "criadoPorId", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "processoId", "projeto", "projetoId", "recur", "reminder", "responsavelId", "secaoId", "status", "subtasks", "titulo", "updatedAt" FROM "Tarefa";
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
CREATE INDEX "Tarefa_secaoId_idx" ON "Tarefa"("secaoId");
CREATE INDEX "Tarefa_leadId_idx" ON "Tarefa"("leadId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OportunidadeAtividade_leadId_idx" ON "OportunidadeAtividade"("leadId");

-- CreateIndex
CREATE INDEX "OportunidadeAtividade_ocorreuEm_idx" ON "OportunidadeAtividade"("ocorreuEm");

-- CreateIndex
CREATE INDEX "Lancamento_campanhaId_idx" ON "Lancamento"("campanhaId");

-- CreateIndex
CREATE INDEX "Lancamento_clienteId_idx" ON "Lancamento"("clienteId");

-- CreateIndex
CREATE INDEX "Lancamento_casoId_idx" ON "Lancamento"("casoId");
