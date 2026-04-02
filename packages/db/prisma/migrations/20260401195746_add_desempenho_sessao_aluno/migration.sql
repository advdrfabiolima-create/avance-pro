-- CreateEnum
CREATE TYPE "StatusSessao" AS ENUM ('avancando_bem', 'atencao', 'estagnado', 'critico');

-- AlterTable
ALTER TABLE "sessao_alunos" ADD COLUMN     "acertos" INTEGER,
ADD COLUMN     "material_codigo" VARCHAR(20),
ADD COLUMN     "status_sessao" "StatusSessao";
