-- Âncora do histórico por conversa: a mensagem mais ANTIGA que o worker já viu
-- passar nela. É o que o `fetchMessageHistory` do Baileys exige para pedir as
-- mensagens anteriores a ela. Metadado apenas (id opaco + quem enviou + data),
-- nunca conteúdo — guardado inclusive para conversas não monitoradas, porque é
-- isso que permite marcar uma conversa hoje e ainda alcançar o passado dela.
--
-- ADITIVA: duas colunas nullable, nada existente é tocado.
-- AlterTable
ALTER TABLE "WhatsappChat" ADD COLUMN     "ancoraChave" TEXT,
ADD COLUMN     "ancoraEm" TIMESTAMP(3);
