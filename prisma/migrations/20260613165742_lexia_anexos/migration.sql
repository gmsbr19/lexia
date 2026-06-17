-- CreateTable
CREATE TABLE "LexiaAnexo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mensagemId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "storage" TEXT NOT NULL DEFAULT 'db',
    "data" TEXT,
    "ref" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LexiaAnexo_mensagemId_fkey" FOREIGN KEY ("mensagemId") REFERENCES "LexiaMensagem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LexiaAnexo_mensagemId_idx" ON "LexiaAnexo"("mensagemId");
