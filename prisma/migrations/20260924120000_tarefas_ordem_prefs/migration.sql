-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tarefasPrefs" TEXT;

-- CreateTable
CREATE TABLE "TarefaOrdem" (
    "userId" INTEGER NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "ordem" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TarefaOrdem_pkey" PRIMARY KEY ("userId","tarefaId")
);

-- CreateIndex
CREATE INDEX "TarefaOrdem_tarefaId_idx" ON "TarefaOrdem"("tarefaId");

-- AddForeignKey
ALTER TABLE "TarefaOrdem" ADD CONSTRAINT "TarefaOrdem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaOrdem" ADD CONSTRAINT "TarefaOrdem_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

