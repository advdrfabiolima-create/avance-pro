import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Pencil, BookOpen, Users, GraduationCap,
  Clock, Target, TrendingUp, AlertTriangle, Calendar, BookMarked, Play, AlertCircle,
  DollarSign, CheckCircle2, XCircle, Hourglass,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { StatusBadge } from '../../components/shared/StatusBadge'
import type { StatusOperacional } from '../../components/shared/StatusBadge'
import { alunosService } from '../../services/alunos.service'
import { tentativasService, type ErroRecorrente } from '../../services/tentativas.service'
import { exerciciosService, type Exercicio } from '../../services/exercicios.service'
import { cobrancasService, type Cobranca, type StatusCobranca } from '../../services/cobrancas.service'
import AlunoFormModal from './AlunoFormModal'
import MatriculaModal from './MatriculaModal'
import AlunoEvolucao from './AlunoEvolucao'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ResponsavelVinculo {
  responsavel: { id: string; nome: string; email: string; telefone: string }
  parentesco: string
  principal: boolean
}

interface MatriculaDetalhe {
  id: string
  ativo: boolean
  dataInicio: string
  dataFim?: string
  materia: { id: string; nome: string; codigo: string }
  nivelAtual: { id: string; codigo: string; descricao: string }
}

interface SessaoHistorico {
  id: string
  presente: boolean
  folhasFeitas?: number | null
  acertos?: number | null
  erros?: number | null
  tempoMinutos?: number | null
  materialCodigo?: string | null
  statusSessao?: string | null
  observacao?: string | null
  sessao: { data: string }
  nivel?: { codigo: string; descricao: string } | null
  matricula: { materia: { nome: string; codigo: string } }
}

interface Kpis {
  totalSessoes: number
  ultimaSessao: string | null
  diasSemSessao: number | null
  mediaAcertos: number | null
  mediaErros: number | null
  mediaTempo: number | null
  taxaAcerto: number | null
  statusOperacional: StatusOperacional
}

interface TurmaVinculo {
  dataInicio: string
  turma: {
    id: string
    diaSemana: string
    horarioInicio: string
    horarioFim: string
  }
}

interface AlunoDetalhado {
  id: string
  nome: string
  dataNascimento: string
  escola?: string
  serieEscolar?: string
  ativo: boolean
  criadoEm: string
  responsaveis: ResponsavelVinculo[]
  matriculas: MatriculaDetalhe[]
  turmas?: TurmaVinculo[]
  sessoesAluno?: SessaoHistorico[]
  kpis?: Kpis
}

const DIAS: Record<string, string> = {
  segunda: 'Seg', terca: 'Ter', quarta: 'Qua',
  quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function calcularIdade(dataNascimento: string): number {
  const partes = dataNascimento.split('T')[0]!.split('-')
  const ano = parseInt(partes[0]!)
  const mes = parseInt(partes[1]!) - 1
  const dia = parseInt(partes[2]!)
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  const m = hoje.getMonth() - mes
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) idade--
  return idade
}

function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel
}

