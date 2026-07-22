-- DropIndex
DROP INDEX "Honorario_processoId_idx";

-- DropIndex
DROP INDEX "Honorario_contaId_idx";

-- DropIndex
DROP INDEX "Honorario_tipo_idx";

-- DropIndex
DROP INDEX "Honorario_status_idx";

-- DropIndex
DROP INDEX "Honorario_astreaId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Honorario";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Contrato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER,
    "titulo" TEXT,
    "dataFechamento" DATETIME NOT NULL,
    "observacoes" TEXT,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Caso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "area" TEXT,
    "status" TEXT,
    "responsavel" TEXT,
    "responsavelUserId" INTEGER,
    "clientePrincipalId" INTEGER,
    "valorCausaCents" INTEGER,
    "instancia" TEXT,
    "tipoAcao" TEXT,
    "tribunal" TEXT,
    "numeroProcesso" TEXT,
    "vara" TEXT,
    "dataDistribuicao" DATETIME,
    "dataCriacao" DATETIME,
    "ultimaMovimentacao" DATETIME,
    "excluidoEm" DATETIME,
    "contratoId" INTEGER,
    CONSTRAINT "Caso_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Caso_clientePrincipalId_fkey" FOREIGN KEY ("clientePrincipalId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Caso_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Caso" ("area", "astreaId", "clientePrincipalId", "dataCriacao", "dataDistribuicao", "excluidoEm", "id", "instancia", "numeroProcesso", "responsavel", "responsavelUserId", "status", "tipo", "tipoAcao", "titulo", "tribunal", "ultimaMovimentacao", "valorCausaCents", "vara") SELECT "area", "astreaId", "clientePrincipalId", "dataCriacao", "dataDistribuicao", "excluidoEm", "id", "instancia", "numeroProcesso", "responsavel", "responsavelUserId", "status", "tipo", "tipoAcao", "titulo", "tribunal", "ultimaMovimentacao", "valorCausaCents", "vara" FROM "Caso";
DROP TABLE "Caso";
ALTER TABLE "new_Caso" RENAME TO "Caso";
CREATE UNIQUE INDEX "Caso_astreaId_key" ON "Caso"("astreaId");
CREATE INDEX "Caso_status_idx" ON "Caso"("status");
CREATE INDEX "Caso_tipo_idx" ON "Caso"("tipo");
CREATE INDEX "Caso_area_idx" ON "Caso"("area");
CREATE INDEX "Caso_responsavelUserId_idx" ON "Caso"("responsavelUserId");
CREATE INDEX "Caso_contratoId_idx" ON "Caso"("contratoId");
CREATE TABLE "new_Documento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "tipo" TEXT,
    "formato" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "payload" TEXT,
    "conteudo" TEXT,
    "valores" TEXT,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "templateId" INTEGER,
    "timbradoId" INTEGER,
    "contratoId" INTEGER,
    "criadoPor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Documento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentoTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_timbradoId_fkey" FOREIGN KEY ("timbradoId") REFERENCES "Timbrado" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Documento" ("casoId", "clienteId", "conteudo", "createdAt", "criadoPor", "formato", "id", "nome", "payload", "processoId", "status", "template", "templateId", "timbradoId", "tipo", "updatedAt", "valores") SELECT "casoId", "clienteId", "conteudo", "createdAt", "criadoPor", "formato", "id", "nome", "payload", "processoId", "status", "template", "templateId", "timbradoId", "tipo", "updatedAt", "valores" FROM "Documento";
DROP TABLE "Documento";
ALTER TABLE "new_Documento" RENAME TO "Documento";
CREATE INDEX "Documento_clienteId_idx" ON "Documento"("clienteId");
CREATE INDEX "Documento_casoId_idx" ON "Documento"("casoId");
CREATE INDEX "Documento_status_idx" ON "Documento"("status");
CREATE INDEX "Documento_processoId_idx" ON "Documento"("processoId");
CREATE INDEX "Documento_templateId_idx" ON "Documento"("templateId");
CREATE INDEX "Documento_contratoId_idx" ON "Documento"("contratoId");
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
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "lancamentoId" INTEGER,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "id", "lancamentoId", "motivoPerda", "nome", "observacoes", "origem", "telefone", "updatedAt", "valorEstimadoCents") SELECT "area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "id", "lancamentoId", "motivoPerda", "nome", "observacoes", "origem", "telefone", "updatedAt", "valorEstimadoCents" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_genionsId_key" ON "Lead"("genionsId");
CREATE INDEX "Lead_etapa_idx" ON "Lead"("etapa");
CREATE INDEX "Lead_origem_idx" ON "Lead"("origem");
CREATE INDEX "Lead_area_idx" ON "Lead"("area");
CREATE INDEX "Lead_campanhaId_idx" ON "Lead"("campanhaId");
CREATE INDEX "Lead_dataEntrada_idx" ON "Lead"("dataEntrada");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Contrato_clienteId_idx" ON "Contrato"("clienteId");

-- CreateIndex
CREATE INDEX "Contrato_dataFechamento_idx" ON "Contrato"("dataFechamento");

-- CreateIndex
CREATE INDEX "Contrato_excluidoEm_idx" ON "Contrato"("excluidoEm");

