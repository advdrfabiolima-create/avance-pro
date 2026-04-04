import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { bancosService } from './bancos.service'
import { listSupportedBanks } from '../../shared/cnab/cnab.registry'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(e: unknown): e is ErroNegocio {
  return typeof e === 'object' && e !== null && 'statusCode' in e && 'message' in e
}

export async function bancosRoutes(app: FastifyInstance): Promise<void> {
  // ── Catálogo ────────────────────────────────────────────────────────────────

  app.get('/catalogo', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await bancosService.listCatalog() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar catálogo' })
    }
  })

  app.get('/adapters', { preHandler: autenticar }, async (_req, reply) => {
    return reply.send({ success: true, data: listSupportedBanks() })
  })

  // ── Resumo ──────────────────────────────────────────────────────────────────

  app.get('/resumo', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await bancosService.resumo() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar resumo' })
    }
  })

  // ── Contas ──────────────────────────────────────────────────────────────────

  app.get('/contas', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await bancosService.listAccounts() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar contas' })
    }
  })

  app.get('/contas/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await bancosService.getAccount(id) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar conta' })
    }
  })

  app.post('/contas', { preHandler: apenasAdmin }, async (request, reply) => {
    try {
      const data = request.body as any
      return reply.status(201).send({ success: true, data: await bancosService.createAccount(data) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar conta' })
    }
  })

  app.put('/contas/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await bancosService.updateAccount(id, request.body as any) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar conta' })
    }
  })

  app.patch('/contas/:id/set-default', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await bancosService.setDefault(id) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao definir padrão' })
    }
  })

  app.patch('/contas/:id/toggle', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await bancosService.toggleActive(id) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao alternar status' })
    }
  })

  app.delete('/contas/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await bancosService.deleteAccount(id)
      return reply.send({ success: true })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao excluir conta' })
    }
  })

  app.get('/contas/:id/validar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const erros = await bancosService.validateAccount(id)
      return reply.send({ success: true, data: { valido: erros.length === 0, erros } })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao validar conta' })
    }
  })

  app.get('/contas/:id/elegiveis', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await bancosService.getCobrancasElegiveis(id) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar cobranças elegíveis' })
    }
  })

  // ── Remessa ─────────────────────────────────────────────────────────────────

  app.post('/contas/:id/remessa', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { cobrancaIds } = request.body as { cobrancaIds: string[] }
    const usuario = (request as any).user?.nome ?? 'sistema'
    try {
      const result = await bancosService.gerarRemessa(id, cobrancaIds, usuario)
      // Não retorna rawContent na resposta — usar endpoint de download
      const { content: _, ...sem } = result
      return reply.send({ success: true, data: { ...sem, content: result.content } })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao gerar remessa' })
    }
  })

  // ── Retorno ──────────────────────────────────────────────────────────────────

  app.post('/contas/:id/retorno/preview', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { fileName, rawContent } = request.body as { fileName: string; rawContent: string }
    const usuario = (request as any).user?.nome ?? 'sistema'
    try {
      const preview = await bancosService.importarRetorno(id, fileName, rawContent, usuario)
      return reply.send({ success: true, data: preview })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao fazer preview do retorno' })
    }
  })

  app.post('/retorno/:cnabFileId/efetivar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { cnabFileId } = request.params as { cnabFileId: string }
    const usuario = (request as any).user?.nome ?? 'sistema'
    try {
      const result = await bancosService.efetivarRetorno(cnabFileId, usuario)
      return reply.send({ success: true, data: result })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao efetivar retorno' })
    }
  })

  // ── Logs de arquivos ─────────────────────────────────────────────────────────

  app.get('/contas/:id/arquivos', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await bancosService.listFiles(id) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar arquivos' })
    }
  })
}
