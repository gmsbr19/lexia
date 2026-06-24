-- AreaDireito: taxonomia dinâmica de áreas do direito (gerenciável pelo admin).
-- Entidades existentes (Projeto, Caso) já guardam `area` como String? livre;
-- Lead e Campanha ganham novas colunas `area`. A chave (slug) é o elo.
--
-- Backfill dos valores históricos é feito no seed (scripts/seed-projetos.ts)
-- que normaliza Caso.area (texto livre astrea) → chave canônica e upsert
-- AreaDireito para cada área conhecida/nova.

-- CreateTable: AreaDireito (registro canônico)
CREATE TABLE "AreaDireito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT 1,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AreaDireito_chave_key" ON "AreaDireito"("chave");
CREATE INDEX "AreaDireito_excluidoEm_idx" ON "AreaDireito"("excluidoEm");

-- AddColumn: Campanha.area (slug da AreaDireito)
ALTER TABLE "Campanha" ADD COLUMN "area" TEXT;
CREATE INDEX "Campanha_area_idx" ON "Campanha"("area");

-- AddColumn: Lead.area (slug da AreaDireito; default herdado da campanha no UI)
ALTER TABLE "Lead" ADD COLUMN "area" TEXT;
CREATE INDEX "Lead_area_idx" ON "Lead"("area");

-- AddIndex: filtro por área em Caso e Projeto (já têm o campo, só faltava o índice)
CREATE INDEX "Caso_area_idx" ON "Caso"("area");
CREATE INDEX "Projeto_area_idx" ON "Projeto"("area");
