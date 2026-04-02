import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Eye, CalendarDays, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { sessoesService, type SessaoLista } from '../../services/sessoes.service'
import SessaoFormModal from './SessaoFormModal'

const DIAS: Record<string, string> = {
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
}

const PAGE_SIZE = 20

interface PaginatedResult {
  data: SessaoLista[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function formatarData(iso: string): string {
  const parts = iso.split('T')[0]!.split('-')
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatarHorario(h: string): string {
  return h.slice(0, 5)
}

function PresencaBadge({ presentes, total }: { presentes: number; total: number }) {
  if (total === 0) return <Badge variant="outline">Sem alunos</Badge>
  if (presentes === 0) return <Badge variant="outline" className="text-muted-foreground">Não registrado</Badge>
  if (presentes >= total) return <Badge variant="success">{presentes}/{total} presentes</Badge>
  return <Badge variant="warning">{presentes}/{total} presentes</Badge>
}

function formatarTempo(min: number): string {
  if (min < 60) return `${min}min`
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}min` : ''}`
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

export default function SessoesPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [result, setResult] = useState<PaginatedResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (inicio: string, fim: string, pageVal: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await sessoesService.listar({
        dataInicio: inicio || undefined,
        dataFim: fim || undefined,
        page: pageVal,
        pageSize: PAGE_SIZE,
      })
      const payload = (res.data as any)?.data ?? res.data
      setResult({
        data: payload.data ?? [],
        total: payload.total ?? 0,
        page: payload.page ?? pageVal,
        pageSize: payload.pageSize ?? PAGE_SIZE,
        totalPages: payload.totalPages ?? Math.ceil((payload.total ?? 0) / PAGE_SIZE),
      })
    } catch {
      setError('Erro ao carregar sessões. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(dataInicio, dataFim, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function handleFiltrar() {
    setPage(1)
    void fetchData(dataInicio, dataFim, 1)
  }

  function handleLimpar() {
    setDataInicio('')
    setDataFim('')
    setPage(1)
    void fetchData('', '', 1)
  }

  const totalPages = result?.totalPages ?? 1

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Sessões"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nova Sessão
          </Button>
        }
      />

      {/* Filtros */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataInicio">Data início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full sm:w-44"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataFim">Data fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full sm:w-44"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFiltrar} disabled={loading}>Filtrar</Button>
            {(dataInicio || dataFim) && (
              <Button variant="outline" onClick={handleLimpar} disabled={loading}>Limpar</Button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Turma</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Horário</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Presença</th>
                <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground lg:table-cell">Acertos</th>
                <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground lg:table-cell">Erros</th>
                <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground xl:table-cell">Tempo médio</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : result && result.data.length > 0 ? (
                result.data.map((sessao) => {
                  const diaNome = DIAS[sessao.turma.diaSemana] ?? sessao.turma.diaSemana
                  const total = sessao.presentes + sessao.ausentes
                  return (
                    <tr key={sessao.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{formatarData(sessao.data)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{diaNome}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatarHorario(sessao.turma.horarioInicio)}–{formatarHorario(sessao.turma.horarioFim)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PresencaBadge presentes={sessao.presentes} total={total} />
                      </td>
                      <td className="hidden px-4 py-3 text-center lg:table-cell">
                        {sessao.mediaAcertos !== null
                          ? <span className="font-medium text-green-700">{sessao.mediaAcertos}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="hidden px-4 py-3 text-center lg:table-cell">
                        {sessao.mediaErros !== null
                          ? <span className="font-medium text-red-600">{sessao.mediaErros}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="hidden px-4 py-3 text-center xl:table-cell text-muted-foreground">
                        {sessao.mediaTempo !== null ? formatarTempo(sessao.mediaTempo) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" asChild title="Ver detalhes">
                          <Link to={`/sessoes/${sessao.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12">
                    <EmptyState
                      icon={<CalendarDays className="h-10 w-10" />}
                      title="Nenhuma sessão encontrada"
                      description={
                        dataInicio || dataFim
                          ? 'Tente ajustar o intervalo de datas.'
                          : 'Nenhuma sessão registrada ainda.'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {result.total} sessão{result.total !== 1 ? 'ões' : ''} encontrada{result.total !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <SessaoFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false)
            void fetchData(dataInicio, dataFim, 1)
          }}
        />
      )}
    </div>
  )
}
