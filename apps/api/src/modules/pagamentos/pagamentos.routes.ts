import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { pagamentoService } from './pagamentos.service'
import {
  criarPagamentoSchema,
  gerarMensalidadesSchema,
  registrarPagamentoSchema,
  filtrosPagamentoSchema,
} from './pagamentos.schema'

interface ErroNegocio {
  statusCode: number
  message: string
}

function isErroNegocio(err: unknown): err is ErroNegocio {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    'message' in err
  )
}

export async function pagamentosRoutes(app: FastifyInstance): Promise<void> {
  // POST / — autenticado, franqueado — criar pagamento avulso
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarPagamentoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const pagamento = await pagamentoService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: pagamento })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao criar pagamento' })
    }
  })

  // POST /gerar-mensalidades — autenticado, franqueado — gerar em lote
  app.post('/gerar-mensalidades', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = gerarMensalidadesSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    const { materiaId, mesReferencia, valor, diaVencimento } = resultado.data

    try {
      const resposta = await pagamentoService.gerarMensalidades(
        materiaId,
        mesReferencia,
        valor,
        diaVencimento,
      )
      return reply.status(201).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao gerar mensalidades' })
    }
  })

  // GET / — autenticado, query params de filtros
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosPagamentoSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Parâmetros inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const resposta = await pagamentoService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao listar pagamentos' })
    }
  })

  // GET /inadimplentes — autenticado, franqueado
  app.get('/inadimplentes', { preHandler: apenasAdmin }, async (_request, reply) => {
    try {
      const resposta = await pagamentoService.listarInadimplentes()
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao listar inadimplentes' })
    }
  })

  // GET /:id — autenticado
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const pagamento = await pagamentoService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: pagamento })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao buscar pagamento' })
    }
  })

  // PATCH /:id/registrar — autenticado — registrar pagamento recebido
  app.patch('/:id/registrar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const resultado = registrarPagamentoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const pagamento = await pagamentoService.registrarPagamento(id, resultado.data)
      return reply.status(200).send({ success: true, data: pagamento })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao registrar pagamento' })
    }
  })

  // POST /notificar-vencimentos — autenticado, franqueado — dispara notificações de vencimento próximo
  app.post('/notificar-vencimentos', { preHandler: apenasAdmin }, async (request, reply) => {
    const { diasAntecedencia } = (request.body ?? {}) as { diasAntecedencia?: number }

    try {
      const resposta = await pagamentoService.notificarVencimentos(diasAntecedencia)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao notificar vencimentos' })
    }
  })
}
