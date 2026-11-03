-- Informações fixadas (escrita à mão a partir do `prisma migrate diff`; validada em PGlite).
--
-- Uma nota FIXADA aparece em todas as tarefas do cliente (ClienteAnotacao), do caso
-- ou do projeto interno (Anotacao). Registra quem fixou / editou por último e a
-- tarefa cujo comentário virou a nota. Anotacao ganha o vínculo com o projeto
-- INTERNO do quadro de Tarefas.

-- AlterTable
ALTER TABLE "ClienteAnotacao" ADD COLUMN     "editadoEm" TIMESTAMP(3),
ADD COLUMN     "editadoPor" TEXT,
ADD COLUMN     "fixadoEm" TIMESTAMP(3),
ADD COLUMN     "fixadoPor" TEXT,
ADD COLUMN     "origemTarefaId" INTEGER;

-- AlterTable
ALTER TABLE "Anotacao" ADD COLUMN     "editadoEm" TIMESTAMP(3),
ADD COLUMN     "editadoPor" TEXT,
ADD COLUMN     "fixado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fixadoEm" TIMESTAMP(3),
ADD COLUMN     "fixadoPor" TEXT,
ADD COLUMN     "origemTarefaId" INTEGER,
ADD COLUMN     "projetoId" INTEGER;

-- CreateIndex
CREATE INDEX "Anotacao_projetoId_idx" ON "Anotacao"("projetoId");

-- AddForeignKey
ALTER TABLE "ClienteAnotacao" ADD CONSTRAINT "ClienteAnotacao_origemTarefaId_fkey" FOREIGN KEY ("origemTarefaId") REFERENCES "Tarefa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacao" ADD CONSTRAINT "Anotacao_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacao" ADD CONSTRAINT "Anotacao_origemTarefaId_fkey" FOREIGN KEY ("origemTarefaId") REFERENCES "Tarefa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dados: notas de cliente que já estavam fixadas passam a ter "quem/quando fixou"
-- (o melhor que se sabe: o autor, na data da nota).
UPDATE "ClienteAnotacao" SET "fixadoEm" = "createdAt", "fixadoPor" = "autor"
WHERE "fixado" = true AND "fixadoEm" IS NULL;
