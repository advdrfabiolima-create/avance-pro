-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "StatusMovimento" AS ENUM ('confirmado', 'pendente', 'cancelado');

-- CreateEnum
CREATE TYPE "OrigemMovimento" AS ENUM ('mensalidade', 'matricula', 'material', 'salario', 'aluguel', 'servico', 'outro');

-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('aguardando', 'enviada', 'paga', 'vencida', 'cancelada');

-- CreateEnum
CREATE TYPE "StatusNotaFiscal" AS ENUM ('rascunho', 'emitida', 'cancelada');

-- CreateEnum
CREATE TYPE "TipoRecorrencia" AS ENUM ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual');

-- AlterTable
ALTER TABLE "alunos" ADD COLUMN     "foto" TEXT;

-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN     "conciliado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conciliado_em" DATE;

-- AlterTable
ALTER TABLE "responsaveis" ALTER COLUMN "cpf" DROP NOT NULL;

-- CreateTable
CREATE TABLE "reunioes" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "responsavel_id" TEXT,
    "usuario_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL DEFAULT 'geral',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reunioes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "pagamento_id" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'aguardando',
    "descricao" VARCHAR(255),
    "nosso_numero" VARCHAR(50),
    "linha_digitavel" VARCHAR(100),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pago_em" DATE,

    CONSTRAINT "cobrancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_financeiros" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "origem" "OrigemMovimento" NOT NULL DEFAULT 'outro',
    "descricao" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL,
    "status" "StatusMovimento" NOT NULL DEFAULT 'confirmado',
    "pagamento_id" TEXT,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_recorrencias" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "periodicidade" "TipoRecorrencia" NOT NULL,
    "dia_vencimento" INTEGER NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "descricao" VARCHAR(255),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_recorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_fiscais" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "responsavel_id" TEXT,
    "numero" VARCHAR(50),
    "valor" DECIMAL(10,2) NOT NULL,
    "competencia" DATE NOT NULL,
    "status" "StatusNotaFiscal" NOT NULL DEFAULT 'rascunho',
    "descricao" VARCHAR(255),
    "xml_url" VARCHAR(500),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emitida_em" TIMESTAMP(3),

    CONSTRAINT "notas_fiscais_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reunioes" ADD CONSTRAINT "reunioes_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunioes" ADD CONSTRAINT "reunioes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunioes" ADD CONSTRAINT "reunioes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_financeiros" ADD CONSTRAINT "movimentos_financeiros_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_fiscais" ADD CONSTRAINT "notas_fiscais_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_fiscais" ADD CONSTRAINT "notas_fiscais_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
