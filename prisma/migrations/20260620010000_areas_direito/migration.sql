-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AreaDireito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AreaDireito" ("ativo", "chave", "cor", "createdAt", "excluidoEm", "icone", "id", "nome", "ordem", "updatedAt") SELECT "ativo", "chave", "cor", "createdAt", "excluidoEm", "icone", "id", "nome", "ordem", "updatedAt" FROM "AreaDireito";
DROP TABLE "AreaDireito";
ALTER TABLE "new_AreaDireito" RENAME TO "AreaDireito";
CREATE UNIQUE INDEX "AreaDireito_chave_key" ON "AreaDireito"("chave");
CREATE INDEX "AreaDireito_excluidoEm_idx" ON "AreaDireito"("excluidoEm");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
