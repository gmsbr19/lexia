-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "processoId" INTEGER,
    "leadId" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Evento" ("casoId", "clienteId", "createdAt", "dataFim", "dataInicio", "descricao", "diaInteiro", "geradoPorApp", "id", "local", "origem", "processoId", "responsavelId", "status", "tipo", "titulo", "updatedAt") SELECT "casoId", "clienteId", "createdAt", "dataFim", "dataInicio", "descricao", "diaInteiro", "geradoPorApp", "id", "local", "origem", "processoId", "responsavelId", "status", "tipo", "titulo", "updatedAt" FROM "Evento";
DROP TABLE "Evento";
ALTER TABLE "new_Evento" RENAME TO "Evento";
CREATE INDEX "Evento_dataInicio_idx" ON "Evento"("dataInicio");
CREATE INDEX "Evento_clienteId_idx" ON "Evento"("clienteId");
CREATE INDEX "Evento_casoId_idx" ON "Evento"("casoId");
CREATE INDEX "Evento_responsavelId_idx" ON "Evento"("responsavelId");
CREATE INDEX "Evento_processoId_idx" ON "Evento"("processoId");
CREATE INDEX "Evento_leadId_idx" ON "Evento"("leadId");
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
    "potencialFinanceiro" TEXT,
    "urgenciaNivel" TEXT,
    "poderDecisao" TEXT,
    "jurisdicao" TEXT,
    "viabilidade" TEXT,
    "contratoEnviadoEm" DATETIME,
    "perdidoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_honorarioId_fkey" FOREIGN KEY ("honorarioId") REFERENCES "Honorario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "honorarioId", "id", "lancamentoId", "motivoPerda", "motivoPerdaCategoria", "nome", "observacoes", "origem", "proximaAcaoEm", "proximaAcaoNota", "responsavelUserId", "telefone", "temperatura", "updatedAt", "valorEstimadoCents") SELECT "area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "honorarioId", "id", "lancamentoId", "motivoPerda", "motivoPerdaCategoria", "nome", "observacoes", "origem", "proximaAcaoEm", "proximaAcaoNota", "responsavelUserId", "telefone", "temperatura", "updatedAt", "valorEstimadoCents" FROM "Lead";
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
CREATE TABLE "new_OportunidadeAtividade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leadId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT,
    "resultado" TEXT,
    "toqueNumero" INTEGER,
    "sinais" TEXT NOT NULL DEFAULT '[]',
    "ocorreuEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OportunidadeAtividade_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OportunidadeAtividade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OportunidadeAtividade" ("autorId", "createdAt", "descricao", "id", "leadId", "ocorreuEm", "resultado", "tipo", "titulo", "updatedAt") SELECT "autorId", "createdAt", "descricao", "id", "leadId", "ocorreuEm", "resultado", "tipo", "titulo", "updatedAt" FROM "OportunidadeAtividade";
DROP TABLE "OportunidadeAtividade";
ALTER TABLE "new_OportunidadeAtividade" RENAME TO "OportunidadeAtividade";
CREATE INDEX "OportunidadeAtividade_leadId_idx" ON "OportunidadeAtividade"("leadId");
CREATE INDEX "OportunidadeAtividade_ocorreuEm_idx" ON "OportunidadeAtividade"("ocorreuEm");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
