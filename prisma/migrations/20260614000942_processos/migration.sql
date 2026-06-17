-- CreateTable
CREATE TABLE "OabMonitorada" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "advogadoNome" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExecucaoCaptura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fonte" TEXT NOT NULL,
    "escopo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "iniciadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" DATETIME,
    "janelaDe" DATETIME,
    "janelaAte" DATETIME,
    "encontrados" INTEGER NOT NULL DEFAULT 0,
    "criados" INTEGER NOT NULL DEFAULT 0,
    "ignorados" INTEGER NOT NULL DEFAULT 0,
    "semVinculo" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "OabMonitorada_numero_uf_key" ON "OabMonitorada"("numero", "uf");

-- CreateIndex
CREATE INDEX "ExecucaoCaptura_fonte_createdAt_idx" ON "ExecucaoCaptura"("fonte", "createdAt");

-- CreateIndex
CREATE INDEX "ExecucaoCaptura_status_idx" ON "ExecucaoCaptura"("status");
