import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes'
import { alunosRoutes } from './modules/alunos/alunos.routes'
import { responsaveisRoutes } from './modules/responsaveis/responsaveis.routes'
import { turmasRoutes } from './modules/turmas/turmas.routes'
import { sessoesRoutes } from './modules/sessoes/sessoes.routes'
import { pagamentosRoutes } from './modules/pagamentos/pagamentos.routes'
import { notificacoesRoutes } from './modules/notificacoes/notificacoes.routes'
import { materiasRoutes } from './modules/materias/materias.routes'
import { reunioesRoutes } from './modules/reunioes/reunioes.routes'
import { movimentosRoutes } from './modules/movimentos/movimentos.routes'
import { cobrancasRoutes } from './modules/cobrancas/cobrancas.routes'
import { recorrenciasRoutes } from './modules/recorrencias/recorrencias.routes'
import { relatoriosRoutes } from './modules/relatorios/relatorios.routes'
import { notasFiscaisRoutes } from './modules/notas-fiscais/notas-fiscais.routes'
import { presencaRoutes } from './modules/presenca/presenca.routes'
import { exerciciosRoutes } from './modules/exercicios/exercicios.routes'
import { tentativasRoutes } from './modules/tentativas/tentativas.routes'
import { configGatewayRoutes } from './modules/config-gateway/config-gateway.routes'

async function main() {
  const app = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB para suportar fotos em base64
  })

  // Plugins
  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
  })

  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'kumon-advance-secret-dev',
  })

  await app.register(swagger, {
    openapi: {
      info: { title: 'Kumon Advance API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  await app.register(swaggerUi, { routePrefix: '/docs' })

  // Rotas existentes
  await app.register(usuariosRoutes, { prefix: '/api/usuarios' })
  await app.register(alunosRoutes, { prefix: '/api/alunos' })
  await app.register(responsaveisRoutes, { prefix: '/api/responsaveis' })
  await app.register(turmasRoutes, { prefix: '/api/turmas' })
  await app.register(sessoesRoutes, { prefix: '/api/sessoes' })
  await app.register(pagamentosRoutes, { prefix: '/api/pagamentos' })
  await app.register(notificacoesRoutes, { prefix: '/api/notificacoes' })
  await app.register(materiasRoutes, { prefix: '/api/materias' })

  // Novas rotas — Fase 1
  await app.register(reunioesRoutes, { prefix: '/api/reunioes' })
  await app.register(presencaRoutes, { prefix: '/api/presenca' })

  // Novas rotas — Fase 2
  await app.register(movimentosRoutes, { prefix: '/api/movimentos' })
  await app.register(cobrancasRoutes, { prefix: '/api/cobrancas' })
  await app.register(recorrenciasRoutes, { prefix: '/api/recorrencias' })
  await app.register(relatoriosRoutes, { prefix: '/api/relatorios' })

  // Novas rotas — Fase 3
  await app.register(notasFiscaisRoutes, { prefix: '/api/notas-fiscais' })

  // Novas rotas — Fase 4: Exercícios
  await app.register(exerciciosRoutes, { prefix: '/api/exercicios' })
  await app.register(tentativasRoutes, { prefix: '/api/tentativas' })

  // Gateway de pagamento
  await app.register(configGatewayRoutes, { prefix: '/api/config-gateway' })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Start
  const port = parseInt(process.env['PORT'] ?? '3333')
  const host = process.env['HOST'] ?? '0.0.0.0'

  try {
    await app.listen({ port, host })
    console.log(`API rodando em http://localhost:${port}`)
    console.log(`Documentação em http://localhost:${port}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