function formatarTempo(min: number): string {
  if (min < 60) return `${Math.round(min)}min`
  return `${Math.floor(min / 60)}h${Math.round(min % 60)}min`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Alertas automáticos ──────────────────────────────────────────────────────

function AlertasCard({ kpis }: { kpis: Kpis }) {
  const alertas: { msg: string; severity: 'critico' | 'atencao' | 'estagnado' }[] = []

  if (kpis.diasSemSessao !== null && kpis.diasSemSessao > 30) {
    alertas.push({ msg: `Sem sessão há ${kpis.diasSemSessao} dias`, severity: 'critico' })
  } else if (kpis.diasSemSessao !== null && kpis.diasSemSessao > 14) {
    alertas.push({ msg: `Sem sessão há ${kpis.diasSemSessao} dias`, severity: 'estagnado' })
  } else if (kpis.diasSemSessao !== null && kpis.diasSemSessao > 7) {
    alertas.push({ msg: `Sem sessão há ${kpis.diasSemSessao} dias`, severity: 'atencao' })
  }

  if (kpis.taxaAcerto !== null && kpis.taxaAcerto < 50) {
    alertas.push({ msg: `Taxa de acerto baixa: ${kpis.taxaAcerto}%`, severity: 'critico' })
  } else if (kpis.taxaAcerto !== null && kpis.taxaAcerto < 70) {
    alertas.push({ msg: `Taxa de acerto abaixo do ideal: ${kpis.taxaAcerto}%`, severity: 'atencao' })
  }

  if (kpis.mediaTempo !== null && kpis.mediaTempo > 90) {
    alertas.push({ msg: `Tempo médio acima do esperado: ${formatarTempo(kpis.mediaTempo)}`, severity: 'atencao' })
  }

  if (alertas.length === 0) return null

  const variantMap = {
    critico: 'destructive' as const,
    atencao: 'warning' as const,
    estagnado: 'stagnant' as const,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {alertas.map((a, i) => (
            <li key={i} className="flex items-center gap-3">
              <Badge variant={variantMap[a.severity]}>{a.severity === 'critico' ? 'Crítico' : a.severity === 'atencao' ? 'Atenção' : 'Estagnado'}</Badge>
              <span className="text-sm">{a.msg}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ─── Histórico de Sessões ─────────────────────────────────────────────────────

function HistoricoSessoes({ sessoes }: { sessoes: SessaoHistorico[] }) {
  const statusSessaoVariant = (s: string | null | undefined) => {
    if (!s) return null
    const map: Record<string, 'success' | 'warning' | 'stagnant' | 'destructive'> = {
      avancando_bem: 'success',
      atencao: 'warning',
      estagnado: 'stagnant',
      critico: 'destructive',
    }
    return map[s] ?? null
  }
  const statusSessaoLabel = (s: string | null | undefined) => {
    if (!s) return null
    const map: Record<string, string> = {
      avancando_bem: 'Bem',
      atencao: 'Atenção',
      estagnado: 'Estagnado',
      critico: 'Crítico',
    }
    return map[s] ?? s
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Histórico de Sessões
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma sessão registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Data</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Material</th>
                  <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Tempo</th>
                  <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Acertos</th>
                  <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Erros</th>
                  <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((s) => {
                  const variant = statusSessaoVariant(s.statusSessao)
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        {formatarData(s.sessao.data)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <p>{s.materialCodigo ?? s.nivel?.codigo ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{s.matricula.materia.nome}</p>
                      </td>
                      <td className="py-2.5 px-2 text-center text-muted-foreground">
                        {s.tempoMinutos != null ? formatarTempo(s.tempoMinutos) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {s.acertos != null ? (
                          <span className="font-medium text-green-700">{s.acertos}</span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {s.erros != null ? (
                          <span className="font-medium text-red-600">{s.erros}</span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {variant ? (
                          <Badge variant={variant}>{statusSessaoLabel(s.statusSessao)}</Badge>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Exercícios do Aluno ──────────────────────────────────────────────────────

function ExerciciosAluno({ alunoId }: { alunoId: string }) {
  const navigate = useNavigate()
  const [tentativas, setTentativas] = useState<any[]>([])
  const [erros, setErros] = useState<ErroRecorrente[]>([])
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [loading, setLoading] = useState(true)
  const [iniciarId, setIniciarId] = useState<string | null>(null)
  const [iniciarLoading, setIniciarLoading] = useState(false)

  useEffect(() => {
    async function carregar() {
      try {
        const [tentRes, erroRes, exRes] = await Promise.all([
          tentativasService.listar({ alunoId, pageSize: 5 }),
          tentativasService.errosRecorrentes(alunoId),
          exerciciosService.listar({ ativo: true, pageSize: 20 }),
        ])
        setTentativas(tentRes.data?.data?.items ?? [])
        setErros(erroRes.data?.data ?? [])
        setExercicios(exRes.data?.data?.items ?? [])
      } catch {
        /* silencioso */
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [alunoId])

  async function handleIniciarExercicio() {
    if (!iniciarId) return
    setIniciarLoading(true)
    navigate(`/exercicios/${iniciarId}/executar/${alunoId}`)
  }

  const pct = (t: any) => {
    const p = parseFloat(t.pontuacao ?? '0')
    const total = parseFloat(t.totalPontos ?? '0')
    return total > 0 ? Math.round((p / total) * 100) : null
  }

  return (
    <div className="space-y-4">
      {/* Iniciar novo exercício */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked size={16} />
            Exercícios e Correção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <select
              value={iniciarId ?? ''}
              onChange={(e) => setIniciarId(e.target.value || null)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecionar exercício...</option>
              {exercicios.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.titulo}{ex.materia ? ` (${ex.materia.nome})` : ''}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!iniciarId || iniciarLoading}
              onClick={handleIniciarExercicio}
            >
              <Play size={13} />
              Iniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de tentativas */}
      {!loading && tentativas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground font-medium">Últimas tentativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tentativas.map((t) => {
              const p = pct(t)
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => navigate(`/tentativas/${t.id}`)}
                >
                  <div className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                    p === null ? 'bg-muted text-muted-foreground' :
                    p >= 70 ? 'bg-green-100 text-green-700' :
                    p >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {p !== null ? `${p}%` : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.exercicio?.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.iniciadaEm).toLocaleDateString('pt-BR')}
                      {t.exercicio?.materia && ` • ${t.exercicio.materia.nome}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Erros recorrentes */}
      {!loading && erros.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-orange-700">
              <AlertCircle size={15} />
              Erros Recorrentes ({erros.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {erros.slice(0, 4).map((e) => (
              <div key={e.id} className="rounded-md bg-orange-50 px-3 py-2">
                <p className="text-xs font-medium text-orange-800 truncate">{e.questao?.enunciado}</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {e.questao?.exercicio?.titulo} • {e.contagem}x errado
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Histórico Financeiro ─────────────────────────────────────────────────────

const STATUS_COBRANCA_LABEL: Record<StatusCobranca, string> = {
  aguardando: 'Aguardando',
  enviada: 'Enviada',
  paga: 'Paga',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

const STATUS_COBRANCA_VARIANT: Record<StatusCobranca, 'success' | 'warning' | 'destructive' | 'secondary' | 'stagnant'> = {
  aguardando: 'warning',
  enviada: 'stagnant',
  paga: 'success',
  vencida: 'destructive',
  cancelada: 'secondary',
}

function formatarMoeda(valor: number | string): string {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function HistoricoFinanceiro({ alunoId }: { alunoId: string }) {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cobrancasService
      .listar({ alunoId, pageSize: 50 })
      .then((res) => {
        const items = (res.data as any)?.data?.data ?? (res.data as any)?.data ?? []
        setCobrancas(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [alunoId])

  const totalCobrado = cobrancas
    .filter((c) => c.status !== 'cancelada')
    .reduce((acc, c) => acc + Number(c.valor), 0)

  const totalPago = cobrancas
    .filter((c) => c.status === 'paga')
    .reduce((acc, c) => acc + Number(c.valor), 0)

  const totalPendente = cobrancas
    .filter((c) => c.status === 'aguardando' || c.status === 'enviada' || c.status === 'vencida')
    .reduce((acc, c) => acc + Number(c.valor), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          Histórico Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        {!loading && cobrancas.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Total cobrado</p>
              <p className="text-sm font-bold">{formatarMoeda(totalCobrado)}</p>
            </div>
            <div className="rounded-lg bg-green-50 px-3 py-2.5 text-center">
              <p className="text-xs text-green-700 mb-0.5 flex items-center justify-center gap-1">
                <CheckCircle2 size={11} /> Pago
              </p>
              <p className="text-sm font-bold text-green-700">{formatarMoeda(totalPago)}</p>
            </div>
            <div className="rounded-lg bg-orange-50 px-3 py-2.5 text-center">
              <p className="text-xs text-orange-700 mb-0.5 flex items-center justify-center gap-1">
                <Hourglass size={11} /> Pendente
              </p>
              <p className="text-sm font-bold text-orange-700">{formatarMoeda(totalPendente)}</p>
            </div>
          </div>
        )}

        {/* Tabela */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : cobrancas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma cobrança registrada
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Vencimento</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Descrição</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground text-xs">Valor</th>
                  <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Status</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground text-xs hidden sm:table-cell">Pago em</th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.map((c) => {
                  const vencida = c.status === 'vencida'
                  return (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className={`py-2.5 pr-3 whitespace-nowrap ${vencida ? 'text-destructive font-medium' : ''}`}>
                        {formatarData(c.vencimento)}
                        {vencida && <XCircle size={12} className="inline ml-1 text-destructive" />}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground max-w-[160px] truncate">
                        {c.descricao ?? '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatarMoeda(c.valor)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={STATUS_COBRANCA_VARIANT[c.status]}>
                          {STATUS_COBRANCA_LABEL[c.status]}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                        {c.pagoEm ? formatarData(c.pagoEm) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonDetalhe() {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6 lg:p-8">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-muted" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 rounded-xl bg-muted" />
          <div className="h-60 rounded-xl bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlunoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [aluno, setAluno] = useState<AlunoDetalhado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [matriculando, setMatriculando] = useState(false)

  async function carregar() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await alunosService.buscarPorId(id)
      const data = (res.data as any)?.data ?? res.data
      setAluno(data)
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Aluno não encontrado.' : 'Erro ao carregar dados do aluno.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <SkeletonDetalhe />

  if (error || !aluno) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 p-4">
        <p className="text-sm text-muted-foreground">{error ?? 'Aluno não encontrado.'}</p>
        <Button variant="outline" onClick={() => navigate('/alunos')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para Alunos
        </Button>
      </div>
    )
  }

  const matriculasAtivas = aluno.matriculas.filter((m) => m.ativo)
  const responsavelPrincipal = aluno.responsaveis.find((r) => r.principal)
  const turmaAtual = aluno.turmas?.[0] ?? null
  const materialAtual = matriculasAtivas[0]?.nivelAtual.codigo ?? null
  const kpis = aluno.kpis
  const sessoes = aluno.sessoesAluno ?? []

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/alunos')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{aluno.nome}</h1>
              <Badge variant={aluno.ativo ? 'success' : 'secondary'}>
                {aluno.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              {kpis && <StatusBadge status={kpis.statusOperacional} />}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {calcularIdade(aluno.dataNascimento)} anos
              {materialAtual && <> · <span className="font-medium text-foreground">{materialAtual}</span></>}
              {turmaAtual && (
                <> · {DIAS[turmaAtual.turma.diaSemana] ?? turmaAtual.turma.diaSemana} {turmaAtual.turma.horarioInicio} <span className="text-xs">(desde {formatarData(turmaAtual.dataInicio)})</span></>
              )}
              {responsavelPrincipal && ` · Resp: ${responsavelPrincipal.responsavel.nome}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setEditando(true)} className="sm:shrink-0">
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Target className="h-4 w-4 text-blue-600" />}
            label="Taxa de acerto"
            value={kpis.taxaAcerto !== null ? `${kpis.taxaAcerto}%` : '—'}
            sub="média das sessões recentes"
            color="bg-blue-50"
          />
          <KpiCard
            icon={<Clock className="h-4 w-4 text-purple-600" />}
            label="Tempo médio"
            value={kpis.mediaTempo !== null ? formatarTempo(kpis.mediaTempo) : '—'}
            sub="por sessão"
            color="bg-purple-50"
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            label="Sessões registradas"
            value={String(kpis.totalSessoes)}
            sub={kpis.ultimaSessao ? `Última: ${formatarData(kpis.ultimaSessao)}` : 'Nenhuma ainda'}
            color="bg-green-50"
          />
          <KpiCard
            icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
            label="Dias sem sessão"
            value={kpis.diasSemSessao !== null ? `${kpis.diasSemSessao}d` : '—'}
            sub={kpis.diasSemSessao === 0 ? 'Sessão hoje' : kpis.diasSemSessao === 1 ? 'Sessão ontem' : undefined}
            color="bg-orange-50"
          />
        </div>
      )}

      {/* Alertas */}
      {kpis && <AlertasCard kpis={kpis} />}

      {/* Evolução */}
      <AlunoEvolucao sessoes={sessoes} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de Nascimento</dt>
                  <dd className="mt-1 text-sm">
                    {formatarData(aluno.dataNascimento)}{' '}
                    <span className="text-muted-foreground">({calcularIdade(aluno.dataNascimento)} anos)</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Série Escolar</dt>
                  <dd className="mt-1 text-sm">{aluno.serieEscolar ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Escola</dt>
                  <dd className="mt-1 text-sm">{aluno.escola ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Matrículas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Matrículas Ativas
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setMatriculando(true)}>
                  + Nova Matrícula
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {matriculasAtivas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma matrícula ativa</p>
              ) : (
                <ul className="space-y-3">
                  {matriculasAtivas.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                      <div>
                        <p className="text-sm font-medium">{m.materia.nome}</p>
                        <p className="text-xs text-muted-foreground">Desde {formatarData(m.dataInicio)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{m.nivelAtual.codigo}</p>
                        <p className="text-xs text-muted-foreground">{m.nivelAtual.descricao}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Histórico de sessões */}
          <HistoricoSessoes sessoes={sessoes} />

          {/* Histórico financeiro */}
          <HistoricoFinanceiro alunoId={aluno.id} />
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Exercícios */}
          <ExerciciosAluno alunoId={aluno.id} />
          {/* Responsáveis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsáveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aluno.responsaveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum responsável vinculado</p>
              ) : (
                <ul className="space-y-4">
                  {aluno.responsaveis.map(({ responsavel, parentesco, principal }) => (
                    <li key={responsavel.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/responsaveis/${responsavel.id}`} className="text-sm font-medium hover:underline">
                          {responsavel.nome}
                        </Link>
                        {principal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{parentesco}</p>
                      <p className="text-xs text-muted-foreground">{responsavel.email}</p>
                      <p className="text-xs text-muted-foreground">{formatarTelefone(responsavel.telefone)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Métricas de erros/acertos */}
          {kpis && (kpis.mediaAcertos !== null || kpis.mediaErros !== null) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desempenho médio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {kpis.mediaAcertos !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Acertos/sessão</span>
                    <span className="text-sm font-semibold text-green-700">
                      {kpis.mediaAcertos.toFixed(1)}
                    </span>
                  </div>
                )}
                {kpis.mediaErros !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Erros/sessão</span>
                    <span className="text-sm font-semibold text-red-600">
                      {kpis.mediaErros.toFixed(1)}
                    </span>
                  </div>
                )}
                {kpis.taxaAcerto !== null && (
                  <>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-muted-foreground">Taxa de acerto</span>
                        <span className="text-sm font-bold">{kpis.taxaAcerto}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            kpis.taxaAcerto >= 80 ? 'bg-green-500' :
                            kpis.taxaAcerto >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${kpis.taxaAcerto}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {editando && (
        <AlunoFormModal id={aluno.id} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); void carregar() }} />
      )}
      {matriculando && (
        <MatriculaModal alunoId={aluno.id} onClose={() => setMatriculando(false)} onSaved={() => { setMatriculando(false); void carregar() }} />
      )}
    </div>
  )
}
