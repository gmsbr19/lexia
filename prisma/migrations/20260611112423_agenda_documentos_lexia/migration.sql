-- CreateTable
CREATE TABLE "Evento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'reuniao',
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME,
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "local" TEXT,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmado',
    "responsavelId" INTEGER,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "formato" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "payload" TEXT,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "criadoPor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Documento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LexiaConversa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT,
    "userEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LexiaMensagem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversaId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LexiaMensagem_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "LexiaConversa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Evento_dataInicio_idx" ON "Evento"("dataInicio");

-- CreateIndex
CREATE INDEX "Evento_clienteId_idx" ON "Evento"("clienteId");

-- CreateIndex
CREATE INDEX "Evento_casoId_idx" ON "Evento"("casoId");

-- CreateIndex
CREATE INDEX "Evento_responsavelId_idx" ON "Evento"("responsavelId");

-- CreateIndex
CREATE INDEX "Documento_clienteId_idx" ON "Documento"("clienteId");

-- CreateIndex
CREATE INDEX "Documento_casoId_idx" ON "Documento"("casoId");

-- CreateIndex
CREATE INDEX "Documento_status_idx" ON "Documento"("status");

-- CreateIndex
CREATE INDEX "LexiaConversa_userEmail_updatedAt_idx" ON "LexiaConversa"("userEmail", "updatedAt");

-- CreateIndex
CREATE INDEX "LexiaMensagem_conversaId_idx" ON "LexiaMensagem"("conversaId");
