-- CreateTable
CREATE TABLE "Categoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Conta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "valorInicialCents" INTEGER NOT NULL DEFAULT 0,
    "dataInicio" DATETIME,
    "agencia" TEXT,
    "numero" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CentroCusto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "apelido" TEXT,
    "tipo" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "simplesNacional" BOOLEAN NOT NULL DEFAULT false,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "emails" TEXT,
    "telefones" TEXT
);

-- CreateTable
CREATE TABLE "Caso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT,
    "responsavel" TEXT,
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
    CONSTRAINT "Caso_clientePrincipalId_fkey" FOREIGN KEY ("clientePrincipalId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Honorario" (
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
    CONSTRAINT "Honorario_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lancamento" (
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

-- CreateTable
CREATE TABLE "CustoFixo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "categoria" TEXT NOT NULL,
    "diaVencimento" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_astreaId_key" ON "Categoria"("astreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Conta_astreaId_key" ON "Conta"("astreaId");

-- CreateIndex
CREATE UNIQUE INDEX "CentroCusto_astreaId_key" ON "CentroCusto"("astreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_astreaId_key" ON "Cliente"("astreaId");

-- CreateIndex
CREATE INDEX "Cliente_tipo_idx" ON "Cliente"("tipo");

-- CreateIndex
CREATE INDEX "Cliente_classificacao_idx" ON "Cliente"("classificacao");

-- CreateIndex
CREATE UNIQUE INDEX "Caso_astreaId_key" ON "Caso"("astreaId");

-- CreateIndex
CREATE INDEX "Caso_status_idx" ON "Caso"("status");

-- CreateIndex
CREATE INDEX "Caso_tipo_idx" ON "Caso"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Honorario_astreaId_key" ON "Honorario"("astreaId");

-- CreateIndex
CREATE INDEX "Honorario_status_idx" ON "Honorario"("status");

-- CreateIndex
CREATE INDEX "Honorario_tipo_idx" ON "Honorario"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Lancamento_astreaId_key" ON "Lancamento"("astreaId");

-- CreateIndex
CREATE INDEX "Lancamento_tipo_status_idx" ON "Lancamento"("tipo", "status");

-- CreateIndex
CREATE INDEX "Lancamento_dataVencimento_idx" ON "Lancamento"("dataVencimento");

-- CreateIndex
CREATE INDEX "Lancamento_dataPagamento_idx" ON "Lancamento"("dataPagamento");
