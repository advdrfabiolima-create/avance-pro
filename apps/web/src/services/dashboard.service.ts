import { api } from './api'
import type { PaginatedResponse } from '@kumon-advance/types'
import type { StatusOperacional } from '../components/shared/StatusBadge'

export interface DashboardStats {
  totalAlunosAtivos: number
  sessoesHoje: number
  sessoesEstaSemana: number
  inadimplentesTotal: number
  inadimplentesValor: number
  novosMesAtual: number
}

export interface AlunoOperacional {
  id: string
  nome: string
  ultimaSessao: string | null
  diasSemSessao: number | null
  statusOperacional: StatusOperacional
  tendencia?: 'subindo' | 'caindo' | 'estavel' | null
  matriculaAtiva: {
    materia: { id: string; nome: string; codigo: string }
    nivelAtual: { id: string; codigo: string; descricao: string }
  } | null
}

export interface AlunoDestaque {
  id: string
  nome: string
  mediaFolhas: number
  mediaErros: number
  sessoesRecentes: number
}

export interface SessaoHoje {
  id: string
  turma: { diaSemana: string; horarioInicio: string; horarioFim: string }
  totalAlunos: number
  presentes: number
}

export interface Inadimplente {
  alunoId: string
  nome: string
  totalDevido: number
  pagamentos: Array<{
    id: string
    valor: number
    vencimento: string
    mesReferencia: string
  }>
}

function toDateParam(date: Date): string {
  return date.toISOString().split('T')[0]!
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Segunda-feira como início da semana
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function unwrap<T>(res: { data: unknown }): T {
  const body = res.data as any
  return (body?.data ?? body) as T
}

export async function buscarStats(): Promise<DashboardStats> {
  const hoje = new Date()
  const hojeParam = toDateParam(hoje)
  const inicioSemana = toDateParam(getStartOfWeek(hoje))
  const fimSemana = toDateParam(getEndOfWeek(hoje))

  const [alunosRes, inadimplentesRes, sessoesHojeRes, sessoesSemanRes] =
    await Promise.all([
      api.get('/alunos', { params: { ativo: true, pageSize: 1 } }),
      api.get('/pagamentos/inadimplentes'),
      api.get('/sessoes', { params: { dataInicio: hojeParam, dataFim: hojeParam } }),
      api.get('/sessoes', { params: { dataInicio: inicioSemana, dataFim: fimSemana } }),
    ])

  const alunosData = unwrap<PaginatedResponse<unknown>>(alunosRes)
  const totalAlunosAtivos = alunosData.total

  const inadimplentes = unwrap<Inadimplente[]>(inadimplentesRes)
  const inadimplentesTotal = Array.isArray(inadimplentes) ? inadimplentes.length : 0
  const inadimplentesValor = Array.isArray(inadimplentes)
    ? inadimplentes.reduce((acc, i) => acc + i.totalDevido, 0)
    : 0

  const sessoesHojeData = unwrap<{ data: SessaoHoje[] }>(sessoesHojeRes)
  const sessoesHoje = Array.isArray(sessoesHojeData?.data) ? sessoesHojeData.data.length : 0

  const sessoesSemanData = unwrap<{ data: SessaoHoje[] }>(sessoesSemanRes)
  const sessoesEstaSemana = Array.isArray(sessoesSemanData?.data) ? sessoesSemanData.data.length : 0

  return {
    totalAlunosAtivos,
    sessoesHoje,
    sessoesEstaSemana,
    inadimplentesTotal,
    inadimplentesValor,
    novosMesAtual: 0,
  }
}

export async function buscarSessoesHoje(): Promise<SessaoHoje[]> {
  const hoje = new Date()
  const hojeParam = toDateParam(hoje)
  const res = await api.get('/sessoes', {
    params: { dataInicio: hojeParam, dataFim: hojeParam },
  })
  const dados = unwrap<{ data: SessaoHoje[] }>(res)
  return Array.isArray(dados?.data) ? dados.data : []
}

export async function buscarInadimplentes(): Promise<Inadimplente[]> {
  // Busca inadimplência de mensalidades (pagamentos) e cobranças avulsas em paralelo
  const [pagRes, cobRes] = await Promise.all([
    api.get('/pagamentos/inadimplentes').catch(() => null),
    api.get('/cobrancas/inadimplencia', { params: { pageSize: 100 } }).catch(() => null),
  ])

  const mapa = new Map<string, Inadimplente>()

  // Mensalidades vencidas
  const pagLista = pagRes ? unwrap<Inadimplente[]>(pagRes) : []
  if (Array.isArray(pagLista)) {
    pagLista.forEach((i) => mapa.set(i.alunoId, { ...i }))
  }

  // Cobranças avulsas vencidas
  const cobDados = cobRes ? unwrap<{ data: any[] }>(cobRes) : null
  const cobLista: any[] = Array.isArray(cobDados?.data) ? cobDados!.data : []
  cobLista.forEach((c) => {
    const existing = mapa.get(c.alunoId)
    if (existing) {
      existing.totalDevido += Number(c.valor)
    } else {
      mapa.set(c.alunoId, {
        alunoId: c.alunoId,
        nome: c.aluno?.nome ?? '',
        totalDevido: Number(c.valor),
        pagamentos: [],
      })
    }
  })

  return Array.from(mapa.values()).sort((a, b) => b.totalDevido - a.totalDevido)
}

export async function buscarAlunosOperacional(): Promise<AlunoOperacional[]> {
  const res = await api.get('/alunos', { params: { ativo: true, pageSize: 100 } })
  const dados = unwrap<{ data: AlunoOperacional[] }>(res)
  return Array.isArray(dados?.data) ? dados.data : []
}
