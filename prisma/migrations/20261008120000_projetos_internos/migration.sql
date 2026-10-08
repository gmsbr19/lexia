-- Projetos INTERNOS (escrita à mão; validada em PGlite).
--
-- A unificação 20261006120000 fez o caso ser o "projeto" do quadro. Agora uma
-- tarefa liga a um caso do cliente (Tarefa.casoId) OU a um projeto interno do
-- escritório (Tarefa.projetoId) — nunca aos dois. Projeto interno vivo =
-- "Projeto"."casoId" IS NULL AND "excluidoEm" IS NULL. Sem mudança de estrutura:
-- as colunas já existem; aqui só se ajustam os dados.

-- 1. Fotos do "Desfazer" (janela de 10 min) mudam de forma.
DELETE FROM "TarefaAcao";

-- 2. Baldes por área já foram dissolvidos na unificação: marcá-los excluídos para
--    não reaparecerem como projetos internos.
UPDATE "Projeto" SET "excluidoEm" = now(), "updatedAt" = now()
WHERE "chave" LIKE 'area-%' AND "excluidoEm" IS NULL;

-- 3. Casos criados pela unificação a partir de projeto SEM cliente e que nunca
--    ganharam nada de caso voltam a ser projetos internos.
CREATE TEMP TABLE "_lexia_rev" AS
SELECT p."id" AS projeto_id, c."id" AS caso_id
FROM "Projeto" p
JOIN "Caso" c ON c."id" = p."casoId" AND c."astreaId" = 'app-caso-proj-' || p."id"
WHERE p."clienteId" IS NULL
  AND c."clientePrincipalId" IS NULL
  AND c."excluidoEm" IS NULL
  AND c."contratoId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Processo" x WHERE x."casoId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "Lancamento" x WHERE x."casoId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "Documento" x WHERE x."casoId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "Lead" x WHERE x."casoId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "Evento" x WHERE x."casoId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "Anotacao" x WHERE x."casoId" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "CasoResponsavel" x WHERE x."casoId" = c."id");

-- 4. O projeto recebe o estado ATUAL do caso (o usuário pode tê-lo editado em /casos).
UPDATE "Projeto" p SET
  "nomeCurto"      = COALESCE(NULLIF(btrim(c."nomeCurto"), ''), left(btrim(c."titulo"), 24)),
  "nome"           = c."titulo",
  "cor"            = COALESCE(c."cor", p."cor"),
  "descricao"      = c."descricao",
  "prazo"          = c."prazo",
  "responsavelId"  = c."responsavelUserId",
  "modeloOrigemId" = c."modeloOrigemId",
  "arquivadoEm"    = CASE WHEN lower(btrim(COALESCE(c."status", ''))) = 'arquivado' THEN COALESCE(p."arquivadoEm", now()) ELSE NULL END,
  "casoId"         = NULL,
  "excluidoEm"     = NULL,
  "updatedAt"      = now()
FROM "_lexia_rev" r
JOIN "Caso" c ON c."id" = r.caso_id
WHERE p."id" = r.projeto_id;

-- 5. As tarefas seguem o projeto.
UPDATE "Tarefa" t SET "projetoId" = r.projeto_id, "casoId" = NULL, "updatedAt" = now()
FROM "_lexia_rev" r
WHERE t."casoId" = r.caso_id;

-- 6. O caso de passagem sai (soft-delete; nada mais aponta para ele).
UPDATE "Caso" c SET "excluidoEm" = now()
FROM "_lexia_rev" r
WHERE c."id" = r.caso_id;

-- 7. O projetoId antigo (dormente) só fica onde aponta para projeto interno vivo
--    e a tarefa não tem caso — casoId XOR projetoId.
UPDATE "Tarefa" t SET "projetoId" = NULL
WHERE t."projetoId" IS NOT NULL
  AND (
    t."casoId" IS NOT NULL
    OR NOT EXISTS (
      SELECT 1 FROM "Projeto" p
      WHERE p."id" = t."projetoId" AND p."casoId" IS NULL AND p."excluidoEm" IS NULL
    )
  );

DROP TABLE "_lexia_rev";
