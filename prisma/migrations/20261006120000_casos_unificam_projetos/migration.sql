-- Unificação Projeto → Caso (out/2026).
-- Cada Projeto vivo do quadro de Tarefas vira um Caso (ou é mesclado ao caso que já
-- representa) e as tarefas passam a apontar para o caso via "Tarefa"."casoId".
-- Os "baldes" por área (chave 'area-%') e os projetos excluídos se desfazem: as
-- tarefas deles ficam "Sem caso". NADA é dropado: a tabela "Projeto" e a coluna
-- "Tarefa"."projetoId" ficam DORMENTES; "Projeto"."casoId" passa a guardar o caso de
-- destino da conversão (usado pelos redirects de /projetos/<id>).

-- 0) As fotos do "Desfazer" (janela de 10 min) referenciam projetos — descartar.
DELETE FROM "TarefaAcao";

-- 1) Estrutura
ALTER TABLE "Caso" ADD COLUMN "cor" TEXT,
ADD COLUMN "descricao" TEXT,
ADD COLUMN "modeloOrigemId" INTEGER,
ADD COLUMN "nomeCurto" TEXT,
ADD COLUMN "prazo" TIMESTAMP(3);

CREATE INDEX "Tarefa_casoId_idx" ON "Tarefa"("casoId");

ALTER TABLE "Caso" ADD CONSTRAINT "Caso_modeloOrigemId_fkey" FOREIGN KEY ("modeloOrigemId") REFERENCES "ProjetoModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) Classifica cada projeto uma única vez:
--    balde    = "area-*" (agrupador antigo por área, não é caso)
--    excluido = projeto já excluído
--    mesclar  = já aponta para um caso vivo, OU existe exatamente 1 caso vivo do mesmo
--               cliente com o mesmo título (sem diferenciar maiúsculas/espaços)
--    criar    = o resto vira um caso novo
CREATE TEMP TABLE "_lexia_proj" AS
SELECT p."id",
  CASE
    WHEN p."chave" LIKE 'area-%' THEN 'balde'
    WHEN p."excluidoEm" IS NOT NULL THEN 'excluido'
    WHEN cl."id" IS NOT NULL OR d.n = 1 THEN 'mesclar'
    ELSE 'criar'
  END AS destino,
  COALESCE(cl."id", CASE WHEN d.n = 1 THEN d.id END) AS caso_alvo
FROM "Projeto" p
LEFT JOIN "Caso" cl ON cl."id" = p."casoId" AND cl."excluidoEm" IS NULL
LEFT JOIN LATERAL (
  SELECT count(*)::int AS n, min(c2."id") AS id
  FROM "Caso" c2
  WHERE p."clienteId" IS NOT NULL
    AND c2."excluidoEm" IS NULL
    AND c2."clientePrincipalId" = p."clienteId"
    AND lower(btrim(c2."titulo")) = lower(btrim(p."nome"))
) d ON true;

-- 3) Baldes e projetos excluídos: as tarefas ficam "Sem caso" (o grupo era do
--    projeto e some). Um "casoId" legado que a tarefa já tinha é mantido.
UPDATE "Tarefa" t SET "grupo" = NULL
FROM "_lexia_proj" x
WHERE t."projetoId" = x."id" AND x.destino IN ('balde', 'excluido') AND t."grupo" IS NOT NULL;

