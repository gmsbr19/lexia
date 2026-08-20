-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'socio',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "notifPrefs" TEXT,
    "lexiaPrefs" TEXT,
    "crmViewPrefs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConviteAcesso" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "payload" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "astreaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conta" (
    "id" SERIAL NOT NULL,
    "astreaId" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'astrea',
    "kind" TEXT NOT NULL DEFAULT 'banco',
    "titular" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "valorInicialCents" INTEGER NOT NULL DEFAULT 0,
    "dataInicio" TIMESTAMP(3),
    "agencia" TEXT,
    "numero" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroCusto" (
    "id" SERIAL NOT NULL,
    "astreaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CentroCusto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "astreaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "apelido" TEXT,
    "tipo" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "simplesNacional" BOOLEAN NOT NULL DEFAULT false,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "emails" TEXT,
    "telefones" TEXT,
    "origem" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteAnotacao" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "autor" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'nota',
    "acao" TEXT,
    "ate" TIMESTAMP(3),
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteAnotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caso" (
    "id" SERIAL NOT NULL,
    "astreaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "area" TEXT,
    "status" TEXT,
    "responsavel" TEXT,
    "responsavelUserId" INTEGER,
    "clientePrincipalId" INTEGER,
    "valorCausaCents" INTEGER,
    "instancia" TEXT,
    "tipoAcao" TEXT,
    "tribunal" TEXT,
    "numeroProcesso" TEXT,
    "vara" TEXT,
    "dataDistribuicao" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3),
    "ultimaMovimentacao" TIMESTAMP(3),
    "excluidoEm" TIMESTAMP(3),
    "contratoId" INTEGER,

    CONSTRAINT "Caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER,
    "titulo" TEXT,
    "dataFechamento" TIMESTAMP(3) NOT NULL,
    "valorTotalCents" INTEGER,
    "area" TEXT,
    "observacoes" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasoResponsavel" (
    "id" SERIAL NOT NULL,
    "casoId" INTEGER NOT NULL,
    "contaId" INTEGER NOT NULL,
    "percentual" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasoResponsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" SERIAL NOT NULL,
    "astreaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subTipo" TEXT,
    "descricao" TEXT,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "valorOriginalCents" INTEGER NOT NULL DEFAULT 0,
    "pagoPara" TEXT,
    "responsavel" TEXT,
    "dataLancamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "dataPagamento" TIMESTAMP(3),
    "vencimentoFatura" TIMESTAMP(3),
    "entradaOriginalAstreaId" TEXT,
    "recorrenteParentId" INTEGER,
    "isAnomalia" BOOLEAN NOT NULL DEFAULT false,
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT false,
    "origem" TEXT NOT NULL DEFAULT 'astrea',
    "contaId" INTEGER,
    "categoriaId" INTEGER,
    "centroCustoId" INTEGER,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "naturezaLegal" TEXT,
    "tipoHonorario" TEXT,
    "valorLiquidoCents" INTEGER,
    "metodoPagamento" TEXT,
    "campanhaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustoFixo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "categoria" TEXT NOT NULL,
    "diaVencimento" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "contaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" SERIAL NOT NULL,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "dataMovimento" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "contaOrigemId" INTEGER NOT NULL,
    "contaDestinoId" INTEGER NOT NULL,
    "lancSaidaId" INTEGER,
    "lancEntradaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campanha" (
    "id" SERIAL NOT NULL,
    "plataforma" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "externalId" TEXT,
    "objetivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "area" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "genionsId" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'outro',
    "campanhaId" INTEGER,
    "area" TEXT,
    "etapa" TEXT NOT NULL DEFAULT 'novo',
    "valorEstimadoCents" INTEGER,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataConversao" TIMESTAMP(3),
    "motivoPerda" TEXT,
    "motivoPerdaCategoria" TEXT,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "lancamentoId" INTEGER,
    "responsavelUserId" INTEGER,
    "proximaAcaoEm" TIMESTAMP(3),
    "proximaAcaoNota" TEXT,
    "temperatura" TEXT,
    "observacoes" TEXT,
    "potencialFinanceiro" TEXT,
    "urgenciaNivel" TEXT,
    "poderDecisao" TEXT,
    "jurisdicao" TEXT,
    "viabilidade" TEXT,
    "contratoEnviadoEm" TIMESTAMP(3),
    "perdidoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "gclid" TEXT,
    "wbraid" TEXT,
    "gbraid" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "matchtype" TEXT,
    "device" TEXT,
    "network" TEXT,
    "landingPageUrl" TEXT,
    "referrer" TEXT,
    "cliqueEm" TIMESTAMP(3),
    "protocolo" TEXT,
    "captacaoKey" TEXT,
    "landingPageId" INTEGER,
    "triagem" TEXT,
    "consentimentoEm" TIMESTAMP(3),
    "consentimentoVersao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "dominios" TEXT NOT NULL,
    "chaveHash" TEXT NOT NULL,
    "chavePrefixo" TEXT NOT NULL,
    "campanhaPadraoId" INTEGER,
    "areaPadrao" TEXT,
    "responsavelPadraoUserId" INTEGER,
    "consentimentoVersao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "revogadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversaoEvento" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "ocorreuEm" TIMESTAMP(3) NOT NULL,
    "valorCents" INTEGER NOT NULL DEFAULT 0,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "motivoDescarte" TEXT,
    "conversionActionId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversaoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversaoAjuste" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "novoValorCents" INTEGER,
    "motivo" TEXT,

    CONSTRAINT "ConversaoAjuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OportunidadeAtividade" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT,
    "descricao" TEXT,
    "resultado" TEXT,
    "toqueNumero" INTEGER,
    "sinais" TEXT NOT NULL DEFAULT '[]',
    "ocorreuEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OportunidadeAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" SERIAL NOT NULL,
    "astreaId" TEXT,
    "titulo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "prio" INTEGER NOT NULL DEFAULT 4,
    "projeto" TEXT NOT NULL DEFAULT 'inbox',
    "data" TIMESTAMP(3),
    "hora" TEXT,
    "prazo" TIMESTAMP(3),
    "notes" TEXT,
    "reminder" TEXT,
    "recur" TEXT,
    "ai" BOOLEAN NOT NULL DEFAULT false,
    "subtasks" TEXT NOT NULL DEFAULT '[]',
    "dor" TEXT NOT NULL DEFAULT '[]',
    "dod" TEXT NOT NULL DEFAULT '[]',
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "responsavelId" INTEGER,
    "criadoPorId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "clienteId" INTEGER,
    "leadId" INTEGER,
    "projetoId" INTEGER,
    "secaoId" INTEGER,
    "recorrenteDeId" INTEGER,
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'reuniao',
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "local" TEXT,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmado',
    "responsavelId" INTEGER,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "leadId" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "geradoPorApp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "tipo" TEXT,
    "formato" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "payload" TEXT,
    "conteudo" TEXT,
    "valores" TEXT,
    "clienteId" INTEGER,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "templateId" INTEGER,
    "timbradoId" INTEGER,
    "contratoId" INTEGER,
    "criadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoTemplate" (
    "id" SERIAL NOT NULL,
    "chave" TEXT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Outro',
    "descricao" TEXT,
    "conteudo" TEXT,
    "placeholders" TEXT NOT NULL DEFAULT '[]',
    "tipoEstruturado" TEXT,
    "timbradoId" INTEGER,
    "icone" TEXT,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usoCount" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoPor" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timbrado" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "mimeType" TEXT,
    "margemTop" INTEGER NOT NULL DEFAULT 30,
    "margemRight" INTEGER NOT NULL DEFAULT 25,
    "margemBottom" INTEGER NOT NULL DEFAULT 30,
    "margemLeft" INTEGER NOT NULL DEFAULT 25,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "criadoPor" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timbrado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "LexiaUso" (
    "id" SERIAL NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userEmail" TEXT,
    "recurso" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LexiaUso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexiaConversa" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT,
    "fixada" BOOLEAN NOT NULL DEFAULT false,
    "contexto" TEXT,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LexiaConversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexiaMensagem" (
    "id" SERIAL NOT NULL,
    "conversaId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "blocks" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "feedback" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LexiaMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexiaAnexo" (
    "id" SERIAL NOT NULL,
    "mensagemId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "storage" TEXT NOT NULL DEFAULT 'db',
    "data" TEXT,
    "ref" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LexiaAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexiaAcaoPendente" (
    "id" SERIAL NOT NULL,
    "conversaId" INTEGER NOT NULL,
    "userEmail" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'mutation',
    "toolName" TEXT NOT NULL,
    "toolUseId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "contexto" TEXT NOT NULL,
    "resultJson" TEXT,
    "respostaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "LexiaAcaoPendente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processo" (
    "id" SERIAL NOT NULL,
    "casoId" INTEGER NOT NULL,
    "numeroCnj" TEXT,
    "classe" TEXT,
    "assunto" TEXT,
    "valorCausaCents" INTEGER NOT NULL DEFAULT 0,
    "faseAtual" TEXT,
    "instancia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "vara" TEXT,
    "comarca" TEXT,
    "tribunal" TEXT,
    "uf" TEXT,
    "sistema" TEXT,
    "segredoJustica" BOOLEAN NOT NULL DEFAULT false,
    "dataDistribuicao" TIMESTAMP(3),
    "responsavelUserId" INTEGER,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parte" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "documento" TEXT,
    "clienteId" INTEGER,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParteProcesso" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "parteId" INTEGER NOT NULL,
    "papel" TEXT NOT NULL,
    "polo" TEXT NOT NULL,
    "ehCliente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParteProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Andamento" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT NOT NULL,
    "fonte" TEXT NOT NULL DEFAULT 'manual',
    "relevante" BOOLEAN NOT NULL DEFAULT false,
    "statusRevisao" TEXT NOT NULL DEFAULT 'novo',
    "revisadoEm" TIMESTAMP(3),
    "externalId" TEXT,
    "prazoId" INTEGER,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Andamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publicacao" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER,
    "dataDisponibilizacao" TIMESTAMP(3),
    "dataPublicacao" TIMESTAMP(3),
    "diario" TEXT,
    "conteudo" TEXT NOT NULL,
    "numeroProcessoBruto" TEXT,
    "oabBruto" TEXT,
    "statusTriagem" TEXT NOT NULL DEFAULT 'pendente',
    "prazoId" INTEGER,
    "externalId" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prazo" (
    "id" SERIAL NOT NULL,
    "processoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "dataPublicacao" TIMESTAMP(3),
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "quantidadeDias" INTEGER NOT NULL,
    "tipoContagem" TEXT NOT NULL DEFAULT 'uteis',
    "jurisdicao" TEXT,
    "dataFatal" TIMESTAMP(3) NOT NULL,
    "diasMargem" INTEGER NOT NULL DEFAULT 0,
    "dataInterna" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "responsavelUserId" INTEGER,
    "cumpridoEm" TIMESTAMP(3),
    "eventoId" INTEGER,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feriado" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "abrangencia" TEXT NOT NULL DEFAULT 'nacional',
    "uf" TEXT,
    "tribunal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feriado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspensaoPrazo" (
    "id" SERIAL NOT NULL,
    "de" TIMESTAMP(3) NOT NULL,
    "ate" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "jurisdicao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuspensaoPrazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "userEmail" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "refTipo" TEXT,
    "refId" INTEGER,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "modulo" TEXT,
    "prioridade" TEXT DEFAULT 'normal',
    "link" TEXT,
    "actorEmail" TEXT,
    "grupoKey" TEXT,
    "contador" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoVersao" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "versao" INTEGER NOT NULL,
    "nome" TEXT,
    "formato" TEXT,
    "payload" TEXT,
    "storage" TEXT NOT NULL DEFAULT 'db',
    "data" TEXT,
    "ref" TEXT,
    "tamanho" INTEGER,
    "mimeType" TEXT,
    "criadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoVersao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anotacao" (
    "id" SERIAL NOT NULL,
    "casoId" INTEGER,
    "processoId" INTEGER,
    "autor" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "interno" BOOLEAN NOT NULL DEFAULT true,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaComentario" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "editadoEm" TIMESTAMP(3),
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarefaComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OabMonitorada" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "advogadoNome" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OabMonitorada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecucaoCaptura" (
    "id" SERIAL NOT NULL,
    "fonte" TEXT NOT NULL,
    "escopo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),
    "janelaDe" TIMESTAMP(3),
    "janelaAte" TIMESTAMP(3),
    "encontrados" INTEGER NOT NULL DEFAULT 0,
    "criados" INTEGER NOT NULL DEFAULT 0,
    "ignorados" INTEGER NOT NULL DEFAULT 0,
    "semVinculo" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecucaoCaptura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" SERIAL NOT NULL,
    "chave" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "cor" TEXT,
    "icone" TEXT,
    "area" TEXT,
    "prazo" TIMESTAMP(3),
    "responsavelId" INTEGER,
    "casoId" INTEGER,
    "clienteId" INTEGER,
    "templateOrigemId" INTEGER,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetoSecao" (
    "id" SERIAL NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoSecao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetoTemplate" (
    "id" SERIAL NOT NULL,
    "chave" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "area" TEXT,
    "cor" TEXT,
    "icone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetoTemplateSecao" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoTemplateSecao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetoTemplateTarefa" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prio" INTEGER NOT NULL DEFAULT 3,
    "responsavelPlaceholder" TEXT,
    "offsetDias" INTEGER NOT NULL DEFAULT 0,
    "base" TEXT NOT NULL DEFAULT 'inicio',
    "dor" TEXT NOT NULL DEFAULT '[]',
    "dod" TEXT NOT NULL DEFAULT '[]',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "secaoOrdem" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoTemplateTarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaDireito" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaDireito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ConviteAcesso_tokenHash_key" ON "ConviteAcesso"("tokenHash");

-- CreateIndex
CREATE INDEX "ConviteAcesso_userId_idx" ON "ConviteAcesso"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_ts_idx" ON "AuditLog"("ts");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_astreaId_key" ON "Categoria"("astreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Conta_astreaId_key" ON "Conta"("astreaId");

-- CreateIndex
CREATE UNIQUE INDEX "CentroCusto_astreaId_key" ON "CentroCusto"("astreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_astreaId_key" ON "Cliente"("astreaId");

-- CreateIndex
CREATE INDEX "Cliente_tipo_idx" ON "Cliente"("tipo");

-- CreateIndex
CREATE INDEX "Cliente_classificacao_idx" ON "Cliente"("classificacao");

-- CreateIndex
CREATE INDEX "ClienteAnotacao_clienteId_idx" ON "ClienteAnotacao"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Caso_astreaId_key" ON "Caso"("astreaId");

-- CreateIndex
CREATE INDEX "Caso_status_idx" ON "Caso"("status");

-- CreateIndex
CREATE INDEX "Caso_tipo_idx" ON "Caso"("tipo");

-- CreateIndex
CREATE INDEX "Caso_area_idx" ON "Caso"("area");

-- CreateIndex
CREATE INDEX "Caso_responsavelUserId_idx" ON "Caso"("responsavelUserId");

-- CreateIndex
CREATE INDEX "Caso_contratoId_idx" ON "Caso"("contratoId");

-- CreateIndex
CREATE INDEX "Contrato_clienteId_idx" ON "Contrato"("clienteId");

-- CreateIndex
CREATE INDEX "Contrato_dataFechamento_idx" ON "Contrato"("dataFechamento");

-- CreateIndex
CREATE INDEX "Contrato_excluidoEm_idx" ON "Contrato"("excluidoEm");

-- CreateIndex
CREATE INDEX "CasoResponsavel_casoId_idx" ON "CasoResponsavel"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "CasoResponsavel_casoId_contaId_key" ON "CasoResponsavel"("casoId", "contaId");

-- CreateIndex
CREATE UNIQUE INDEX "Lancamento_astreaId_key" ON "Lancamento"("astreaId");

-- CreateIndex
CREATE INDEX "Lancamento_tipo_status_idx" ON "Lancamento"("tipo", "status");

-- CreateIndex
CREATE INDEX "Lancamento_subTipo_idx" ON "Lancamento"("subTipo");

-- CreateIndex
CREATE INDEX "Lancamento_dataVencimento_idx" ON "Lancamento"("dataVencimento");

-- CreateIndex
CREATE INDEX "Lancamento_dataPagamento_idx" ON "Lancamento"("dataPagamento");

-- CreateIndex
CREATE INDEX "Lancamento_processoId_idx" ON "Lancamento"("processoId");

-- CreateIndex
CREATE INDEX "Lancamento_campanhaId_idx" ON "Lancamento"("campanhaId");

-- CreateIndex
CREATE INDEX "Lancamento_clienteId_idx" ON "Lancamento"("clienteId");

-- CreateIndex
CREATE INDEX "Lancamento_casoId_idx" ON "Lancamento"("casoId");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_lancSaidaId_key" ON "Transferencia"("lancSaidaId");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_lancEntradaId_key" ON "Transferencia"("lancEntradaId");

-- CreateIndex
CREATE INDEX "Transferencia_dataMovimento_idx" ON "Transferencia"("dataMovimento");

-- CreateIndex
CREATE INDEX "Transferencia_contaOrigemId_idx" ON "Transferencia"("contaOrigemId");

-- CreateIndex
CREATE INDEX "Transferencia_contaDestinoId_idx" ON "Transferencia"("contaDestinoId");

-- CreateIndex
CREATE INDEX "Campanha_area_idx" ON "Campanha"("area");

-- CreateIndex
CREATE UNIQUE INDEX "Campanha_plataforma_nome_key" ON "Campanha"("plataforma", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_genionsId_key" ON "Lead"("genionsId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_protocolo_key" ON "Lead"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_captacaoKey_key" ON "Lead"("captacaoKey");

-- CreateIndex
CREATE INDEX "Lead_etapa_idx" ON "Lead"("etapa");

-- CreateIndex
CREATE INDEX "Lead_origem_idx" ON "Lead"("origem");

-- CreateIndex
CREATE INDEX "Lead_area_idx" ON "Lead"("area");

-- CreateIndex
CREATE INDEX "Lead_campanhaId_idx" ON "Lead"("campanhaId");

-- CreateIndex
CREATE INDEX "Lead_dataEntrada_idx" ON "Lead"("dataEntrada");

-- CreateIndex
CREATE INDEX "Lead_responsavelUserId_idx" ON "Lead"("responsavelUserId");

-- CreateIndex
CREATE INDEX "Lead_proximaAcaoEm_idx" ON "Lead"("proximaAcaoEm");

-- CreateIndex
CREATE INDEX "Lead_gclid_idx" ON "Lead"("gclid");

-- CreateIndex
CREATE INDEX "Lead_cliqueEm_idx" ON "Lead"("cliqueEm");

-- CreateIndex
CREATE INDEX "Lead_landingPageId_idx" ON "Lead"("landingPageId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_chaveHash_key" ON "LandingPage"("chaveHash");

-- CreateIndex
CREATE INDEX "LandingPage_ativo_idx" ON "LandingPage"("ativo");

-- CreateIndex
CREATE INDEX "ConversaoEvento_status_idx" ON "ConversaoEvento"("status");

-- CreateIndex
CREATE INDEX "ConversaoEvento_ocorreuEm_idx" ON "ConversaoEvento"("ocorreuEm");

-- CreateIndex
CREATE UNIQUE INDEX "ConversaoEvento_leadId_tipo_key" ON "ConversaoEvento"("leadId", "tipo");

-- CreateIndex
CREATE INDEX "ConversaoAjuste_eventoId_idx" ON "ConversaoAjuste"("eventoId");

-- CreateIndex
CREATE INDEX "ConversaoAjuste_tipo_idx" ON "ConversaoAjuste"("tipo");

-- CreateIndex
CREATE INDEX "OportunidadeAtividade_leadId_idx" ON "OportunidadeAtividade"("leadId");

-- CreateIndex
CREATE INDEX "OportunidadeAtividade_ocorreuEm_idx" ON "OportunidadeAtividade"("ocorreuEm");

-- CreateIndex
CREATE UNIQUE INDEX "Tarefa_astreaId_key" ON "Tarefa"("astreaId");

-- CreateIndex
CREATE INDEX "Tarefa_status_idx" ON "Tarefa"("status");

-- CreateIndex
CREATE INDEX "Tarefa_responsavelId_idx" ON "Tarefa"("responsavelId");

-- CreateIndex
CREATE INDEX "Tarefa_criadoPorId_idx" ON "Tarefa"("criadoPorId");

-- CreateIndex
CREATE INDEX "Tarefa_prazo_idx" ON "Tarefa"("prazo");

-- CreateIndex
CREATE INDEX "Tarefa_data_idx" ON "Tarefa"("data");

-- CreateIndex
CREATE INDEX "Tarefa_processoId_idx" ON "Tarefa"("processoId");

-- CreateIndex
CREATE INDEX "Tarefa_projetoId_idx" ON "Tarefa"("projetoId");

-- CreateIndex
CREATE INDEX "Tarefa_secaoId_idx" ON "Tarefa"("secaoId");

-- CreateIndex
CREATE INDEX "Tarefa_leadId_idx" ON "Tarefa"("leadId");

-- CreateIndex
CREATE INDEX "Tarefa_recorrenteDeId_idx" ON "Tarefa"("recorrenteDeId");

-- CreateIndex
CREATE INDEX "Evento_dataInicio_idx" ON "Evento"("dataInicio");

-- CreateIndex
CREATE INDEX "Evento_clienteId_idx" ON "Evento"("clienteId");

-- CreateIndex
CREATE INDEX "Evento_casoId_idx" ON "Evento"("casoId");

-- CreateIndex
CREATE INDEX "Evento_responsavelId_idx" ON "Evento"("responsavelId");

-- CreateIndex
CREATE INDEX "Evento_processoId_idx" ON "Evento"("processoId");

-- CreateIndex
CREATE INDEX "Evento_leadId_idx" ON "Evento"("leadId");

-- CreateIndex
CREATE INDEX "Documento_clienteId_idx" ON "Documento"("clienteId");

-- CreateIndex
CREATE INDEX "Documento_casoId_idx" ON "Documento"("casoId");

-- CreateIndex
CREATE INDEX "Documento_status_idx" ON "Documento"("status");

-- CreateIndex
CREATE INDEX "Documento_processoId_idx" ON "Documento"("processoId");

-- CreateIndex
CREATE INDEX "Documento_templateId_idx" ON "Documento"("templateId");

-- CreateIndex
CREATE INDEX "Documento_contratoId_idx" ON "Documento"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoTemplate_chave_key" ON "DocumentoTemplate"("chave");

-- CreateIndex
CREATE INDEX "DocumentoTemplate_categoria_idx" ON "DocumentoTemplate"("categoria");

-- CreateIndex
CREATE INDEX "DocumentoTemplate_ativo_idx" ON "DocumentoTemplate"("ativo");

-- CreateIndex
CREATE INDEX "DocumentoTemplate_excluidoEm_idx" ON "DocumentoTemplate"("excluidoEm");

-- CreateIndex
CREATE INDEX "Timbrado_excluidoEm_idx" ON "Timbrado"("excluidoEm");

-- CreateIndex
CREATE INDEX "LexiaUso_criadoEm_idx" ON "LexiaUso"("criadoEm");

-- CreateIndex
CREATE INDEX "LexiaUso_recurso_idx" ON "LexiaUso"("recurso");

-- CreateIndex
CREATE INDEX "LexiaUso_modelo_idx" ON "LexiaUso"("modelo");

-- CreateIndex
CREATE INDEX "LexiaConversa_userEmail_updatedAt_idx" ON "LexiaConversa"("userEmail", "updatedAt");

-- CreateIndex
CREATE INDEX "LexiaMensagem_conversaId_idx" ON "LexiaMensagem"("conversaId");

-- CreateIndex
CREATE INDEX "LexiaAnexo_mensagemId_idx" ON "LexiaAnexo"("mensagemId");

-- CreateIndex
CREATE INDEX "LexiaAcaoPendente_conversaId_status_idx" ON "LexiaAcaoPendente"("conversaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Processo_numeroCnj_key" ON "Processo"("numeroCnj");

-- CreateIndex
CREATE INDEX "Processo_casoId_idx" ON "Processo"("casoId");

-- CreateIndex
CREATE INDEX "Processo_status_idx" ON "Processo"("status");

-- CreateIndex
CREATE INDEX "Processo_responsavelUserId_idx" ON "Processo"("responsavelUserId");

-- CreateIndex
CREATE INDEX "Parte_clienteId_idx" ON "Parte"("clienteId");

-- CreateIndex
CREATE INDEX "Parte_documento_idx" ON "Parte"("documento");

-- CreateIndex
CREATE INDEX "ParteProcesso_processoId_idx" ON "ParteProcesso"("processoId");

-- CreateIndex
CREATE INDEX "ParteProcesso_parteId_idx" ON "ParteProcesso"("parteId");

-- CreateIndex
CREATE UNIQUE INDEX "ParteProcesso_processoId_parteId_papel_key" ON "ParteProcesso"("processoId", "parteId", "papel");

-- CreateIndex
CREATE UNIQUE INDEX "Andamento_externalId_key" ON "Andamento"("externalId");

-- CreateIndex
CREATE INDEX "Andamento_processoId_idx" ON "Andamento"("processoId");

-- CreateIndex
CREATE INDEX "Andamento_data_idx" ON "Andamento"("data");

-- CreateIndex
CREATE INDEX "Andamento_relevante_idx" ON "Andamento"("relevante");

-- CreateIndex
CREATE INDEX "Andamento_statusRevisao_idx" ON "Andamento"("statusRevisao");

-- CreateIndex
CREATE UNIQUE INDEX "Publicacao_externalId_key" ON "Publicacao"("externalId");

-- CreateIndex
CREATE INDEX "Publicacao_processoId_idx" ON "Publicacao"("processoId");

-- CreateIndex
CREATE INDEX "Publicacao_statusTriagem_idx" ON "Publicacao"("statusTriagem");

-- CreateIndex
CREATE INDEX "Publicacao_dataPublicacao_idx" ON "Publicacao"("dataPublicacao");

-- CreateIndex
CREATE INDEX "Prazo_processoId_idx" ON "Prazo"("processoId");

-- CreateIndex
CREATE INDEX "Prazo_status_idx" ON "Prazo"("status");

-- CreateIndex
CREATE INDEX "Prazo_dataFatal_idx" ON "Prazo"("dataFatal");

-- CreateIndex
CREATE INDEX "Prazo_responsavelUserId_idx" ON "Prazo"("responsavelUserId");

-- CreateIndex
CREATE INDEX "Feriado_data_idx" ON "Feriado"("data");

-- CreateIndex
CREATE UNIQUE INDEX "Feriado_data_abrangencia_uf_tribunal_key" ON "Feriado"("data", "abrangencia", "uf", "tribunal");

-- CreateIndex
CREATE INDEX "SuspensaoPrazo_de_idx" ON "SuspensaoPrazo"("de");

-- CreateIndex
CREATE UNIQUE INDEX "Notificacao_dedupeKey_key" ON "Notificacao"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notificacao_userEmail_lida_idx" ON "Notificacao"("userEmail", "lida");

-- CreateIndex
CREATE INDEX "Notificacao_createdAt_idx" ON "Notificacao"("createdAt");

-- CreateIndex
CREATE INDEX "Notificacao_userEmail_modulo_idx" ON "Notificacao"("userEmail", "modulo");

-- CreateIndex
CREATE INDEX "Notificacao_userEmail_grupoKey_idx" ON "Notificacao"("userEmail", "grupoKey");

-- CreateIndex
CREATE INDEX "DocumentoVersao_documentoId_idx" ON "DocumentoVersao"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoVersao_documentoId_versao_key" ON "DocumentoVersao"("documentoId", "versao");

-- CreateIndex
CREATE INDEX "Anotacao_casoId_idx" ON "Anotacao"("casoId");

-- CreateIndex
CREATE INDEX "Anotacao_processoId_idx" ON "Anotacao"("processoId");

-- CreateIndex
CREATE INDEX "TarefaComentario_tarefaId_idx" ON "TarefaComentario"("tarefaId");

-- CreateIndex
CREATE UNIQUE INDEX "OabMonitorada_numero_uf_key" ON "OabMonitorada"("numero", "uf");

-- CreateIndex
CREATE INDEX "ExecucaoCaptura_fonte_createdAt_idx" ON "ExecucaoCaptura"("fonte", "createdAt");

-- CreateIndex
CREATE INDEX "ExecucaoCaptura_status_idx" ON "ExecucaoCaptura"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Projeto_chave_key" ON "Projeto"("chave");

-- CreateIndex
CREATE INDEX "Projeto_status_idx" ON "Projeto"("status");

-- CreateIndex
CREATE INDEX "Projeto_area_idx" ON "Projeto"("area");

-- CreateIndex
CREATE INDEX "Projeto_responsavelId_idx" ON "Projeto"("responsavelId");

-- CreateIndex
CREATE INDEX "Projeto_casoId_idx" ON "Projeto"("casoId");

-- CreateIndex
CREATE INDEX "Projeto_clienteId_idx" ON "Projeto"("clienteId");

-- CreateIndex
CREATE INDEX "Projeto_excluidoEm_idx" ON "Projeto"("excluidoEm");

-- CreateIndex
CREATE INDEX "ProjetoSecao_projetoId_idx" ON "ProjetoSecao"("projetoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjetoTemplate_chave_key" ON "ProjetoTemplate"("chave");

-- CreateIndex
CREATE INDEX "ProjetoTemplate_ativo_idx" ON "ProjetoTemplate"("ativo");

-- CreateIndex
CREATE INDEX "ProjetoTemplateSecao_templateId_idx" ON "ProjetoTemplateSecao"("templateId");

-- CreateIndex
CREATE INDEX "ProjetoTemplateTarefa_templateId_idx" ON "ProjetoTemplateTarefa"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaDireito_chave_key" ON "AreaDireito"("chave");

-- CreateIndex
CREATE INDEX "AreaDireito_excluidoEm_idx" ON "AreaDireito"("excluidoEm");

-- AddForeignKey
ALTER TABLE "ConviteAcesso" ADD CONSTRAINT "ConviteAcesso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAnotacao" ADD CONSTRAINT "ClienteAnotacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_clientePrincipalId_fkey" FOREIGN KEY ("clientePrincipalId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasoResponsavel" ADD CONSTRAINT "CasoResponsavel_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasoResponsavel" ADD CONSTRAINT "CasoResponsavel_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_recorrenteParentId_fkey" FOREIGN KEY ("recorrenteParentId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "CentroCusto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustoFixo" ADD CONSTRAINT "CustoFixo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_contaOrigemId_fkey" FOREIGN KEY ("contaOrigemId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_contaDestinoId_fkey" FOREIGN KEY ("contaDestinoId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_lancSaidaId_fkey" FOREIGN KEY ("lancSaidaId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_lancEntradaId_fkey" FOREIGN KEY ("lancEntradaId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_campanhaPadraoId_fkey" FOREIGN KEY ("campanhaPadraoId") REFERENCES "Campanha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_responsavelPadraoUserId_fkey" FOREIGN KEY ("responsavelPadraoUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaoEvento" ADD CONSTRAINT "ConversaoEvento_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaoAjuste" ADD CONSTRAINT "ConversaoAjuste_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "ConversaoEvento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OportunidadeAtividade" ADD CONSTRAINT "OportunidadeAtividade_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OportunidadeAtividade" ADD CONSTRAINT "OportunidadeAtividade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_secaoId_fkey" FOREIGN KEY ("secaoId") REFERENCES "ProjetoSecao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_recorrenteDeId_fkey" FOREIGN KEY ("recorrenteDeId") REFERENCES "Tarefa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentoTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_timbradoId_fkey" FOREIGN KEY ("timbradoId") REFERENCES "Timbrado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoTemplate" ADD CONSTRAINT "DocumentoTemplate_timbradoId_fkey" FOREIGN KEY ("timbradoId") REFERENCES "Timbrado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiaMensagem" ADD CONSTRAINT "LexiaMensagem_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "LexiaConversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiaAnexo" ADD CONSTRAINT "LexiaAnexo_mensagemId_fkey" FOREIGN KEY ("mensagemId") REFERENCES "LexiaMensagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexiaAcaoPendente" ADD CONSTRAINT "LexiaAcaoPendente_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "LexiaConversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parte" ADD CONSTRAINT "Parte_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteProcesso" ADD CONSTRAINT "ParteProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteProcesso" ADD CONSTRAINT "ParteProcesso_parteId_fkey" FOREIGN KEY ("parteId") REFERENCES "Parte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Andamento" ADD CONSTRAINT "Andamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Andamento" ADD CONSTRAINT "Andamento_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publicacao" ADD CONSTRAINT "Publicacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publicacao" ADD CONSTRAINT "Publicacao_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "Prazo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVersao" ADD CONSTRAINT "DocumentoVersao_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacao" ADD CONSTRAINT "Anotacao_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacao" ADD CONSTRAINT "Anotacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaComentario" ADD CONSTRAINT "TarefaComentario_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaComentario" ADD CONSTRAINT "TarefaComentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_templateOrigemId_fkey" FOREIGN KEY ("templateOrigemId") REFERENCES "ProjetoTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoSecao" ADD CONSTRAINT "ProjetoSecao_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoTemplateSecao" ADD CONSTRAINT "ProjetoTemplateSecao_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjetoTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoTemplateTarefa" ADD CONSTRAINT "ProjetoTemplateTarefa_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjetoTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
