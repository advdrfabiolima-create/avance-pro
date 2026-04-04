import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { cobrancaService } from './cobrancas.service'
import { criarCobrancaSchema, atualizarCobrancaSchema, filtrosCobrancaSchema } from './cobrancas.schema'
import { billingCore } from '../../shared/billing/billing.core'
import { prisma } from '@kumon-advance/db'
import { notificacaoService } from '../notificacoes/notificacoes.service'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(err: unknown): err is ErroNegocio {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function cobrancasRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarCobrancaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const cobranca = await cobrancaService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar cobrança' })
    }
  })

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosCobrancaSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const resposta = await cobrancaService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar cobranças' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const cobranca = await cobrancaService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar cobrança' })
    }
  })

  app.put('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = atualizarCobrancaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const cobranca = await cobrancaService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar cobrança' })
    }
  })

  app.patch('/:id/pagar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { pagoEm } = (request.body ?? {}) as { pagoEm?: string }
    try {
      const cobranca = await cobrancaService.registrarPagamento(id, pagoEm ? new Date(pagoEm) : new Date())
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao registrar pagamento da cobrança' })
    }
  })

  app.patch('/:id/cancelar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const cobranca = await cobrancaService.cancelar(id)
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao cancelar cobrança' })
    }
  })

  // POST /:id/enviar — envia cobrança via Billing Core (provider configurado)
  app.post('/:id/enviar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tipo } = (request.body ?? {}) as { tipo?: 'PIX' | 'BOLETO' }

    if (!tipo || !['PIX', 'BOLETO'].includes(tipo)) {
      return reply.status(400).send({ success: false, error: 'tipo deve ser PIX ou BOLETO' })
    }

    try {
      const paymentMethod = tipo === 'PIX' ? 'pix' : 'boleto'
      const result = await billingCore.enviarCobranca(id, paymentMethod)

      // Busca cobrança atualizada para retornar ao frontend
      const atualizada = await prisma.cobranca.findUnique({
        where: { id },
        include: { aluno: { select: { id: true, nome: true, foto: true } } },
      })

      // Notificação ao responsável (fire-and-forget)
      const cobrancaComResp = await prisma.cobranca.findUnique({
        where: { id },
        include: {
          aluno: {
            include: {
              responsaveis: {
                where: { principal: true },
                include: { responsavel: true },
                take: 1,
              },
            },
          },
        },
      })
      const resp = cobrancaComResp?.aluno?.responsaveis[0]?.responsavel
      if (resp?.email && resp?.telefone && cobrancaComResp) {
        const valorFmt = parseFloat(cobrancaComResp.valor.toString()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const vencFmt = new Date(cobrancaComResp.vencimento.toISOString().slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR')
        const desc = cobrancaComResp.descricao ?? `Mensalidade — ${cobrancaComResp.aluno.nome}`
        let msg = `Olá, ${resp.nome}!\n\nFoi gerada uma cobrança para *${cobrancaComResp.aluno.nome}*.\n\n📋 *${desc}*\n💰 ${valorFmt}\n📅 Vencimento: ${vencFmt}\n`
        if (tipo === 'BOLETO' && result.boletoUrl) msg += `\n🔗 Boleto: ${result.boletoUrl}`
        else if (tipo === 'PIX' && result.pixChave) msg += `\n📱 Pix copia e cola:\n${result.pixChave}`
        notificacaoService.enviar(
          { nome: resp.nome, email: resp.email, telefone: resp.telefone },
          `Cobrança gerada — ${desc}`,
          msg,
        ).catch((err: unknown) => console.error('[cobrancas] Falha ao enviar notificação:', err))
      }

      return reply.send({ success: true, data: atualizada })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      const msg = (err as any)?.message ?? 'Erro ao enviar cobrança'
      return reply.status(500).send({ success: false, error: msg })
    }
  })
}
