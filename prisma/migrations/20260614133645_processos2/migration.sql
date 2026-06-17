-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Andamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processoId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT NOT NULL,
    "fonte" TEXT NOT NULL DEFAULT 'manual',
    "relevante" BOOLEAN NOT NULL DEFAULT false,
    "statusRevisao" TEXT NOT NULL DEFAULT 'novo',
    "revisadoEm" DATETIME,
    "externalId" TEXT,
    "prazoId" INTEGER,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Andamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Andamento_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Andamento" ("createdAt", "data", "descricao", "excluidoEm", "externalId", "fonte", "id", "prazoId", "processoId", "relevante", "tipo", "updatedAt") SELECT "createdAt", "data", "descricao", "excluidoEm", "externalId", "fonte", "id", "prazoId", "processoId", "relevante", "tipo", "updatedAt" FROM "Andamento";
DROP TABLE "Andamento";
ALTER TABLE "new_Andamento" RENAME TO "Andamento";
CREATE UNIQUE INDEX "Andamento_externalId_key" ON "Andamento"("externalId");
CREATE INDEX "Andamento_processoId_idx" ON "Andamento"("processoId");
CREATE INDEX "Andamento_data_idx" ON "Andamento"("data");
CREATE INDEX "Andamento_relevante_idx" ON "Andamento"("relevante");
CREATE INDEX "Andamento_statusRevisao_idx" ON "Andamento"("statusRevisao");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
