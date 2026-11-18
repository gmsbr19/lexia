-- Fila do pedido de histórico, por conversa.
--
-- ADITIVA: uma coluna nullable. null = fora da fila, que é o estado de TODA
-- linha existente — nenhum pedido é disparado por esta migração.
--
-- Marcar uma conversa passa a enfileirar o pedido do passado dela; o worker
-- drena a fila uma de cada vez, com intervalo, e limpa a coluna ao pedir (ou ao
-- pular, se a conversa tiver sido desmarcada no meio do caminho).
-- AlterTable
ALTER TABLE "WhatsappChat" ADD COLUMN     "historicoFila" TIMESTAMP(3);
