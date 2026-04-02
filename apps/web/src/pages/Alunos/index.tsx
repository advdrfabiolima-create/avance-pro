import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, Pencil, Search, GraduationCap, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { StatusBadge, StatusDot } from '../../components/shared/StatusBadge'
import type { StatusOperacional } from '../../components/shared/StatusBadge'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import { alunosService } from '../../services/alunos.service'
import AlunoFormModal from './AlunoFormModal'

interface MatriculaAtiva {
  materia: { id: string; nome: string; codigo: string }
  nivelAtual: { id: string; codigo: string; descricao: string }
}

interface AlunoLista {
  id: string
  nome: string
  dataNascimento: string
  foto?: string | null
  ativo: boolean
  matriculaAtiva?: MatriculaAtiva | null
  ultimaSessao?: string | null
  diasSemSessao?: number | null
  statusOperacional?: StatusOperacional
  tendencia?: 'subindo' | 'caindo' | 'estavel' | null
}

interface ListaResult {
  data: AlunoLista[]
  total: number
  totalPaginas: number
  page: number
}

function calcularIdade(dataNascimento: string): number {
  // Extrair partes da data diretamente para evitar problemas de fuso horário
  const partes = dataNascimento.split('T')[0]!.split('-')
  const ano = parseInt(partes[0]!)
  const mes = parseInt(partes[1]!) - 1 // 0-indexed
  const dia = parseInt(partes[2]!)
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  const m = hoje.getMonth() - mes
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) idade--
  return idade
}

function formatarUltimaSessao(diasSemSessao: number | null | undefined): string {
  if (diasSemSessao === null || diasSemSessao === undefined) return '—'
  if (diasSemSessao === 0) return 'Hoje'
  if (diasSemSessao === 1) return 'Ontem'
  return `${diasSemSessao}d atrás`
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

export default function AlunosPage() {
  const [busca, setBusca] = useState('')
  const [apenasAtivos, setApenasAtivos] = useState(true)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ListaResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalId, setModalId] = useState<string | null | undefined>(undefined)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const PAGE_SIZE = 15

  const fetchData = useCallback(
    async (buscaVal: string, pageVal: number, ativo: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const res = await alunosService.listar({
          busca: buscaVal || undefined,
          ativo,
          page: pageVal,
          pageSize: PAGE_SIZE,
        })
        const payload = (res.data as any)?.data ?? res.data
        setResult({
          data: payload.data ?? [],
          total: payload.total ?? 0,
          totalPaginas: payload.totalPaginas ?? Math.ceil((payload.total ?? 0) / PAGE_SIZE),
          page: payload.page ?? pageVal,
        })
      } catch {
        setError('Erro ao carregar alunos. Tente novamente.')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      void fetchData(busca, 1, apenasAtivos)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [busca, apenasAtivos, fetchData])

  useEffect(() => {
    void fetchData(busca, page, apenasAtivos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSaved = () => {
    setModalId(undefined)
    void fetchData(busca, page, apenasAtivos)
  }

  const totalPages = result?.totalPaginas ?? 1

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Alunos"
        actions={
          <Button onClick={() => setModalId(null)}>
            <Plus className="h-4 w-4" />
            Novo Aluno
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={apenasAtivos}
            onChange={(e) => setApenasAtivos(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm text-muted-foreground">Apenas ativos</span>
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Matéria / Nível</th>
                <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground xl:table-cell">Tendência</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Última sessão</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : result && result.data.length > 0 ? (
                result.data.map((aluno) => {
                  const status = aluno.statusOperacional ?? 'sem_dados'
                  return (
                    <tr
                      key={aluno.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <AlunoAvatar nome={aluno.nome} foto={aluno.foto} size="sm" />
                            <StatusDot status={status} className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card" />
                          </div>
                          <div>
                            <p className="font-medium">{aluno.nome}</p>
                            {aluno.dataNascimento && (
                              <p className="text-xs text-muted-foreground">
                                {calcularIdade(aluno.dataNascimento)} anos
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {aluno.matriculaAtiva ? (
                          <div>
                            <p className="font-medium">{aluno.matriculaAtiva.materia.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{aluno.matriculaAtiva.nivelAtual.codigo}</span>
                              {' · '}{aluno.matriculaAtiva.nivelAtual.descricao}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-center xl:table-cell">
                        {aluno.tendencia === 'subindo' && (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
                            <TrendingUp className="h-4 w-4" /> Subindo
                          </span>
                        )}
                        {aluno.tendencia === 'caindo' && (
                          <span className="inline-flex items-center gap-1 text-red-500 font-medium text-sm">
                            <TrendingDown className="h-4 w-4" /> Caindo
                          </span>
                        )}
                        {aluno.tendencia === 'estavel' && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                            <Minus className="h-4 w-4" /> Estável
                          </span>
                        )}
                        {!aluno.tendencia && (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatarUltimaSessao(aluno.diasSemSessao)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="Ver detalhes">
                            <Link to={`/alunos/${aluno.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => setModalId(aluno.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={<GraduationCap className="h-10 w-10" />}
                      title="Nenhum aluno encontrado"
                      description={
                        busca
                          ? 'Tente ajustar os termos da busca.'
                          : 'Cadastre o primeiro aluno clicando em "Novo Aluno".'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result && result.totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {result.total} aluno{result.total !== 1 ? 's' : ''} encontrado{result.total !== 1 ? 's' : ''}
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

      {modalId !== undefined && (
        <AlunoFormModal
          id={modalId}
          onClose={() => setModalId(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
