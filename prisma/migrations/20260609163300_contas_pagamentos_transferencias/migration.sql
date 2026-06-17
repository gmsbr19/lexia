-- CreateTable
CREATE TABLE "Transferencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "dataMovimento" DATETIME NOT NULL,
    "descricao" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "contaOrigemId" INTEGER NOT NULL,
    "contaDestinoId" INTEGER NOT NULL,
    "lancSaidaId" INTEGER,
    "lancEntradaId" INTEGER,
    CONSTRAINT "Transferencia_contaOrigemId_fkey" FOREIGN KEY ("contaOrigemId") REFERENCES "Conta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transferencia_contaDestinoId_fkey" FOREIGN KEY ("contaDestinoId") REFERENCES "Conta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transferencia_lancSaidaId_fkey" FOREIGN KEY ("lancSaidaId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transferencia_lancEntradaId_fkey" FOREIGN KEY ("lancEntradaId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'astrea',
    "kind" TEXT NOT NULL DEFAULT 'banco',
    "titular" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "valorInicialCents" INTEGER NOT NULL DEFAULT 0,
    "dataInicio" DATETIME,
    "agencia" TEXT,
    "numero" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Conta" ("agencia", "astreaId", "ativo", "dataInicio", "id", "nome", "numero", "tipo", "valorInicialCents") SELECT "agencia", "astreaId", "ativo", "dataInicio", "id", "nome", "numero", "tipo", "valorInicialCents" FROM "Conta";
DROP TABLE "Conta";
ALTER TABLE "new_Conta" RENAME TO "Conta";
CREATE UNIQUE INDEX "Conta_astreaId_key" ON "Conta"("astreaId");
CREATE TABLE "new_CustoFixo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "categoria" TEXT NOT NULL,
    "diaVencimento" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "contaId" INTEGER,
    CONSTRAINT "CustoFixo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CustoFixo" ("ativo", "categoria", "diaVencimento", "id", "nome", "valorCents") SELECT "ativo", "categoria", "diaVencimento", "id", "nome", "valorCents" FROM "CustoFixo";
DROP TABLE "CustoFixo";
ALTER TABLE "new_CustoFixo" RENAME TO "CustoFixo";
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
    "entradaAstreaId" TEXT,
    "casoId" INTEGER,
    "clienteId" INTEGER,
    "lancamentoId" INTEGER,
    "dataPagamento" DATETIME,
    "contaId" INTEGER,
    CONSTRAINT "Honorario_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Honorario" ("astreaId", "casoId", "clienteId", "dataVencimento", "descricao", "entradaAstreaId", "id", "lancamentoId", "pagamento", "processoTitulo", "responsavel", "status", "tipo", "valorCents", "valorLiquidoCents") SELECT "astreaId", "casoId", "clienteId", "dataVencimento", "descricao", "entradaAstreaId", "id", "lancamentoId", "pagamento", "processoTitulo", "responsavel", "status", "tipo", "valorCents", "valorLiquidoCents" FROM "Honorario";
DROP TABLE "Honorario";
ALTER TABLE "new_Honorario" RENAME TO "Honorario";
CREATE UNIQUE INDEX "Honorario_astreaId_key" ON "Honorario"("astreaId");
CREATE INDEX "Honorario_status_idx" ON "Honorario"("status");
CREATE INDEX "Honorario_tipo_idx" ON "Honorario"("tipo");
CREATE INDEX "Honorario_contaId_idx" ON "Honorario"("contaId");
CREATE TABLE "new_Lancamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subTipo" TEXT,
    "descricao" TEXT,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "valorOriginalCents" INTEGER NOT NULL DEFAULT 0,
    "pagoPara" TEXT,
    "responsavel" TEXT,
    "dataLancamento" DATETIME,
    "dataVencimento" DATETIME,
    "dataPagamento" DATETIME,
    "vencimentoFatura" DATETIME,
    "entradaOriginalAstreaId" TEXT,
    "recorrenteParentId" INTEGER,
    "isAnomalia" BOOLEAN NOT NULL DEFAULT false,
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT false,
    "origem" TEXT NOT NULL DEFAULT 'astrea',
    "contaId" INTEGER,
    "categoriaId" INTEGER,
    "centroCustoId" INTEGER,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    CONSTRAINT "Lancamento_recorrenteParentId_fkey" FOREIGN KEY ("recorrenteParentId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "CentroCusto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lancamento" ("astreaId", "casoId", "categoriaId", "centroCustoId", "clienteId", "contaId", "dataLancamento", "dataPagamento", "dataVencimento", "descricao", "entradaOriginalAstreaId", "geradoPorApp", "id", "isAnomalia", "pagoPara", "recorrenteParentId", "responsavel", "status", "subTipo", "tipo", "valorCents", "valorOriginalCents", "vencimentoFatura") SELECT "astreaId", "casoId", "categoriaId", "centroCustoId", "clienteId", "contaId", "dataLancamento", "dataPagamento", "dataVencimento", "descricao", "entradaOriginalAstreaId", "geradoPorApp", "id", "isAnomalia", "pagoPara", "recorrenteParentId", "responsavel", "status", "subTipo", "tipo", "valorCents", "valorOriginalCents", "vencimentoFatura" FROM "Lancamento";
DROP TABLE "Lancamento";
ALTER TABLE "new_Lancamento" RENAME TO "Lancamento";
CREATE UNIQUE INDEX "Lancamento_astreaId_key" ON "Lancamento"("astreaId");
CREATE INDEX "Lancamento_tipo_status_idx" ON "Lancamento"("tipo", "status");
CREATE INDEX "Lancamento_dataVencimento_idx" ON "Lancamento"("dataVencimento");
CREATE INDEX "Lancamento_dataPagamento_idx" ON "Lancamento"("dataPagamento");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_lancSaidaId_key" ON "Transferencia"("lancSaidaId");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_lancEntradaId_key" ON "Transferencia"("lancEntradaId");

-- CreateIndex
CREATE INDEX "Transferencia_dataMovimento_idx" ON "Transferencia"("dataMovimento");

-- CreateIndex
CREATE INDEX "Transferencia_contaOrigemId_idx" ON "Transferencia"("contaOrigemId");

-- CreateIndex
CREATE INDEX "Transferencia_contaDestinoId_idx" ON "Transferencia"("contaDestinoId");
