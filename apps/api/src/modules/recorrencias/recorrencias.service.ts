import { prisma } from '@kumon-advance/db'
import type { CriarRecorrenciaInput, AtualizarRecorrenciaInput } from './recorrencias.schema'

interface ErroNegocio { statusCode: number; message: string }
function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

export class RecorrenciaService {
  async criar(data: CriarRecorrenciaInput) {
    return prisma.configRecorrencia.create({
      data: {
        nome: data.nome,
        valor: data.valor,
        periodicidade: data.periodicidade as any,
        diaVencimento: data.diaVencimento,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim ?? null,
        descricao: data.descricao,
      },
    })
  }

  async listar(apenasAtivos?: boolean) {
    return prisma.configRecorrencia.findMany({
      where: apenasAtivos ? { ativo: true } : undefined,
      orderBy: { criadoEm: 'desc' },
    })
  }

  async buscarPorId(id: string) {
    const rec = await prisma.configRecorrencia.findUnique({ where: { id } })
    if (!rec) throw erroNegocio(404, 'Recorrência não encontrada')
    return rec
  }

  async atualizar(id: string, data: AtualizarRecorrenciaInput) {
    const existe = await prisma.configRecorrencia.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Recorrência não encontrada')

    return prisma.configRecorrencia.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.valor !== undefined && { valor: data.valor }),
        ...(data.diaVencimento !== undefined && { diaVencimento: data.diaVencimento }),
        ...(data.dataFim !== undefined && { dataFim: data.dataFim }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
      },
    })
  }

  // Simula as próximas datas de cobrança geradas por esta recorrência
  simularProximasCobrancas(rec: { periodicidade: string; diaVencimento: number; dataInicio: Date }, quantidade = 6) {
    const datas: Date[] = []
    const mesesPorPeriodo: Record<string, number> = {
      mensal: 1,
      bimestral: 2,
      trimestral: 3,
      semestral: 6,
      anual: 12,
    }
    const intervalo = mesesPorPeriodo[rec.periodicidade] ?? 1
    const base = new Date()

    for (let i = 0; i < quantidade; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i * intervalo, rec.diaVencimento)
      datas.push(d)
    }

    return datas
  }
}

export const recorrenciaService = new RecorrenciaService()
