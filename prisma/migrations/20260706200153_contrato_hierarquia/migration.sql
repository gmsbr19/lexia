-- CreateTable
CREATE TABLE "Contrato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chave" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT,
    "area" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "origem" TEXT,
    "dataFechamento" DATETIME,
    "clienteId" INTEGER,
    "campanhaId" INTEGER,
    "responsavelUserId" INTEGER,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contrato_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contrato_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContratoResponsavel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contratoId" INTEGER NOT NULL,
    "contaId" INTEGER NOT NULL,
    "percentual" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContratoResponsavel_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContratoResponsavel_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "contratoId" INTEGER,
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
CREATE TABLE "new_Honorario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataVencimento" DATETIME,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "valorLiquidoCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT,
    "tipo" TEXT,
    "pagamento" TEXT,
    "responsavel" TEXT,
    "processoTitulo" TEXT,
    "processoId" INTEGER,
    "entradaAstreaId" TEXT,
    "casoId" INTEGER,
    "contratoId" INTEGER,
    "clienteId" INTEGER,
    "lancamentoId" INTEGER,
    "dataPagamento" DATETIME,
    "contaId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Honorario_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Honorario" ("astreaId", "casoId", "clienteId", "contaId", "createdAt", "dataPagamento", "dataVencimento", "descricao", "entradaAstreaId", "id", "lancamentoId", "pagamento", "processoId", "processoTitulo", "responsavel", "status", "tipo", "updatedAt", "valorCents", "valorLiquidoCents") SELECT "astreaId", "casoId", "clienteId", "contaId", "createdAt", "dataPagamento", "dataVencimento", "descricao", "entradaAstreaId", "id", "lancamentoId", "pagamento", "processoId", "processoTitulo", "responsavel", "status", "tipo", "updatedAt", "valorCents", "valorLiquidoCents" FROM "Honorario";
DROP TABLE "Honorario";
ALTER TABLE "new_Honorario" RENAME TO "Honorario";
CREATE UNIQUE INDEX "Honorario_astreaId_key" ON "Honorario"("astreaId");
CREATE INDEX "Honorario_status_idx" ON "Honorario"("status");
CREATE INDEX "Honorario_tipo_idx" ON "Honorario"("tipo");
CREATE INDEX "Honorario_contaId_idx" ON "Honorario"("contaId");
CREATE INDEX "Honorario_processoId_idx" ON "Honorario"("processoId");
CREATE INDEX "Honorario_contratoId_idx" ON "Honorario"("contratoId");
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
    "contratoId" INTEGER,
    "honorarioId" INTEGER,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_honorarioId_fkey" FOREIGN KEY ("honorarioId") REFERENCES "Honorario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "honorarioId", "id", "motivoPerda", "nome", "observacoes", "origem", "telefone", "updatedAt", "valorEstimadoCents") SELECT "area", "campanhaId", "casoId", "clienteId", "createdAt", "dataConversao", "dataEntrada", "email", "etapa", "genionsId", "honorarioId", "id", "motivoPerda", "nome", "observacoes", "origem", "telefone", "updatedAt", "valorEstimadoCents" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_genionsId_key" ON "Lead"("genionsId");
CREATE INDEX "Lead_etapa_idx" ON "Lead"("etapa");
CREATE INDEX "Lead_origem_idx" ON "Lead"("origem");
CREATE INDEX "Lead_area_idx" ON "Lead"("area");
CREATE INDEX "Lead_campanhaId_idx" ON "Lead"("campanhaId");
CREATE INDEX "Lead_dataEntrada_idx" ON "Lead"("dataEntrada");
CREATE INDEX "Lead_contratoId_idx" ON "Lead"("contratoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_chave_key" ON "Contrato"("chave");

-- CreateIndex
CREATE INDEX "Contrato_clienteId_idx" ON "Contrato"("clienteId");

-- CreateIndex
CREATE INDEX "Contrato_status_idx" ON "Contrato"("status");

-- CreateIndex
CREATE INDEX "Contrato_area_idx" ON "Contrato"("area");

-- CreateIndex
CREATE INDEX "Contrato_campanhaId_idx" ON "Contrato"("campanhaId");

-- CreateIndex
CREATE INDEX "Contrato_excluidoEm_idx" ON "Contrato"("excluidoEm");

-- CreateIndex
CREATE INDEX "ContratoResponsavel_contratoId_idx" ON "ContratoResponsavel"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoResponsavel_contratoId_contaId_key" ON "ContratoResponsavel"("contratoId", "contaId");

