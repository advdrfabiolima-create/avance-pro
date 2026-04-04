-- Conciliação Financeira
CREATE TABLE "billing_reconciliations" (
  "id"               TEXT NOT NULL,
  "cobranca_id"      TEXT NOT NULL,
  "movimento_id"     TEXT,
  "provider"         VARCHAR(20),
  "status"           VARCHAR(20) NOT NULL DEFAULT 'pendente',
  "match_type"       VARCHAR(20),
  "notas"            TEXT,
  "reconciliado_em"  TIMESTAMP(3),
  "reconciliado_por" VARCHAR(100),
  "criado_em"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "billing_reconciliations_pkey" PRIMARY KEY ("id")
);

-- Unique: uma cobrança tem no máximo uma reconciliação
CREATE UNIQUE INDEX "billing_reconciliations_cobranca_id_key" ON "billing_reconciliations"("cobranca_id");

-- FK: cobrança
ALTER TABLE "billing_reconciliations"
  ADD CONSTRAINT "billing_reconciliations_cobranca_id_fkey"
  FOREIGN KEY ("cobranca_id") REFERENCES "cobrancas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK: movimento (opcional)
ALTER TABLE "billing_reconciliations"
  ADD CONSTRAINT "billing_reconciliations_movimento_id_fkey"
  FOREIGN KEY ("movimento_id") REFERENCES "movimentos_financeiros"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
