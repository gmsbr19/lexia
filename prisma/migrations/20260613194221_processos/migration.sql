-- CreateTable
CREATE TABLE "Processo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "casoId" INTEGER NOT NULL,
    "numeroCnj" TEXT,
    "classe" TEXT,
    "assunto" TEXT,
    "valorCausaCents" INTEGER NOT NULL DEFAULT 0,
    "faseAtual" TEXT,
    "instancia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "vara" TEXT,
    "comarca" TEXT,
    "tribunal" TEXT,
    "uf" TEXT,
    "sistema" TEXT,
    "segredoJustica" BOOLEAN NOT NULL DEFAULT false,
    "dataDistribuicao" DATETIME,
    "responsavelUserId" INTEGER,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Processo_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Processo_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "documento" TEXT,
    "clienteId" INTEGER,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Parte_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParteProcesso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processoId" INTEGER NOT NULL,
    "parteId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL,
    "polo" TEXT NOT NULL,
    "ehCliente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParteProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParteProcesso_parteId_fkey" FOREIGN KEY ("parteId") REFERENCES "Parte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Andamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processoId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT NOT NULL,
    "fonte" TEXT NOT NULL DEFAULT 'manual',
    "relevante" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "prazoId" INTEGER,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Andamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Andamento_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Publicacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processoId" INTEGER,
    "dataDisponibilizacao" DATETIME,
    "dataPublicacao" DATETIME,
    "diario" TEXT,
    "conteudo" TEXT NOT NULL,
    "numeroProcessoBruto" TEXT,
    "oabBruto" TEXT,
    "statusTriagem" TEXT NOT NULL DEFAULT 'pendente',
    "prazoId" INTEGER,
    "externalId" TEXT,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Publicacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Publicacao_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prazo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "dataPublicacao" DATETIME,
    "dataInicio" DATETIME NOT NULL,
    "quantidadeDias" INTEGER NOT NULL,
    "tipoContagem" TEXT NOT NULL DEFAULT 'uteis',
    "jurisdicao" TEXT,
    "dataFatal" DATETIME NOT NULL,
    "diasMargem" INTEGER NOT NULL DEFAULT 0,
    "dataInterna" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "responsavelUserId" INTEGER,
    "cumpridoEm" DATETIME,
    "eventoId" INTEGER,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prazo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prazo_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feriado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "descricao" TEXT NOT NULL,
    "abrangencia" TEXT NOT NULL DEFAULT 'nacional',
    "uf" TEXT,
    "tribunal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SuspensaoPrazo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "de" DATETIME NOT NULL,
    "ate" DATETIME NOT NULL,
    "descricao" TEXT NOT NULL,
    "jurisdicao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userEmail" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "refTipo" TEXT,
    "refId" INTEGER,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DocumentoVersao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentoId" INTEGER NOT NULL,
    "versao" INTEGER NOT NULL,
    "nome" TEXT,
    "formato" TEXT,
    "payload" TEXT,
    "storage" TEXT NOT NULL DEFAULT 'db',
    "data" TEXT,
    "ref" TEXT,
    "tamanho" INTEGER,
    "mimeType" TEXT,
    "criadoPor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentoVersao_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Anotacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "autor" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "interno" BOOLEAN NOT NULL DEFAULT true,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Anotacao_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Anotacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Caso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "area" TEXT,
    "status" TEXT,
    "responsavel" TEXT,
    "responsavelUserId" INTEGER,
    "clientePrincipalId" INTEGER,
    "valorCausaCents" INTEGER,
    "instancia" TEXT,
    "tipoAcao" TEXT,
    "tribunal" TEXT,
    "numeroProcesso" TEXT,
    "vara" TEXT,
    "dataDistribuicao" DATETIME,
    "dataCriacao" DATETIME,
    "ultimaMovimentacao" DATETIME,
    "excluidoEm" DATETIME,
    CONSTRAINT "Caso_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Caso_clientePrincipalId_fkey" FOREIGN KEY ("clientePrincipalId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Caso" ("astreaId", "clientePrincipalId", "dataCriacao", "dataDistribuicao", "id", "instancia", "numeroProcesso", "responsavel", "status", "tipo", "tipoAcao", "titulo", "tribunal", "ultimaMovimentacao", "valorCausaCents", "vara") SELECT "astreaId", "clientePrincipalId", "dataCriacao", "dataDistribuicao", "id", "instancia", "numeroProcesso", "responsavel", "status", "tipo", "tipoAcao", "titulo", "tribunal", "ultimaMovimentacao", "valorCausaCents", "vara" FROM "Caso";
DROP TABLE "Caso";
ALTER TABLE "new_Caso" RENAME TO "Caso";
CREATE UNIQUE INDEX "Caso_astreaId_key" ON "Caso"("astreaId");
CREATE INDEX "Caso_status_idx" ON "Caso"("status");
CREATE INDEX "Caso_tipo_idx" ON "Caso"("tipo");
CREATE INDEX "Caso_responsavelUserId_idx" ON "Caso"("responsavelUserId");
CREATE TABLE "new_Documento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "tipo" TEXT,
    "formato" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "payload" TEXT,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "criadoPor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Documento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Documento" ("casoId", "clienteId", "createdAt", "criadoPor", "formato", "id", "nome", "payload", "status", "template", "updatedAt") SELECT "casoId", "clienteId", "createdAt", "criadoPor", "formato", "id", "nome", "payload", "status", "template", "updatedAt" FROM "Documento";
DROP TABLE "Documento";
ALTER TABLE "new_Documento" RENAME TO "Documento";
CREATE INDEX "Documento_clienteId_idx" ON "Documento"("clienteId");
CREATE INDEX "Documento_casoId_idx" ON "Documento"("casoId");
CREATE INDEX "Documento_status_idx" ON "Documento"("status");
CREATE INDEX "Documento_processoId_idx" ON "Documento"("processoId");
CREATE TABLE "new_Evento" (
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
    "processoId" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Evento" ("casoId", "clienteId", "createdAt", "dataFim", "dataInicio", "descricao", "diaInteiro", "geradoPorApp", "id", "local", "origem", "responsavelId", "status", "tipo", "titulo", "updatedAt") SELECT "casoId", "clienteId", "createdAt", "dataFim", "dataInicio", "descricao", "diaInteiro", "geradoPorApp", "id", "local", "origem", "responsavelId", "status", "tipo", "titulo", "updatedAt" FROM "Evento";
DROP TABLE "Evento";
ALTER TABLE "new_Evento" RENAME TO "Evento";
CREATE INDEX "Evento_dataInicio_idx" ON "Evento"("dataInicio");
CREATE INDEX "Evento_clienteId_idx" ON "Evento"("clienteId");
CREATE INDEX "Evento_casoId_idx" ON "Evento"("casoId");
CREATE INDEX "Evento_responsavelId_idx" ON "Evento"("responsavelId");
CREATE INDEX "Evento_processoId_idx" ON "Evento"("processoId");
CREATE TABLE "new_Lancamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subTipo" TEXT,
    "descricao" TEXT,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "valorOriginalCents" INTEGER NOT NULL DEFAULT 0,
    "pagoPara" TEXT,
    "responsavel" TEXT,
    "dataLancamento" DATETIME,
    "dataVencimento" DATETIME,
    "dataPagamento" DATETIME,
    "vencimentoFatura" DATETIME,
    "entradaOriginalAstreaId" TEXT,
    "recorrenteParentId" INTEGER,
    "isAnomalia" BOOLEAN NOT NULL DEFAULT false,
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT false,
    "origem" TEXT NOT NULL DEFAULT 'astrea',
    "contaId" INTEGER,
    "categoriaId" INTEGER,
    "centroCustoId" INTEGER,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "naturezaLegal" TEXT,
    "campanhaId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lancamento_recorrenteParentId_fkey" FOREIGN KEY ("recorrenteParentId") REFERENCES "Lancamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "CentroCusto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lancamento" ("astreaId", "campanhaId", "casoId", "categoriaId", "centroCustoId", "clienteId", "contaId", "createdAt", "dataLancamento", "dataPagamento", "dataVencimento", "descricao", "entradaOriginalAstreaId", "geradoPorApp", "id", "isAnomalia", "origem", "pagoPara", "recorrenteParentId", "responsavel", "status", "subTipo", "tipo", "updatedAt", "valorCents", "valorOriginalCents", "vencimentoFatura") SELECT "astreaId", "campanhaId", "casoId", "categoriaId", "centroCustoId", "clienteId", "contaId", "createdAt", "dataLancamento", "dataPagamento", "dataVencimento", "descricao", "entradaOriginalAstreaId", "geradoPorApp", "id", "isAnomalia", "origem", "pagoPara", "recorrenteParentId", "responsavel", "status", "subTipo", "tipo", "updatedAt", "valorCents", "valorOriginalCents", "vencimentoFatura" FROM "Lancamento";
DROP TABLE "Lancamento";
ALTER TABLE "new_Lancamento" RENAME TO "Lancamento";
CREATE UNIQUE INDEX "Lancamento_astreaId_key" ON "Lancamento"("astreaId");
CREATE INDEX "Lancamento_tipo_status_idx" ON "Lancamento"("tipo", "status");
CREATE INDEX "Lancamento_dataVencimento_idx" ON "Lancamento"("dataVencimento");
CREATE INDEX "Lancamento_dataPagamento_idx" ON "Lancamento"("dataPagamento");
CREATE INDEX "Lancamento_processoId_idx" ON "Lancamento"("processoId");
CREATE TABLE "new_Tarefa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "astreaId" TEXT,
    "titulo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "prio" INTEGER NOT NULL DEFAULT 4,
    "projeto" TEXT NOT NULL DEFAULT 'inbox',
    "data" DATETIME,
    "hora" TEXT,
    "prazo" DATETIME,
    "notes" TEXT,
    "reminder" TEXT,
    "recur" TEXT,
    "ai" BOOLEAN NOT NULL DEFAULT false,
    "subtasks" TEXT NOT NULL DEFAULT '[]',
    "dor" TEXT NOT NULL DEFAULT '[]',
    "dod" TEXT NOT NULL DEFAULT '[]',
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "responsavelId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "clienteId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tarefa" ("ai", "astreaId", "casoId", "clienteId", "createdAt", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "projeto", "recur", "reminder", "responsavelId", "status", "subtasks", "titulo", "updatedAt") SELECT "ai", "astreaId", "casoId", "clienteId", "createdAt", "data", "dod", "done", "dor", "geradoPorApp", "hora", "id", "notes", "ordem", "origem", "prazo", "prio", "projeto", "recur", "reminder", "responsavelId", "status", "subtasks", "titulo", "updatedAt" FROM "Tarefa";
DROP TABLE "Tarefa";
ALTER TABLE "new_Tarefa" RENAME TO "Tarefa";
CREATE UNIQUE INDEX "Tarefa_astreaId_key" ON "Tarefa"("astreaId");
CREATE INDEX "Tarefa_status_idx" ON "Tarefa"("status");
CREATE INDEX "Tarefa_responsavelId_idx" ON "Tarefa"("responsavelId");
CREATE INDEX "Tarefa_prazo_idx" ON "Tarefa"("prazo");
CREATE INDEX "Tarefa_data_idx" ON "Tarefa"("data");
CREATE INDEX "Tarefa_processoId_idx" ON "Tarefa"("processoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Processo_numeroCnj_key" ON "Processo"("numeroCnj");

-- CreateIndex
CREATE INDEX "Processo_casoId_idx" ON "Processo"("casoId");

-- CreateIndex
CREATE INDEX "Processo_status_idx" ON "Processo"("status");

-- CreateIndex
CREATE INDEX "Processo_responsavelUserId_idx" ON "Processo"("responsavelUserId");

-- CreateIndex
CREATE INDEX "Parte_clienteId_idx" ON "Parte"("clienteId");

-- CreateIndex
CREATE INDEX "Parte_documento_idx" ON "Parte"("documento");

-- CreateIndex
CREATE INDEX "ParteProcesso_processoId_idx" ON "ParteProcesso"("processoId");

-- CreateIndex
CREATE INDEX "ParteProcesso_parteId_idx" ON "ParteProcesso"("parteId");

-- CreateIndex
CREATE UNIQUE INDEX "ParteProcesso_processoId_parteId_papel_key" ON "ParteProcesso"("processoId", "parteId", "papel");

-- CreateIndex
CREATE UNIQUE INDEX "Andamento_externalId_key" ON "Andamento"("externalId");

-- CreateIndex
CREATE INDEX "Andamento_processoId_idx" ON "Andamento"("processoId");

-- CreateIndex
CREATE INDEX "Andamento_data_idx" ON "Andamento"("data");

-- CreateIndex
CREATE INDEX "Andamento_relevante_idx" ON "Andamento"("relevante");

-- CreateIndex
CREATE UNIQUE INDEX "Publicacao_externalId_key" ON "Publicacao"("externalId");

-- CreateIndex
CREATE INDEX "Publicacao_processoId_idx" ON "Publicacao"("processoId");

-- CreateIndex
CREATE INDEX "Publicacao_statusTriagem_idx" ON "Publicacao"("statusTriagem");

-- CreateIndex
CREATE INDEX "Publicacao_dataPublicacao_idx" ON "Publicacao"("dataPublicacao");

-- CreateIndex
CREATE INDEX "Prazo_processoId_idx" ON "Prazo"("processoId");

-- CreateIndex
CREATE INDEX "Prazo_status_idx" ON "Prazo"("status");

-- CreateIndex
CREATE INDEX "Prazo_dataFatal_idx" ON "Prazo"("dataFatal");

-- CreateIndex
CREATE INDEX "Prazo_responsavelUserId_idx" ON "Prazo"("responsavelUserId");

-- CreateIndex
CREATE INDEX "Feriado_data_idx" ON "Feriado"("data");

-- CreateIndex
CREATE UNIQUE INDEX "Feriado_data_abrangencia_uf_tribunal_key" ON "Feriado"("data", "abrangencia", "uf", "tribunal");

-- CreateIndex
CREATE INDEX "SuspensaoPrazo_de_idx" ON "SuspensaoPrazo"("de");

-- CreateIndex
CREATE UNIQUE INDEX "Notificacao_dedupeKey_key" ON "Notificacao"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notificacao_userEmail_lida_idx" ON "Notificacao"("userEmail", "lida");

-- CreateIndex
CREATE INDEX "Notificacao_createdAt_idx" ON "Notificacao"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentoVersao_documentoId_idx" ON "DocumentoVersao"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoVersao_documentoId_versao_key" ON "DocumentoVersao"("documentoId", "versao");

-- CreateIndex
CREATE INDEX "Anotacao_casoId_idx" ON "Anotacao"("casoId");

-- CreateIndex
CREATE INDEX "Anotacao_processoId_idx" ON "Anotacao"("processoId");
