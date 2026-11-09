-- Despesa 100% de UM sócio (escrita à mão; ADITIVA — uma coluna anulável, um
-- índice e uma FK. Nenhuma linha existente muda: com a coluna nula, o acerto
-- entre sócios continua dividindo toda despesa 50/50, exatamente como hoje).
--
-- Para que serve: pró-labore, anuidade da OAB, custa de um caso de um só sócio.
-- Com `socioResponsavelId` preenchido, o acerto lança a cota INTEIRA naquele
-- sócio em vez de dividir — e quando ele é o próprio pagador a despesa sai do
-- acerto por construção (cota = pago), que é o caso do pró-labore.

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "socioResponsavelId" INTEGER;

-- CreateIndex
CREATE INDEX "Lancamento_socioResponsavelId_idx" ON "Lancamento"("socioResponsavelId");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_socioResponsavelId_fkey" FOREIGN KEY ("socioResponsavelId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
