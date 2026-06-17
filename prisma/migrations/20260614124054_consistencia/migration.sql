-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "clienteId" INTEGER,
    "lancamentoId" INTEGER,
    "dataPagamento" DATETIME,
    "contaId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Honorario_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Honorario_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Honorario" ("astreaId", "casoId", "clienteId", "contaId", "createdAt", "dataPagamento", "dataVencimento", "descricao", "entradaAstreaId", "id", "lancamentoId", "pagamento", "processoTitulo", "responsavel", "status", "tipo", "updatedAt", "valorCents", "valorLiquidoCents") SELECT "astreaId", "casoId", "clienteId", "contaId", "createdAt", "dataPagamento", "dataVencimento", "descricao", "entradaAstreaId", "id", "lancamentoId", "pagamento", "processoTitulo", "responsavel", "status", "tipo", "updatedAt", "valorCents", "valorLiquidoCents" FROM "Honorario";
DROP TABLE "Honorario";
ALTER TABLE "new_Honorario" RENAME TO "Honorario";
CREATE UNIQUE INDEX "Honorario_astreaId_key" ON "Honorario"("astreaId");
CREATE INDEX "Honorario_status_idx" ON "Honorario"("status");
CREATE INDEX "Honorario_tipo_idx" ON "Honorario"("tipo");
CREATE INDEX "Honorario_contaId_idx" ON "Honorario"("contaId");
CREATE INDEX "Honorario_processoId_idx" ON "Honorario"("processoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
