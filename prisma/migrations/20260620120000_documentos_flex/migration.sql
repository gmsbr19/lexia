-- Documentos flexíveis (Fase 1): papel timbrado (Timbrado) + templates reutilizáveis
-- (DocumentoTemplate, substitui o registry hardcoded) + Documento ganha conteudo
-- (LexDoc JSON) / valores (mapa de campos) / templateId / timbradoId.
-- Aditivo e lossless: nada existente é removido; o contrato estruturado segue
-- usando `payload`. Hand-authored p/ o `prisma migrate dev` aplicar sem prompts.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- CreateTable: Timbrado (criado antes — DocumentoTemplate e Documento o referenciam)
CREATE TABLE "Timbrado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "mimeType" TEXT,
    "margemTop" INTEGER NOT NULL DEFAULT 30,
    "margemRight" INTEGER NOT NULL DEFAULT 25,
    "margemBottom" INTEGER NOT NULL DEFAULT 30,
    "margemLeft" INTEGER NOT NULL DEFAULT 25,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "criadoPor" TEXT,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: DocumentoTemplate
CREATE TABLE "DocumentoTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chave" TEXT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Outro',
    "descricao" TEXT,
    "conteudo" TEXT,
    "placeholders" TEXT NOT NULL DEFAULT '[]',
    "tipoEstruturado" TEXT,
    "timbradoId" INTEGER,
    "icone" TEXT,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usoCount" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoPor" TEXT,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentoTemplate_timbradoId_fkey" FOREIGN KEY ("timbradoId") REFERENCES "Timbrado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTable: Documento gains conteudo / valores / templateId / timbradoId (+FKs +index)
CREATE TABLE "new_Documento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "tipo" TEXT,
    "formato" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "payload" TEXT,
    "conteudo" TEXT,
    "valores" TEXT,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "templateId" INTEGER,
    "timbradoId" INTEGER,
    "criadoPor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Documento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentoTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_timbradoId_fkey" FOREIGN KEY ("timbradoId") REFERENCES "Timbrado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Documento" ("casoId", "clienteId", "createdAt", "criadoPor", "formato", "id", "nome", "payload", "processoId", "status", "template", "tipo", "updatedAt") SELECT "casoId", "clienteId", "createdAt", "criadoPor", "formato", "id", "nome", "payload", "processoId", "status", "template", "tipo", "updatedAt" FROM "Documento";
DROP TABLE "Documento";
ALTER TABLE "new_Documento" RENAME TO "Documento";
CREATE INDEX "Documento_clienteId_idx" ON "Documento"("clienteId");
CREATE INDEX "Documento_casoId_idx" ON "Documento"("casoId");
CREATE INDEX "Documento_status_idx" ON "Documento"("status");
CREATE INDEX "Documento_processoId_idx" ON "Documento"("processoId");
CREATE INDEX "Documento_templateId_idx" ON "Documento"("templateId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex: new tables
CREATE UNIQUE INDEX "DocumentoTemplate_chave_key" ON "DocumentoTemplate"("chave");
CREATE INDEX "DocumentoTemplate_categoria_idx" ON "DocumentoTemplate"("categoria");
CREATE INDEX "DocumentoTemplate_ativo_idx" ON "DocumentoTemplate"("ativo");
CREATE INDEX "DocumentoTemplate_excluidoEm_idx" ON "DocumentoTemplate"("excluidoEm");
CREATE INDEX "Timbrado_excluidoEm_idx" ON "Timbrado"("excluidoEm");
