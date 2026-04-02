import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock, Users, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { sessoesService } from '../../services/sessoes.service'

const DIAS: Record<string, string> = {
  segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira',
  quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
}

const STATUS_LABEL: Record<string, string> = {
  avancando_bem: 'Avançando bem',
  atencao: 'Atenção',
  estagnado: 'Estagnado',
  critico: 'Crítico',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'stagnant' | 'destructive'> = {
  avancando_bem: 'success',
  atencao: 'warning',
  estagnado: 'stagnant',
  critico: 'destructive',
}

interface AlunoSessao {
  id: string
  alunoId: string
  aluno: { id: string; nome: string }
  presente: boolean
  acertos?: number | null
  erros?: number | null
  tempoMinutos?: number | null
  materialCodigo?: string | null
  statusSessao?: string | null
  observacao?: string | null
  nivel?: { id: string; codigo: string; descricao: string } | null
}

interface SessaoDetalhada {
  id: string
  data: string
  observacoes?: string | null
  turma: { id: string; diaSemana: string; horarioInicio: string; horarioFim: string }
  assistente: { id: string; nome: string; email: string }
  alunos: AlunoSessao[]
}

function formatarData(iso: string): string {
  const parts = iso.split('T')[0]!.split('-')
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatarTempo(min: number): string {
  if (min < 60) return `${Math.round(min)}min`
  return `${Math.floor(min / 60)}h${Math.round(min % 60)}min`
}

function SkeletonDetalhe() {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6 lg:p-8">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  )
}

export default function SessaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sessao, setSessao] = useState<SessaoDetalhada | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    sessoesService.buscarPorId(id)
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data
        setSessao(data)
      })
      .catch((err: any) => {
        setError(err?.response?.status === 404 ? 'Sessão não encontrada.' : 'Erro ao carregar sessão.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <SkeletonDetalhe />

  if (error || !sessao) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 p-4">
        <p className="text-sm text-muted-foreground">{error ?? 'Sessão não encontrada.'}</p>
        <Button variant="outline" onClick={() => navigate('/sessoes')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para Sessões
        </Button>
      </div>
    )
  }

  const presentes = sessao.alunos.filter((a) => a.presente)
  const ausentes = sessao.alunos.filter((a) => !a.presente)

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sessoes')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sessão — {formatarData(sessao.data)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {DIAS[sessao.turma.diaSemana] ?? sessao.turma.diaSemana} · {sessao.turma.horarioInicio}–{sessao.turma.horarioFim} · Assistente: {sessao.assistente.nome}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total de alunos</p>
            <p className="text-lg font-bold">{sessao.alunos.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Presentes</p>
            <p className="text-lg font-bold text-green-700">{presentes.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ausentes</p>
            <p className="text-lg font-bold text-red-600">{ausentes.length}</p>
          </div>
        </div>
      </div>

      {/* Desempenho dos alunos presentes */}
      {presentes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Desempenho — Alunos Presentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Aluno</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Material</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Tempo</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Acertos</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Erros</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {presentes.map((a) => {
                    const variant = a.statusSessao ? STATUS_VARIANT[a.statusSessao] : null
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{a.aluno.nome}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {a.materialCodigo ?? a.nivel?.codigo ?? '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center text-muted-foreground">
                          {a.tempoMinutos != null ? formatarTempo(a.tempoMinutos) : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {a.acertos != null
                            ? <span className="font-medium text-green-700">{a.acertos}</span>
                            : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {a.erros != null
                            ? <span className="font-medium text-red-600">{a.erros}</span>
                            : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {variant
                            ? <Badge variant={variant}>{STATUS_LABEL[a.statusSessao!]}</Badge>
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ausentes */}
      {ausentes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              Ausentes ({ausentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {ausentes.map((a) => (
                <li key={a.id}>
                  <Badge variant="outline" className="text-muted-foreground">{a.aluno.nome}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {sessao.observacoes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sessao.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
