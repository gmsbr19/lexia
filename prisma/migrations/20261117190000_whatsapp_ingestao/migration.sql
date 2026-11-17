-- WhatsApp fase 3 (ingestão) — migração ADITIVA: 1 tabela nova, 2 colunas
-- nullable e 2 índices. Nenhuma coluna existente é tocada, nenhum dado se move.
--
-- WhatsappMidia guarda os BYTES da mídia em tabela PRÓPRIA para que nenhuma
-- consulta de mensagem os arraste por descuido. É caixa de entrada: o Claude
-- baixa pelo MCP, arquiva onde quiser e os bytes são apagados, ficando só o
-- metadado (tipo/mime/nome/tamanho) na mensagem.

-- AlterTable
ALTER TABLE "WhatsappChat" ADD COLUMN     "monitoradoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WhatsappMensagem" ADD COLUMN     "midiaTamanho" INTEGER;

-- CreateTable
CREATE TABLE "WhatsappMidia" (
    "mensagemId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "dados" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMidia_pkey" PRIMARY KEY ("mensagemId")
);

-- CreateIndex
CREATE INDEX "WhatsappMidia_userId_criadoEm_idx" ON "WhatsappMidia"("userId", "criadoEm");

-- CreateIndex
CREATE INDEX "WhatsappMensagem_chatId_enviadaEm_idx" ON "WhatsappMensagem"("chatId", "enviadaEm");

-- AddForeignKey
ALTER TABLE "WhatsappMidia" ADD CONSTRAINT "WhatsappMidia_mensagemId_fkey" FOREIGN KEY ("mensagemId") REFERENCES "WhatsappMensagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMidia" ADD CONSTRAINT "WhatsappMidia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
