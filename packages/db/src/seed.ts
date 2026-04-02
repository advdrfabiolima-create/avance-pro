import { PrismaClient } from './generated'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const NIVEIS = [
  '6A', '5A', '4A', '3A', '2A', 'A', 'B', 'C', 'D',
  'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'
]

async function main() {
  console.log('Iniciando seed...')

  // Matérias
  const materias = await Promise.all([
    prisma.materia.upsert({
      where: { codigo: 'MAT' },
      update: {},
      create: { nome: 'Matemática', codigo: 'MAT' },
    }),
    prisma.materia.upsert({
      where: { codigo: 'PORT' },
      update: {},
      create: { nome: 'Português', codigo: 'PORT' },
    }),
    prisma.materia.upsert({
      where: { codigo: 'ING' },
      update: {},
      create: { nome: 'Inglês', codigo: 'ING' },
    }),
  ])

  console.log(`Matérias criadas: ${materias.map(m => m.codigo).join(', ')}`)

  // Níveis para cada matéria
  for (const materia of materias) {
    for (let i = 0; i < NIVEIS.length; i++) {
      const codigo = NIVEIS[i] as string
      await prisma.nivel.upsert({
        where: { materiaId_codigo: { materiaId: materia.id, codigo } },
        update: {},
        create: {
          materiaId: materia.id,
          codigo,
          descricao: `Nível ${codigo} — ${materia.nome}`,
          ordem: i + 1,
        },
      })
    }
  }

  console.log(`Níveis criados: ${NIVEIS.length} por matéria`)

  // Usuário franqueado padrão
  const senhaHash = await bcrypt.hash('kumon@2024', 10)
  const franqueado = await prisma.usuario.upsert({
    where: { email: 'franqueado@kumonadvance.com' },
    update: {},
    create: {
      nome: 'Franqueado',
      email: 'franqueado@kumonadvance.com',
      senhaHash,
      perfil: 'franqueado',
    },
  })

  console.log(`Usuário franqueado criado: ${franqueado.email}`)
  console.log('Seed concluído.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
