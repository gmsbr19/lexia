-- CreateTable
CREATE TABLE "TarefaComentario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tarefaId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "editadoEm" DATETIME,
    "excluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TarefaComentario_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TarefaComentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TarefaComentario_tarefaId_idx" ON "TarefaComentario"("tarefaId");
