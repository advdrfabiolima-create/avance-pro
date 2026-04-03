import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Eye, Pencil, Search, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { responsaveisService } from '../../services/responsaveis.service'
import ResponsavelFormModal from './ResponsavelFormModal'

interface AlunoVinculo {
  aluno: { id: string; nome: string }
  parentesco: string
  principal: boolean
}

interface Responsavel {
  id: string
  nome: string
  cpf: string
  email: string
  telefone: string
  telefoneAlt?: string | null
  alunos: AlunoVinculo[]
}

interface Paginado {
  data: Responsavel[]
  total: number
  page: number
  pageSize: number
  totalPaginas: number
}

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatTelefone(tel: string): string {
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel
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

const PAGE_SIZE = 15

export default function ResponsaveisPage() {
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Responsavel[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (buscaVal: string, pageVal: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await responsaveisService.listar({
        busca: buscaVal || undefined,
        page: pageVal,
        pageSize: PAGE_SIZE,
      })
      const body = res.data as any
      const paginado: Paginado = body?.data ?? body
      setData(Array.isArray(paginado?.data) ? paginado.data : [])
      setTotal(paginado?.total ?? 0)
      setTotalPaginas(paginado?.totalPaginas ?? 1)
    } catch {
      setError('Erro ao carregar responsáveis. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      void fetchData(busca, 1)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [busca, fetchData])

  useEffect(() => {
    void fetchData(busca, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSaved = () => {
    setEditingId(null)
    setShowCreate(false)
    void fetchData(busca, page)
  }

  const handleExcluir = async (r: Responsavel) => {
    const msg = r.alunos.length > 0
      ? `Excluir "${r.nome}"? Os ${r.alunos.length} aluno(s) vinculado(s) também serão desativados. Esta ação não pode ser desfeita.`
      : `Excluir o responsável "${r.nome}"? Esta ação não pode ser desfeita.`
    if (!confirm(msg)) return
    try {
      await responsaveisService.excluir(r.id)
      void fetchData(busca, page)
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao excluir responsável.')
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Responsáveis"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Novo Responsável
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou email..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">CPF</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Email</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Alunos</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : data.length > 0 ? (
                data.map((r) => {
                  const alunos = r.alunos ?? []
                  const primeiros = alunos.slice(0, 2)
                  const extras = alunos.length - 2
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.nome}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatCpf(r.cpf)}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{r.email}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {formatTelefone(r.telefone)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {primeiros.map(({ aluno }) => (
                            <Badge key={aluno.id} variant="secondary" className="text-xs">
                              {aluno.nome}
                            </Badge>
                          ))}
                          {extras > 0 && (
                            <Badge variant="outline" className="text-xs">+{extras} mais</Badge>
                          )}
                          {alunos.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="Ver detalhes">
                            <Link to={`/responsaveis/${r.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => setEditingId(r.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleExcluir(r)}
                          >
                            <Trash2 className="h-4 w-4" />
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
                      title="Nenhum responsável encontrado"
                      description={
                        busca
                          ? 'Tente ajustar os termos da busca.'
                          : 'Cadastre o primeiro responsável clicando em "Novo Responsável".'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm">{page} / {totalPaginas}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPaginas || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <ResponsavelFormModal
          id={null}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {editingId !== null && (
        <ResponsavelFormModal
          id={editingId}
          onClose={() => setEditingId(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