-- 4) Mesclar: preenche SÓ os campos vazios do caso. Se vários projetos caem no mesmo
--    caso, vence o de menor id. O cliente só é preenchido se não quebrar a regra
--    contrato ↔ cliente (contrato sem cliente ou do mesmo cliente).
WITH src AS (
  SELECT DISTINCT ON (x.caso_alvo)
    x.caso_alvo, p."nomeCurto", p."cor", p."descricao", p."prazo", p."modeloOrigemId",
    p."area", p."responsavelId", p."clienteId"
  FROM "_lexia_proj" x
  JOIN "Projeto" p ON p."id" = x."id"
  WHERE x.destino = 'mesclar'
  ORDER BY x.caso_alvo, p."id"
)
UPDATE "Caso" c SET
  "nomeCurto" = COALESCE(c."nomeCurto", NULLIF(btrim(s."nomeCurto"), '')),
  "cor" = COALESCE(c."cor", s."cor"),
  "descricao" = COALESCE(c."descricao", s."descricao"),
  "prazo" = COALESCE(c."prazo", s."prazo"),
  "modeloOrigemId" = COALESCE(c."modeloOrigemId", s."modeloOrigemId"),
  "area" = COALESCE(c."area", s."area"),
  "responsavelUserId" = COALESCE(c."responsavelUserId", s."responsavelId"),
  "clientePrincipalId" = CASE
    WHEN c."clientePrincipalId" IS NOT NULL OR s."clienteId" IS NULL THEN c."clientePrincipalId"
    WHEN c."contratoId" IS NULL THEN s."clienteId"
    WHEN (SELECT k."clienteId" FROM "Contrato" k WHERE k."id" = c."contratoId") IS NULL THEN s."clienteId"
    WHEN (SELECT k."clienteId" FROM "Contrato" k WHERE k."id" = c."contratoId") = s."clienteId" THEN s."clienteId"
    ELSE c."clientePrincipalId"
  END
FROM src s
WHERE c."id" = s.caso_alvo;

-- 5) Criar: um caso novo por projeto. A chave sintética torna o passo idempotente.
INSERT INTO "Caso" (
  "astreaId", "titulo", "tipo", "area", "status", "responsavelUserId", "clientePrincipalId",
  "dataCriacao", "nomeCurto", "cor", "descricao", "prazo", "modeloOrigemId"
)
SELECT
  'app-caso-proj-' || p."id",
  COALESCE(NULLIF(btrim(p."nome"), ''), NULLIF(btrim(p."nomeCurto"), ''), 'Caso ' || p."id"),
  'consultivo',
  p."area",
  CASE WHEN p."arquivadoEm" IS NOT NULL THEN 'Arquivado' ELSE 'Ativo' END,
  p."responsavelId",
  p."clienteId",
  p."createdAt",
  NULLIF(btrim(p."nomeCurto"), ''),
  p."cor",
  p."descricao",
  p."prazo",
  p."modeloOrigemId"
FROM "_lexia_proj" x
JOIN "Projeto" p ON p."id" = x."id"
WHERE x.destino = 'criar'
ON CONFLICT ("astreaId") DO NOTHING;

UPDATE "_lexia_proj" x SET caso_alvo = c."id"
FROM "Caso" c
WHERE x.destino = 'criar' AND c."astreaId" = 'app-caso-proj-' || x."id";

-- 6) Registro da conversão no projeto dormente (redirects /projetos/<id>, ?projeto=)
UPDATE "Projeto" p SET "casoId" = x.caso_alvo
FROM "_lexia_proj" x
WHERE x."id" = p."id" AND x.destino IN ('mesclar', 'criar') AND x.caso_alvo IS NOT NULL;

-- 7) Histórico: a tarefa tinha um vínculo legado com OUTRO caso, que será substituído
--    pelo caso do projeto.
INSERT INTO "TarefaHistorico" ("tarefaId", "autorId", "texto", "createdAt")
SELECT t."id", NULL,
  left('Vínculo anterior com o caso "' || c."titulo" || '" substituído pelo caso do projeto', 300),
  CURRENT_TIMESTAMP
FROM "Tarefa" t
JOIN "_lexia_proj" x ON x."id" = t."projetoId" AND x.destino IN ('mesclar', 'criar')
JOIN "Caso" c ON c."id" = t."casoId"
WHERE x.caso_alvo IS NOT NULL AND t."casoId" <> x.caso_alvo;

-- 8) As tarefas seguem o projeto
UPDATE "Tarefa" t SET "casoId" = x.caso_alvo
FROM "_lexia_proj" x
WHERE t."projetoId" = x."id" AND x.destino IN ('mesclar', 'criar') AND x.caso_alvo IS NOT NULL;

-- 9) Tarefa de processo sem caso herda o caso do processo
UPDATE "Tarefa" t SET "casoId" = pr."casoId"
FROM "Processo" pr
WHERE t."processoId" = pr."id" AND t."casoId" IS NULL AND pr."excluidoEm" IS NULL;

DROP TABLE "_lexia_proj";
