-- Quantos dias de histórico gravar no pareamento, por usuário. NULL = o padrão
-- do código (HISTORICO_SYNC_DIAS). Não limita o pedido sob demanda.
--
-- ADITIVA: uma coluna nullable, nada existente é tocado.
-- AlterTable
ALTER TABLE "WhatsappSessao" ADD COLUMN     "historicoDias" INTEGER;
