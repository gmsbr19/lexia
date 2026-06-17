-- CreateTable
CREATE TABLE "CasoResponsavel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "casoId" INTEGER NOT NULL,
    "contaId" INTEGER NOT NULL,
    "percentual" INTEGER NOT NULL DEFAULT 50,
    CONSTRAINT "CasoResponsavel_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CasoResponsavel_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CasoResponsavel_casoId_idx" ON "CasoResponsavel"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "CasoResponsavel_casoId_contaId_key" ON "CasoResponsavel"("casoId", "contaId");
