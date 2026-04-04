-- Billing Core: provider e tipo na tabela de cobranças
ALTER TABLE "cobrancas" ADD COLUMN "provider" VARCHAR(20);
ALTER TABLE "cobrancas" ADD COLUMN "tipo" VARCHAR(20);
