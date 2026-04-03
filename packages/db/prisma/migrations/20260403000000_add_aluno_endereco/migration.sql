-- AlterTable: adicionar campos de endereço ao aluno
ALTER TABLE "alunos" ADD COLUMN "cep" VARCHAR(9),
                     ADD COLUMN "logradouro" VARCHAR(200),
                     ADD COLUMN "numero" VARCHAR(20),
                     ADD COLUMN "complemento" VARCHAR(100),
                     ADD COLUMN "bairro" VARCHAR(100),
                     ADD COLUMN "cidade" VARCHAR(100),
                     ADD COLUMN "estado" VARCHAR(2);
