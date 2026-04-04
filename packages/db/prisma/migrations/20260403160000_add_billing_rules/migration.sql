-- CreateTable: billing_rules
CREATE TABLE "billing_rules" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" VARCHAR(150) NOT NULL,
    "event_type" VARCHAR(20) NOT NULL,
    "offset_days" INTEGER NOT NULL DEFAULT 0,
    "channel" VARCHAR(30) NOT NULL,
    "template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: billing_action_logs
CREATE TABLE "billing_action_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "cobranca_id" TEXT NOT NULL,
    "billing_rule_id" TEXT,
    "action_type" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(30) NOT NULL,
    "message_snapshot" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggered_by" VARCHAR(100),
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_action_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "billing_action_logs"
    ADD CONSTRAINT "billing_action_logs_cobranca_id_fkey"
    FOREIGN KEY ("cobranca_id") REFERENCES "cobrancas"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_action_logs"
    ADD CONSTRAINT "billing_action_logs_billing_rule_id_fkey"
    FOREIGN KEY ("billing_rule_id") REFERENCES "billing_rules"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: regras padrão da régua de cobrança
INSERT INTO "billing_rules" ("id", "name", "event_type", "offset_days", "channel", "template", "is_active", "updated_at") VALUES
(
  gen_random_uuid()::text,
  'Lembrete amigável',
  'before',
  3,
  'whatsapp',
  'Olá, {{nome_responsavel}}! Passando para lembrar que a mensalidade de {{nome_aluno}} no valor de {{valor}} vence em {{vencimento}}. Qualquer dúvida, estamos à disposição! 😊',
  true,
  CURRENT_TIMESTAMP
),
(
  gen_random_uuid()::text,
  'Aviso de vencimento',
  'on_due',
  0,
  'internal',
  'A cobrança de {{nome_aluno}} vence hoje ({{valor}}). Verifique se o pagamento foi realizado.',
  true,
  CURRENT_TIMESTAMP
),
(
  gen_random_uuid()::text,
  'Cobrança por atraso',
  'after',
  2,
  'whatsapp',
  'Olá, {{nome_responsavel}}. Identificamos que a mensalidade de {{nome_aluno}} no valor de {{valor}}, com vencimento em {{vencimento}}, ainda está em aberto. Podemos ajudar com os dados de pagamento?',
  true,
  CURRENT_TIMESTAMP
),
(
  gen_random_uuid()::text,
  'Alerta de inadimplência',
  'after',
  7,
  'internal',
  'ATENÇÃO: A cobrança de {{nome_aluno}} está em atraso há 7 dias ({{valor}}). Requer ação manual.',
  true,
  CURRENT_TIMESTAMP
);
