import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { cobrancaService } from './cobrancas.service'
import { criarCobrancaSchema, atualizarCobrancaSchema, filtrosCobrancaSchema } from './cobrancas.schema'
import { prisma } from '@kumon-advance/db'
import { asaasGetOrCreateCustomer, asaasCriarCobranca, asaasBuscarPixQrCode } from '../../shared/asaas.service'

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

  // POST /:id/enviar — envia cobrança via Asaas (PIX ou BOLETO)
  app.post('/:id/enviar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tipo } = (request.body ?? {}) as { tipo?: 'PIX' | 'BOLETO' }

    if (!tipo || !['PIX', 'BOLETO'].includes(tipo)) {
      return reply.status(400).send({ success: false, error: 'tipo deve ser PIX ou BOLETO' })
    }

    try {
      const cobranca = await prisma.cobranca.findUnique({
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
      if (!cobranca) return reply.status(404).send({ success: false, error: 'Cobrança não encontrada' })
      if (cobranca.status === 'paga' || cobranca.status === 'cancelada') {
        return reply.status(422).send({ success: false, error: `Cobrança já está ${cobranca.status}` })
      }

      // Pegar dados do responsável principal para criar customer no Asaas
      const resp = cobranca.aluno.responsaveis[0]?.responsavel
      const customerParams = {
        nome: resp?.nome ?? cobranca.aluno.nome,
        email: resp?.email ?? `${cobranca.aluno.nome.toLowerCase().replace(/\s+/g, '.')}@semEmail.com`,
        telefone: resp?.telefone,
        cpf: resp?.cpf ?? undefined,
      }

      // Criar ou buscar customer no Asaas
      const customerId = await asaasGetOrCreateCustomer(customerParams)

      // Criar cobrança no Asaas
      const vencimento = cobranca.vencimento instanceof Date
        ? cobranca.vencimento.toISOString().slice(0, 10)
        : String(cobranca.vencimento).slice(0, 10)

      const pagamento = await asaasCriarCobranca({
        customerId,
        valor: parseFloat(cobranca.valor.toString()),
        vencimento,
        descricao: cobranca.descricao ?? `Mensalidade — ${cobranca.aluno.nome}`,
        tipo,
      })

      // Se PIX, buscar QR Code
      let pixQrCode: string | null = null
      let pixChave: string | null = null
      if (tipo === 'PIX') {
        try {
          const pix = await asaasBuscarPixQrCode(pagamento.id)
          pixQrCode = pix.encodedImage
          pixChave = pix.payload
        } catch { /* QR code pode demorar alguns segundos */ }
      }

      // Atualizar cobrança local
      const atualizada = await prisma.cobranca.update({
        where: { id },
        data: {
          status: 'enviada',
          asaasId: pagamento.id,
          nossoNumero: pagamento.nossoNumero ?? null,
          linhaDigitavel: pagamento.bankSlipUrl ?? null,
          boletoUrl: pagamento.bankSlipUrl ?? null,
          pixQrCode,
          pixChave,
        },
        include: { aluno: { select: { id: true, nome: true, foto: true } } },
      })

      return reply.send({ success: true, data: atualizada })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      const msg = (err as any)?.response?.data?.errors?.[0]?.description
        ?? (err as any)?.message
        ?? 'Erro ao enviar cobrança via Asaas'
      return reply.status(500).send({ success: false, error: msg })
    }
  })
}
