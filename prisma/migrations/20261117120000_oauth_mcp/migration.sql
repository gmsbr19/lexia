-- OAuth 2.1 para o servidor MCP (escrita à mão; ADITIVA — 3 tabelas NOVAS, nenhuma
-- linha ou coluna existente é tocada, então a rota antiga do MCP (token estático,
-- usuário de serviço) continua funcionando byte a byte como hoje).
--
-- Para que serve: cada pessoa passa a autorizar o conector do claude.ai com o
-- PRÓPRIO login do Lexia, e toda chamada ao MCP resolve para um User.id — o
-- pré-requisito do módulo de WhatsApp (isolamento por usuário). Segredo nenhum
-- fica em claro: só o sha256, como em ConviteAcesso.tokenHash.

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT,
    "nome" TEXT NOT NULL,
    "redirectUris" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUsoEm" TIMESTAMP(3),

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthCode" (
    "id" SERIAL NOT NULL,
    "codeHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "resource" TEXT,
    "scope" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "resource" TEXT,
    "scope" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),
    "rotacionadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthCode_codeHash_key" ON "OAuthCode"("codeHash");

-- CreateIndex
CREATE INDEX "OAuthCode_userId_idx" ON "OAuthCode"("userId");

-- CreateIndex
CREATE INDEX "OAuthCode_clientId_idx" ON "OAuthCode"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_tokenHash_key" ON "OAuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OAuthToken_userId_idx" ON "OAuthToken"("userId");

-- CreateIndex
CREATE INDEX "OAuthToken_clientId_idx" ON "OAuthToken"("clientId");

-- CreateIndex
CREATE INDEX "OAuthToken_tipo_expiraEm_idx" ON "OAuthToken"("tipo", "expiraEm");

-- AddForeignKey
ALTER TABLE "OAuthCode" ADD CONSTRAINT "OAuthCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthCode" ADD CONSTRAINT "OAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
