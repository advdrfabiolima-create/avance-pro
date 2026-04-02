-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('franqueado', 'assistente');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('pix', 'cartao', 'boleto', 'dinheiro');

-- CreateEnum
CREATE TYPE "CodigoMateria" AS ENUM ('MAT', 'PORT', 'ING');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "escola" VARCHAR(150),
    "serie_escolar" VARCHAR(50),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsaveis" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "cpf" VARCHAR(14) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "telefone_alt" VARCHAR(20),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responsaveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsaveis_aluno" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    "parentesco" VARCHAR(50) NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "responsaveis_aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "codigo" "CodigoMateria" NOT NULL,

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveis" (
    "id" TEXT NOT NULL,
    "materia_id" TEXT NOT NULL,
    "codigo" VARCHAR(5) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "niveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "materia_id" TEXT NOT NULL,
    "nivel_atual_id" TEXT NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progressao_niveis" (
    "id" TEXT NOT NULL,
    "matricula_id" TEXT NOT NULL,
    "nivel_anterior_id" TEXT NOT NULL,
    "nivel_novo_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "progressao_niveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" TEXT NOT NULL,
    "dia_semana" "DiaSemana" NOT NULL,
    "horario_inicio" VARCHAR(5) NOT NULL,
    "horario_fim" VARCHAR(5) NOT NULL,
    "capacidade" INTEGER NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turma_alunos" (
    "id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,

    CONSTRAINT "turma_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "assistente_id" TEXT NOT NULL,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao_alunos" (
    "id" TEXT NOT NULL,
    "sessao_id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "matricula_id" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "folhas_feitas" INTEGER,
    "erros" INTEGER,
    "tempo_minutos" INTEGER,
    "nivel_id" TEXT,
    "observacao" TEXT,

    CONSTRAINT "sessao_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "matricula_id" TEXT NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    "mes_referencia" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "pago_em" DATE,
    "forma_pagamento" "FormaPagamento",
    "observacao" TEXT,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "responsaveis_cpf_key" ON "responsaveis"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "responsaveis_aluno_aluno_id_responsavel_id_key" ON "responsaveis_aluno"("aluno_id", "responsavel_id");

-- CreateIndex
CREATE UNIQUE INDEX "materias_codigo_key" ON "materias"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "niveis_materia_id_codigo_key" ON "niveis"("materia_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_turma_id_data_key" ON "sessoes"("turma_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_alunos_sessao_id_aluno_id_matricula_id_key" ON "sessao_alunos"("sessao_id", "aluno_id", "matricula_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_matricula_id_mes_referencia_key" ON "pagamentos"("matricula_id", "mes_referencia");

-- AddForeignKey
ALTER TABLE "responsaveis_aluno" ADD CONSTRAINT "responsaveis_aluno_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsaveis_aluno" ADD CONSTRAINT "responsaveis_aluno_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveis" ADD CONSTRAINT "niveis_materia_id_fkey" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_materia_id_fkey" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_nivel_atual_id_fkey" FOREIGN KEY ("nivel_atual_id") REFERENCES "niveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressao_niveis" ADD CONSTRAINT "progressao_niveis_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressao_niveis" ADD CONSTRAINT "progressao_niveis_nivel_anterior_id_fkey" FOREIGN KEY ("nivel_anterior_id") REFERENCES "niveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressao_niveis" ADD CONSTRAINT "progressao_niveis_nivel_novo_id_fkey" FOREIGN KEY ("nivel_novo_id") REFERENCES "niveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressao_niveis" ADD CONSTRAINT "progressao_niveis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turma_alunos" ADD CONSTRAINT "turma_alunos_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turma_alunos" ADD CONSTRAINT "turma_alunos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_assistente_id_fkey" FOREIGN KEY ("assistente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_alunos" ADD CONSTRAINT "sessao_alunos_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_alunos" ADD CONSTRAINT "sessao_alunos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_alunos" ADD CONSTRAINT "sessao_alunos_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_alunos" ADD CONSTRAINT "sessao_alunos_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "niveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "matriculas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
