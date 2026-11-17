-- WhatsApp (Baileys, multiusuário) — fase 2 do módulo: escrita à mão; ADITIVA.
-- 4 tabelas NOVAS; nenhuma linha, coluna ou índice existente é tocado, então
-- todo o resto do app segue byte a byte como hoje.
--
-- Toda tabela tem `userId` porque o isolamento por usuário é a regra central do
-- módulo: nem sócio nem admin lê a conversa de outro (docs/whatsapp-baileys.md).
-- Cascade em User: desligar/apagar um usuário leva a sessão, as credenciais, as
-- conversas e as mensagens dele embora. `WhatsappChat.clienteId` é SET NULL —
-- excluir um contato desfaz o vínculo, nunca apaga a conversa.
--
-- ATENÇÃO: `WhatsappAuth.valor` guarda o auth state do Baileys CIFRADO
-- (AES-256-GCM, chave só em WHATSAPP_AUTH_KEY, nunca no banco). Quem tem a linha
-- em claro tem o WhatsApp da pessoa — ver src/lib/whatsapp/cripto.ts.
-- WhatsappChat e WhatsappMensagem já nascem aqui, mas a INGESTÃO (gravar
-- mensagens e mídias) é a fase 3: a fase 2 fecha na conexão.

-- CreateTable
CREATE TABLE "WhatsappSessao" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'desconectado',
    "numero" TEXT,
    "conectadoEm" TIMESTAMP(3),
    "ultimoErro" TEXT,
    "pareamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappAuth" (
    "userId" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappAuth_pkey" PRIMARY KEY ("userId","chave")
);

-- CreateTable
CREATE TABLE "WhatsappChat" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jid" TEXT NOT NULL,
    "telefone" TEXT,
    "nome" TEXT,
    "grupo" BOOLEAN NOT NULL DEFAULT false,
    "monitorar" BOOLEAN NOT NULL DEFAULT false,
    "clienteId" INTEGER,
    "vinculo" TEXT,
    "ultimaMensagemEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMensagem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatId" INTEGER NOT NULL,
    "msgId" TEXT NOT NULL,
    "deMim" BOOLEAN NOT NULL,
    "autorJid" TEXT,
    "autorNome" TEXT,
    "tipo" TEXT NOT NULL,
    "texto" TEXT,
    "midiaPath" TEXT,
    "midiaMime" TEXT,
    "midiaNome" TEXT,
    "enviadaEm" TIMESTAMP(3) NOT NULL,
    "tratadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSessao_userId_key" ON "WhatsappSessao"("userId");

-- CreateIndex
CREATE INDEX "WhatsappChat_userId_ultimaMensagemEm_idx" ON "WhatsappChat"("userId", "ultimaMensagemEm");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappChat_userId_jid_key" ON "WhatsappChat"("userId", "jid");

-- CreateIndex
CREATE INDEX "WhatsappMensagem_userId_enviadaEm_idx" ON "WhatsappMensagem"("userId", "enviadaEm");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappMensagem_chatId_msgId_key" ON "WhatsappMensagem"("chatId", "msgId");

-- AddForeignKey
ALTER TABLE "WhatsappSessao" ADD CONSTRAINT "WhatsappSessao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappAuth" ADD CONSTRAINT "WhatsappAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappChat" ADD CONSTRAINT "WhatsappChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappChat" ADD CONSTRAINT "WhatsappChat_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMensagem" ADD CONSTRAINT "WhatsappMensagem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMensagem" ADD CONSTRAINT "WhatsappMensagem_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "WhatsappChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
