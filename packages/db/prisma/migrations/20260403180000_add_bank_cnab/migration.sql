-- CreateTable: bank_catalog
CREATE TABLE "bank_catalog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "cnab_support" VARCHAR(20) NOT NULL DEFAULT '',
    "cnab240_supported" BOOLEAN NOT NULL DEFAULT false,
    "cnab400_supported" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_catalog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bank_catalog_code_key" ON "bank_catalog"("code");

-- CreateTable: billing_bank_accounts
CREATE TABLE "billing_bank_accounts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "bank_code" VARCHAR(10) NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_name" VARCHAR(150) NOT NULL,
    "agreement_code" VARCHAR(50),
    "wallet_code" VARCHAR(10),
    "agency" VARCHAR(10) NOT NULL,
    "agency_digit" VARCHAR(2),
    "account_number" VARCHAR(20) NOT NULL,
    "account_digit" VARCHAR(2),
    "beneficiary_name" VARCHAR(100) NOT NULL,
    "beneficiary_document" VARCHAR(20) NOT NULL,
    "remittance_layout" VARCHAR(10) NOT NULL DEFAULT 'cnab240',
    "file_naming_pattern" VARCHAR(100),
    "sequential_file_number" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "protest_days" INTEGER NOT NULL DEFAULT 0,
    "auto_drop_days" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cnab_files
CREATE TABLE "cnab_files" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "bank_account_id" TEXT NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "file_name" VARCHAR(200) NOT NULL,
    "layout_type" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "total_records" INTEGER,
    "processed_count" INTEGER,
    "error_count" INTEGER,
    "generated_at" TIMESTAMP(3),
    "imported_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_by" VARCHAR(100),
    "metadata" TEXT,
    "raw_content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cnab_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cnab_occurrences
CREATE TABLE "cnab_occurrences" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "cnab_file_id" TEXT NOT NULL,
    "billing_charge_id" TEXT,
    "occurrence_code" VARCHAR(10) NOT NULL,
    "occurrence_description" VARCHAR(200) NOT NULL,
    "our_number" VARCHAR(50),
    "document_number" VARCHAR(50),
    "amount" DECIMAL(15,2),
    "paid_amount" DECIMAL(15,2),
    "occurrence_date" DATE,
    "credit_date" DATE,
    "raw_line" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cnab_occurrences_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add bankAccountId to cobrancas
ALTER TABLE "cobrancas" ADD COLUMN "bank_account_id" TEXT;

-- AddForeignKey
ALTER TABLE "billing_bank_accounts"
    ADD CONSTRAINT "billing_bank_accounts_bank_code_fkey"
    FOREIGN KEY ("bank_code") REFERENCES "bank_catalog"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cobrancas"
    ADD CONSTRAINT "cobrancas_bank_account_id_fkey"
    FOREIGN KEY ("bank_account_id") REFERENCES "billing_bank_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cnab_files"
    ADD CONSTRAINT "cnab_files_bank_account_id_fkey"
    FOREIGN KEY ("bank_account_id") REFERENCES "billing_bank_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cnab_occurrences"
    ADD CONSTRAINT "cnab_occurrences_cnab_file_id_fkey"
    FOREIGN KEY ("cnab_file_id") REFERENCES "cnab_files"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cnab_occurrences"
    ADD CONSTRAINT "cnab_occurrences_billing_charge_id_fkey"
    FOREIGN KEY ("billing_charge_id") REFERENCES "cobrancas"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: catálogo de bancos
INSERT INTO "bank_catalog" ("id","code","name","cnab_support","cnab240_supported","cnab400_supported","is_active","metadata","updated_at") VALUES
(gen_random_uuid()::text,'237','Bradesco','CNAB 240/400',true,true,true,'{"adapterStatus":"parser_inicial","homologacaoNecessaria":true,"obs":"Layout CNAB 240 v087 e CNAB 400 v84. Convênio obrigatório."}',CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'341','Itaú','CNAB 240/400',true,true,true,'{"adapterStatus":"parser_inicial","homologacaoNecessaria":true,"obs":"Layout CNAB 240 v087. Carteira 109, 112 ou 115."}',CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'033','Santander','CNAB 240/400',true,false,true,'{"adapterStatus":"parser_inicial","homologacaoNecessaria":true,"obs":"Layout CNAB 240 v040. Código de convênio obrigatório."}',CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'001','Banco do Brasil','CNAB 240/400',true,true,true,'{"adapterStatus":"parser_inicial","homologacaoNecessaria":true,"obs":"Layout CNAB 240 v084. Convênio e carteira obrigatórios."}',CURRENT_TIMESTAMP),
(gen_random_uuid()::text,'077','Banco Inter','CNAB 240',true,false,true,'{"adapterStatus":"parser_inicial","homologacaoNecessaria":true,"obs":"Layout CNAB 240 v030. API disponível como alternativa futura."}',CURRENT_TIMESTAMP);
