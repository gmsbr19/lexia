-- Seções personalizadas dentro de projetos (estilo Todoist): ProjetoSecao vira
-- COLUNA do quadro do projeto; Tarefa.secaoId aponta p/ a seção (onDelete SetNull
-- = excluir a seção manda as tarefas para "Sem seção", nunca as apaga). Templates
-- ganham seções-modelo (ProjetoTemplateSecao) + cada item guarda o ÍNDICE da sua
-- seção (ProjetoTemplateTarefa.secaoOrdem). Aditivo e lossless — nada existente é
-- removido; projetos/tarefas atuais seguem válidos (secaoId nulo = "Sem seção").

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- CreateTable: ProjetoSecao (referenciada por Tarefa.secaoId → criar antes)
CREATE TABLE "ProjetoSecao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projetoId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjetoSecao_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: ProjetoTemplateSecao
CREATE TABLE "ProjetoTemplateSecao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "templateId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjetoTemplateSecao_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjetoTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable: Tarefa.secaoId (FK → ProjetoSecao, ON DELETE SET NULL)
ALTER TABLE "Tarefa" ADD COLUMN "secaoId" INTEGER REFERENCES "ProjetoSecao" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ProjetoTemplateTarefa.secaoOrdem (índice da seção-modelo; null = sem seção)
ALTER TABLE "ProjetoTemplateTarefa" ADD COLUMN "secaoOrdem" INTEGER;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjetoSecao_projetoId_idx" ON "ProjetoSecao"("projetoId");
CREATE INDEX "ProjetoTemplateSecao_templateId_idx" ON "ProjetoTemplateSecao"("templateId");
CREATE INDEX "Tarefa_secaoId_idx" ON "Tarefa"("secaoId");
