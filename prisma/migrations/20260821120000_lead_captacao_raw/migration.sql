-- Corpo cru do submit de captação, preservado sem normalização.
-- Aditiva: 1 coluna anulável, sem rebuild de tabela e sem backfill (leads
-- existentes ficam com NULL, que é exatamente "não foi capturado por aqui").
ALTER TABLE "Lead" ADD COLUMN "captacaoRaw" TEXT;
