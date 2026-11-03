-- Redesign do módulo Tarefas: quadro único, prazo obrigatório, prazo fatal,
-- grupos livres dentro do projeto, ligações "só começa depois de", histórico,
-- anexos, registro de ações p/ "Desfazer" e modelos de projeto por papéis/passos.
--
-- Ordem: (1) tabelas novas; (2) colunas novas; (3) CONVERSÃO dos dados existentes
-- (nada é perdido exceto o que o redesign aboliu: prioridade, data planejada/hora,
-- lembrete, DoR/DoD — decisão do usuário: descartar); (4) só então os drops.

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) Tabelas novas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "TarefaLigacao" (
    "anteriorId" INTEGER NOT NULL,
    "seguinteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaLigacao_pkey" PRIMARY KEY ("anteriorId","seguinteId")
);

CREATE TABLE "TarefaHistorico" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "autorId" INTEGER,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaHistorico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TarefaAnexo" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT,
    "mimeType" TEXT,
    "tamanho" INTEGER,
    "data" TEXT,
    "autorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaAnexo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TarefaAcao" (
    "id" TEXT NOT NULL,
    "autorId" INTEGER,
    "descricao" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desfeitaEm" TIMESTAMP(3),

    CONSTRAINT "TarefaAcao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjetoModelo" (
    "id" SERIAL NOT NULL,
    "chave" TEXT,
    "nome" TEXT NOT NULL,
    "area" TEXT,
    "palavraGrupo" TEXT NOT NULL DEFAULT 'Grupo',
    "sufixoGrupo" TEXT NOT NULL DEFAULT '',
    "papeis" TEXT NOT NULL DEFAULT '[]',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoModelo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjetoModeloPasso" (
    "id" SERIAL NOT NULL,
    "modeloId" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "papelId" TEXT,
    "diasAntes" INTEGER NOT NULL DEFAULT 0,
    "prazoFatal" BOOLEAN NOT NULL DEFAULT false,
    "anteriores" TEXT NOT NULL DEFAULT '[]',
    "checklist" TEXT NOT NULL DEFAULT '[]',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoModeloPasso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TarefaLigacao_seguinteId_idx" ON "TarefaLigacao"("seguinteId");
CREATE INDEX "TarefaHistorico_tarefaId_idx" ON "TarefaHistorico"("tarefaId");
CREATE INDEX "TarefaAnexo_tarefaId_idx" ON "TarefaAnexo"("tarefaId");
CREATE INDEX "TarefaAcao_createdAt_idx" ON "TarefaAcao"("createdAt");
CREATE UNIQUE INDEX "ProjetoModelo_chave_key" ON "ProjetoModelo"("chave");
CREATE INDEX "ProjetoModelo_excluidoEm_idx" ON "ProjetoModelo"("excluidoEm");
CREATE INDEX "ProjetoModeloPasso_modeloId_idx" ON "ProjetoModeloPasso"("modeloId");

ALTER TABLE "TarefaLigacao" ADD CONSTRAINT "TarefaLigacao_anteriorId_fkey" FOREIGN KEY ("anteriorId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TarefaLigacao" ADD CONSTRAINT "TarefaLigacao_seguinteId_fkey" FOREIGN KEY ("seguinteId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TarefaHistorico" ADD CONSTRAINT "TarefaHistorico_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TarefaHistorico" ADD CONSTRAINT "TarefaHistorico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TarefaAnexo" ADD CONSTRAINT "TarefaAnexo_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TarefaAnexo" ADD CONSTRAINT "TarefaAnexo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjetoModeloPasso" ADD CONSTRAINT "ProjetoModeloPasso_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ProjetoModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) Colunas novas (sem drops ainda — a conversão abaixo ainda lê as antigas)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "Tarefa" ADD COLUMN "aguardandoTexto" TEXT,
ADD COLUMN "checklist" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "grupo" TEXT,
ADD COLUMN "prazoFatal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Projeto" ADD COLUMN "arquivadoEm" TIMESTAMP(3),
ADD COLUMN "modeloOrigemId" INTEGER,
ADD COLUMN "nomeCurto" TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) Conversão dos dados existentes
-- ─────────────────────────────────────────────────────────────────────────────

-- JSON tolerante: texto inválido vira '[]' em vez de abortar a migração.
CREATE FUNCTION pg_temp.lexia_try_json(t TEXT) RETURNS JSON AS $$
BEGIN
  RETURN t::json;
EXCEPTION WHEN others THEN
  RETURN '[]'::json;
END;
$$ LANGUAGE plpgsql;

-- Status: 'review' (Em revisão) deixou de existir → Em andamento. Qualquer valor
-- desconhecido → A fazer. `done` segue espelhando status = 'done'.
UPDATE "Tarefa" SET "status" = 'doing' WHERE "status" = 'review';
UPDATE "Tarefa" SET "status" = 'todo' WHERE "status" NOT IN ('todo', 'doing', 'wait', 'done');
UPDATE "Tarefa" SET "done" = ("status" = 'done');
-- Concluídas antigas sem data de conclusão: usa a última alteração.
UPDATE "Tarefa" SET "concluidoEm" = "updatedAt" WHERE "status" = 'done' AND "concluidoEm" IS NULL;
UPDATE "Tarefa" SET "concluidoEm" = NULL WHERE "status" <> 'done';

-- Prazo obrigatório: prazo antigo → senão a data planejada → senão a regra padrão
-- (sexta-feira da semana; sábado/domingo → sexta seguinte), no fuso do escritório,
-- gravada ao meio-dia (mesma convenção date-only do app). Para tarefas ABERTAS a
-- semana de referência é a da migração (ou a da criação, se mais recente) — senão
-- toda tarefa antiga sem prazo nasceria vencida de uma vez (resumo, painel da
-- Equipe e notificações inflados). Concluídas usam a semana de criação.
UPDATE "Tarefa" SET "prazo" = "data" WHERE "prazo" IS NULL AND "data" IS NOT NULL;
WITH base AS (
  SELECT "id",
    CASE WHEN "status" = 'done'
      THEN ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date)
      ELSE GREATEST(
        ((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date),
        ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date)
      )
    END AS d
  FROM "Tarefa" WHERE "prazo" IS NULL
)
UPDATE "Tarefa" t
SET "prazo" = (b.d + (CASE EXTRACT(ISODOW FROM b.d)::int WHEN 6 THEN 6 WHEN 7 THEN 5 ELSE 5 - EXTRACT(ISODOW FROM b.d)::int END)) + TIME '12:00'
FROM base b
WHERE t."id" = b."id";

-- Subtarefas [{id,title,done}] → checklist [{id,texto,marcado}] (ordem preservada;
-- itens sem texto descartados). DoR/DoD são descartados (colunas caem abaixo).
UPDATE "Tarefa" t
SET "checklist" = COALESCE((
  SELECT json_agg(json_build_object(
      'id', COALESCE(NULLIF(x.e->>'id', ''), 'c' || x.ord),
      'texto', btrim(x.e->>'title'),
      'marcado', COALESCE(x.e->>'done', '') IN ('true', 't', '1')
    ) ORDER BY x.ord)::text
  FROM json_array_elements(
    CASE WHEN json_typeof(pg_temp.lexia_try_json(t."subtasks")) = 'array'
      THEN pg_temp.lexia_try_json(t."subtasks") ELSE '[]'::json END
  ) WITH ORDINALITY AS x(e, ord)
  WHERE json_typeof(x.e) = 'object' AND COALESCE(btrim(x.e->>'title'), '') <> ''
), '[]')
WHERE t."subtasks" IS NOT NULL AND btrim(t."subtasks") NOT IN ('', '[]');

-- Seção (coluna do projeto) → grupo (etiqueta livre dentro do projeto).
UPDATE "Tarefa" t SET "grupo" = s."nome"
FROM "ProjetoSecao" s
WHERE t."secaoId" = s."id" AND t."projetoId" = s."projetoId";

-- Repetição: rótulos "Não repete"/vazios viram NULL (sem regra).
UPDATE "Tarefa" SET "recur" = NULL
WHERE "recur" IS NOT NULL AND (btrim("recur") = '' OR lower(btrim("recur")) IN ('não repete', 'nao repete'));

-- "Caixa de entrada" (container sem significado no quadro único): as tarefas
-- viram "Sem projeto" e o container é excluído (soft-delete).
UPDATE "Tarefa" SET "projetoId" = NULL
WHERE "projetoId" IN (SELECT "id" FROM "Projeto" WHERE "chave" = 'area-inbox');
UPDATE "Projeto" SET "excluidoEm" = CURRENT_TIMESTAMP
WHERE "chave" = 'area-inbox' AND "excluidoEm" IS NULL;
-- Tarefas de projetos excluídos também são "Sem projeto" (grupo não faz sentido).
UPDATE "Tarefa" SET "grupo" = NULL
WHERE "projetoId" IS NULL OR "projetoId" IN (SELECT "id" FROM "Projeto" WHERE "excluidoEm" IS NOT NULL);

-- Projeto: nome curto (o usuário pode editar), cor garantida (uma das 6), e
-- arquivado/concluído → arquivadoEm.
UPDATE "Projeto" SET "nomeCurto" = CASE
  WHEN char_length(btrim("nome")) <= 16 THEN btrim("nome")
  ELSE split_part(btrim("nome"), ' ', 1)
END;
UPDATE "Projeto" SET "nomeCurto" = 'Projeto ' || "id" WHERE COALESCE(btrim("nomeCurto"), '') = '';
UPDATE "Projeto"
SET "cor" = (ARRAY['#2E7D6B', '#5A4F9A', '#9A6B2E', '#9A2E5A', '#7A8699', '#C0492F'])[("id" % 6) + 1]
WHERE "cor" IS NULL OR "cor" !~ '^#[0-9A-Fa-f]{6}$';
UPDATE "Projeto" SET "arquivadoEm" = "updatedAt" WHERE "status" IN ('arquivado', 'concluido');

-- Templates → Modelos (ids preservados, p/ a origem do projeto continuar válida).
-- Papel = cada "responsavelPlaceholder" distinto. Passos encadeados ("anterior")
-- viram ligações; o prazo relativo (dias ÚTEIS a partir do início) vira "dias antes
-- do prazo do grupo" (≈ dias corridos: úteis × 7/5).
WITH papeis AS (
  SELECT "templateId", "responsavelPlaceholder" AS rotulo,
         'papel-' || row_number() OVER (PARTITION BY "templateId" ORDER BY min("ordem"), min("id")) AS pid
  FROM "ProjetoTemplateTarefa"
  WHERE COALESCE(btrim("responsavelPlaceholder"), '') <> ''
  GROUP BY "templateId", "responsavelPlaceholder"
)
INSERT INTO "ProjetoModelo" ("id", "chave", "nome", "area", "palavraGrupo", "sufixoGrupo", "papeis", "ordem", "excluidoEm", "createdAt", "updatedAt")
SELECT t."id", t."chave", t."nome", t."area", 'Grupo', '',
       COALESCE((SELECT json_agg(json_build_object('id', p.pid, 'rotulo', p.rotulo, 'padraoUsuarioId', NULL) ORDER BY p.pid)::text
                 FROM papeis p WHERE p."templateId" = t."id"), '[]'),
       t."ordem",
       CASE WHEN t."ativo" = false THEN COALESCE(t."excluidoEm", CURRENT_TIMESTAMP) ELSE t."excluidoEm" END,
       t."createdAt", t."updatedAt"
FROM "ProjetoTemplate" t;

WITH RECURSIVE ord AS (
  SELECT i.*, row_number() OVER (PARTITION BY i."templateId" ORDER BY i."ordem", i."id") AS rn
  FROM "ProjetoTemplateTarefa" i
),
cum AS (
  SELECT o."templateId", o.rn, GREATEST(o."offsetDias", 0) AS c FROM ord o WHERE o.rn = 1
  UNION ALL
  SELECT o."templateId", o.rn,
         CASE WHEN o."base" = 'anterior' THEN cum.c + GREATEST(o."offsetDias", 0) ELSE GREATEST(o."offsetDias", 0) END
  FROM ord o JOIN cum ON o."templateId" = cum."templateId" AND o.rn = cum.rn + 1
),
mx AS (SELECT "templateId", MAX(c) AS m FROM cum GROUP BY "templateId"),
papeis AS (
  SELECT "templateId", "responsavelPlaceholder" AS rotulo,
         'papel-' || row_number() OVER (PARTITION BY "templateId" ORDER BY min("ordem"), min("id")) AS pid
  FROM "ProjetoTemplateTarefa"
  WHERE COALESCE(btrim("responsavelPlaceholder"), '') <> ''
  GROUP BY "templateId", "responsavelPlaceholder"
)
INSERT INTO "ProjetoModeloPasso" ("modeloId", "chave", "titulo", "papelId", "diasAntes", "prazoFatal", "anteriores", "checklist", "ordem", "createdAt", "updatedAt")
SELECT o."templateId", 'p' || o.rn, o."titulo", p.pid,
       ROUND((mx.m - cum.c) * 7.0 / 5)::int, false,
       CASE WHEN o."base" = 'anterior' AND o.rn > 1 THEN json_build_array('p' || (o.rn - 1))::text ELSE '[]' END,
       '[]', (o.rn - 1)::int, o."createdAt", o."updatedAt"
FROM ord o
JOIN cum ON cum."templateId" = o."templateId" AND cum.rn = o.rn
JOIN mx ON mx."templateId" = o."templateId"
LEFT JOIN papeis p ON p."templateId" = o."templateId" AND p.rotulo = o."responsavelPlaceholder";

SELECT setval(pg_get_serial_sequence('"ProjetoModelo"', 'id'), COALESCE((SELECT MAX("id") FROM "ProjetoModelo"), 0) + 1, false);

UPDATE "Projeto" SET "modeloOrigemId" = "templateOrigemId" WHERE "templateOrigemId" IS NOT NULL;

ALTER TABLE "Projeto" ALTER COLUMN "nomeCurto" SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- (4) Drops (o que o redesign aboliu)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "Tarefa" DROP CONSTRAINT "Tarefa_secaoId_fkey";
ALTER TABLE "Projeto" DROP CONSTRAINT "Projeto_templateOrigemId_fkey";
ALTER TABLE "ProjetoSecao" DROP CONSTRAINT "ProjetoSecao_projetoId_fkey";
ALTER TABLE "ProjetoTemplateSecao" DROP CONSTRAINT "ProjetoTemplateSecao_templateId_fkey";
ALTER TABLE "ProjetoTemplateTarefa" DROP CONSTRAINT "ProjetoTemplateTarefa_templateId_fkey";

DROP INDEX "Tarefa_data_idx";
DROP INDEX "Tarefa_secaoId_idx";
DROP INDEX "Projeto_status_idx";

ALTER TABLE "Tarefa" DROP COLUMN "ai",
DROP COLUMN "data",
DROP COLUMN "dod",
DROP COLUMN "dor",
DROP COLUMN "hora",
DROP COLUMN "ordem",
DROP COLUMN "prio",
DROP COLUMN "projeto",
DROP COLUMN "reminder",
DROP COLUMN "secaoId",
DROP COLUMN "subtasks",
ALTER COLUMN "prazo" SET NOT NULL;

ALTER TABLE "Projeto" DROP COLUMN "icone",
DROP COLUMN "ordem",
DROP COLUMN "status",
DROP COLUMN "templateOrigemId";

DROP TABLE "ProjetoSecao";
DROP TABLE "ProjetoTemplateSecao";
DROP TABLE "ProjetoTemplateTarefa";
DROP TABLE "ProjetoTemplate";

CREATE INDEX "Tarefa_concluidoEm_idx" ON "Tarefa"("concluidoEm");
CREATE INDEX "Projeto_arquivadoEm_idx" ON "Projeto"("arquivadoEm");

ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_modeloOrigemId_fkey" FOREIGN KEY ("modeloOrigemId") REFERENCES "ProjetoModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
