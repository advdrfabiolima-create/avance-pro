import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  ChevronRight,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert'
import { StatusBadge, StatusDot, getStatusSeverity } from '../components/shared/StatusBadge'
import { useAuthStore } from '../store/auth.store'
import {
  buscarSessoesHoje,
  buscarInadimplentes,
  buscarAlunosOperacional,
} from '../services/dashboard.service'
import type {
  SessaoHoje,
  Inadimplente,
  AlunoOperacional,
} from '../services/dashboard.service'

function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatarDataAtual(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card shadow animate-pulse p-5">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-12 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  sub?: string
  to?: string
}

function StatCard({ label, value, icon, iconBg, iconColor, sub, to }: StatCardProps) {
  const inner = (
    <Card className={to ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="tp-label mb-2">{label}</p>
            <p className="tp-stat-value">{value}</p>
            {sub && <p className="tp-caption mt-1.5">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  if (to) return <Link to={to}>{inner}</Link>
  return inner
}

// ─── Alertas de Alunos ────────────────────────────────────────────────────────

function AlertasAlunos({ alunos }: { alunos: AlunoOperacional[] }) {
  const comAlerta = alunos
    .filter((a) => a.statusOperacional !== 'avancando_bem' && a.statusOperacional !== 'sem_dados')
    .sort((a, b) => getStatusSeverity(a.statusOperacional) - getStatusSeverity(b.statusOperacional))
    .slice(0, 8)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Alunos que precisam de atenção
          </CardTitle>
          {comAlerta.length > 0 && (
            <Link to="/alunos" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {comAlerta.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle className="h-10 w-10 text-green-500/70" />
            <p className="text-[14px] font-semibold text-[#334155]">Todos os alunos em dia!</p>
            <p className="tp-secondary">Nenhum aluno precisa de atenção agora.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {comAlerta.map((aluno) => (
              <li key={aluno.id}>
                <Link
                  to={`/alunos/${aluno.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 gap-3 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusDot status={aluno.statusOperacional} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1E293B] truncate">{aluno.nome}</p>
                      <p className="tp-secondary">
                        {aluno.diasSemSessao !== null
                          ? aluno.diasSemSessao === 0
                            ? 'Sessão hoje'
                            : `Há ${aluno.diasSemSessao} dia${aluno.diasSemSessao !== 1 ? 's' : ''} sem sessão`
                          : 'Sem sessões registradas'}
                        {aluno.matriculaAtiva && (
                          <span className="ml-1 text-muted-foreground/60">
                            · {aluno.matriculaAtiva.materia.nome} {aluno.matriculaAtiva.nivelAtual.codigo}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={aluno.statusOperacional} />
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Sessões de Hoje ──────────────────────────────────────────────────────────

function SessoesHojeCard({ sessoes }: { sessoes: SessaoHoje[] }) {
  function getBadge(s: SessaoHoje) {
    if (s.totalAlunos === 0) return <Badge variant="outline">Sem alunos</Badge>
    if (s.presentes === 0) return <Badge variant="outline" className="text-muted-foreground">Não registrado</Badge>
    if (s.presentes >= s.totalAlunos) return <Badge variant="success">{s.presentes}/{s.totalAlunos}</Badge>
    return <Badge variant="warning">{s.presentes}/{s.totalAlunos}</Badge>
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-blue-500" />
          Sessões de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {sessoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50" />
            <p className="tp-secondary">Nenhuma sessão hoje</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessoes.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border p-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#1E293B] capitalize">{s.turma.diaSemana}</p>
                  <p className="tp-secondary">
                    {s.turma.horarioInicio} – {s.turma.horarioFim}
                  </p>
                </div>
                {getBadge(s)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Evolução Recente ─────────────────────────────────────────────────────────

function EvolucaoRecenteCard({ alunos }: { alunos: AlunoOperacional[] }) {
  const melhorando = alunos.filter((a) => a.tendencia === 'subindo').slice(0, 5)
  const piorando = alunos.filter((a) => a.tendencia === 'caindo').slice(0, 5)

  if (melhorando.length === 0 && piorando.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          Evolução Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Melhorando */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                Melhorando ({melhorando.length})
              </p>
            </div>
            {melhorando.length === 0 ? (
              <p className="tp-secondary py-2">Nenhum aluno com melhora detectada.</p>
            ) : (
              <ul className="space-y-2">
                {melhorando.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/alunos/${a.id}`}
                      className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50/50 px-3 py-2 gap-3 hover:bg-green-50 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-[#1E293B] truncate">{a.nome}</p>
                        {a.matriculaAtiva && (
                          <p className="tp-secondary">
                            {a.matriculaAtiva.materia.nome} · {a.matriculaAtiva.nivelAtual.codigo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Piorando */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                Piorando ({piorando.length})
              </p>
            </div>
            {piorando.length === 0 ? (
              <p className="tp-secondary py-2">Nenhum aluno com piora detectada.</p>
            ) : (
              <ul className="space-y-2">
                {piorando.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/alunos/${a.id}`}
                      className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 gap-3 hover:bg-red-50 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-[#1E293B] truncate">{a.nome}</p>
                        {a.matriculaAtiva && (
                          <p className="tp-secondary">
                            {a.matriculaAtiva.materia.nome} · {a.matriculaAtiva.nivelAtual.codigo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Inadimplência ────────────────────────────────────────────────────────────

function InadimplenciaCard({ inadimplentes }: { inadimplentes: Inadimplente[] }) {
  const top5 = inadimplentes.slice(0, 5)
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Inadimplência</CardTitle>
          {inadimplentes.length > 0 && (
            <Link to="/pagamentos?status=vencido" className="text-xs text-primary hover:underline">
              Ver todos ({inadimplentes.length})
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {inadimplentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle className="h-8 w-8 text-green-500/70" />
            <p className="tp-secondary">Nenhuma inadimplência</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {top5.map((item) => (
              <li
                key={item.alunoId}
                className="flex items-center justify-between rounded-lg border p-3 gap-3"
              >
                <p className="text-[14px] font-medium text-[#1E293B] truncate">{item.nome}</p>
                <span className="text-[14px] font-semibold text-destructive shrink-0">
                  {formatarMoeda(item.totalDevido)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const [alunos, setAlunos] = useState<AlunoOperacional[]>([])
  const [sessoesHoje, setSessoesHoje] = useState<SessaoHoje[]>([])
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function carregarDados() {
    setLoading(true)
    setError(null)
    try {
      const [alunosData, sessoesData, inadimplentesData] = await Promise.all([
        buscarAlunosOperacional(),
        buscarSessoesHoje(),
        buscarInadimplentes(),
      ])
      setAlunos(alunosData)
      setSessoesHoje(sessoesData)
      setInadimplentes(inadimplentesData)
    } catch {
      setError('Erro ao carregar dados do painel. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void carregarDados()
  }, [])

  const primeiroNome = usuario?.nome.split(' ')[0] ?? 'usuário'

  // Contadores derivados dos alunos
  const totalAtivos = alunos.length
  const criticos = alunos.filter((a) => a.statusOperacional === 'critico').length
  const emAtencao = alunos.filter((a) => a.statusOperacional === 'atencao' || a.statusOperacional === 'estagnado').length
  const avancando = alunos.filter((a) => a.statusOperacional === 'avancando_bem').length

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="tp-page-title">
            {getSaudacao()}, {primeiroNome}!
          </h1>
          <p className="tp-secondary capitalize mt-1">
            {formatarDataAtual()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void carregarDados()}
          disabled={loading}
          className="shrink-0 mt-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Algo deu errado</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : !error ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Alunos Ativos"
            value={totalAtivos}
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            to="/alunos"
          />
          <StatCard
            label="Críticos"
            value={criticos}
            icon={<AlertTriangle className="h-5 w-5" />}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            sub={criticos > 0 ? 'Requerem ação imediata' : 'Nenhum aluno crítico'}
            to="/alunos"
          />
          <StatCard
            label="Em Atenção"
            value={emAtencao}
            icon={<AlertCircle className="h-5 w-5" />}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-600"
            sub={emAtencao > 0 ? 'Monitorar de perto' : 'Todos em dia'}
          />
          <StatCard
            label="Avançando Bem"
            value={avancando}
            icon={<TrendingUp className="h-5 w-5" />}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
        </div>
      ) : null}

      {/* Conteúdo principal */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="h-5 w-48 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent><SkeletonList /></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent><SkeletonList /></CardContent>
          </Card>
        </div>
      ) : !error ? (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AlertasAlunos alunos={alunos} />
            </div>
            <SessoesHojeCard sessoes={sessoesHoje} />
          </div>

          <EvolucaoRecenteCard alunos={alunos} />

          <InadimplenciaCard inadimplentes={inadimplentes} />
        </>
      ) : null}
    </div>
  )
}
