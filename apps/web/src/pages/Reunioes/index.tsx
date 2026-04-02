import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, X, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import { reunioesService, type Reuniao } from '../../services/reunioes.service'
import { alunosService } from '../../services/alunos.service'
import { responsaveisService } from '../../services/responsaveis.service'
import { useAuthStore } from '../../store/auth.store'

const TIPO_LABELS: Record<string, string> = {
  geral: 'Geral',
  desempenho: 'Desempenho',
  financeiro: 'Financeiro',
  comportamento: 'Comportamento',
  outro: 'Outro',
}

const TIPO_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  geral: 'secondary',
  desempenho: 'success',
  financeiro: 'warning',
  comportamento: 'outline',
  outro: 'secondary',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 rounded bg-muted" /></td>
      ))}
    </tr>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalReuniaoProps {
  id: string | null
  onClose: () => void
  onSaved: () => void
}

function ModalReuniao({ id, onClose, onSaved }: ModalReuniaoProps) {
  const usuario = useAuthStore((s) => s.usuario)
  const [alunos, setAlunos] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [alunoId, setAlunoId] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [tipo, setTipo] = useState('geral')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const [resAlunos, resResp] = await Promise.all([
          alunosService.listar({ ativo: true, pageSize: 100 }),
          responsaveisService.listar({ pageSize: 100 }),
        ])
        const alunosData = (resAlunos.data as any)?.data?.data ?? []
        const respData = (resResp.data as any)?.data?.data ?? []
        setAlunos(alunosData)
        setResponsaveis(respData)

        if (id) {
          const resReuniao = await reunioesService.buscarPorId(id)
          const r = (resReuniao.data as any)?.data ?? resReuniao.data
          setAlunoId(r.alunoId)
          setResponsavelId(r.responsavelId ?? '')
          setData(r.data.slice(0, 10))
          setTipo(r.tipo)
          setDescricao(r.descricao)
        }
      } catch {
        setError('Erro ao carregar dados.')
      } finally {
        setLoadingInit(false)
      }
    }
    void init()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!alunoId || !data || !descricao.trim()) {
      setError('Aluno, data e descrição são obrigatórios.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        alunoId,
        responsavelId: responsavelId || undefined,
        usuarioId: usuario!.id,
        data,
        descricao: descricao.trim(),
        tipo,
      }
      if (id) {
        await reunioesService.atualizar(id, payload)
      } else {
        await reunioesService.criar(payload)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao salvar reunião.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{id ? 'Editar Reunião' : 'Nova Reunião'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"><X size={16} /></button>
        </div>

        {loadingInit ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="aluno">Aluno *</Label>
                <select
                  id="aluno"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={alunoId}
                  onChange={(e) => setAlunoId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsavel">Responsável</Label>
                <select
                  id="responsavel"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dataReuniao">Data *</Label>
                <Input id="dataReuniao" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição / Anotações *</Label>
              <textarea
                id="descricao"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Descreva o que foi discutido na reunião..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export default function ReunioesPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalId, setModalId] = useState<string | null>(null)

  const fetchData = useCallback(async (tipo: string, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await reunioesService.listar({ tipo: tipo || undefined, page: p, pageSize: PAGE_SIZE })
      setResult((res.data as any)?.data ?? res.data)
    } catch {
      setError('Erro ao carregar reuniões.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    void fetchData(filtroTipo, 1)
  }, [filtroTipo, fetchData])

  useEffect(() => {
    void fetchData(filtroTipo, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleExcluir = async (id: string) => {
    if (!confirm('Excluir esta reunião?')) return
    try {
      await reunioesService.excluir(id)
      void fetchData(filtroTipo, page)
    } catch {
      setError('Erro ao excluir reunião.')
    }
  }

  const totalPaginas = result?.totalPaginas ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reuniões"
        subtitle="Histórico de reuniões e atendimentos com responsáveis"
        actions={
          <Button onClick={() => { setModalId(null); setModalOpen(true) }}>
            <Plus size={14} /> Nova Reunião
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <Label htmlFor="filtroTipo">Tipo</Label>
          <select
            id="filtroTipo"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Responsável</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Registro por</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : result?.data?.length > 0 ? (
                result.data.map((r: Reuniao) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AlunoAvatar nome={r.aluno.nome} foto={r.aluno.foto} size="sm" />
                        <span className="font-medium">{r.aluno.nome}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {r.responsavel?.nome ?? <span className="italic opacity-50">—</span>}
                    </td>
                    <td className="px-4 py-3">{formatarData(r.data)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={TIPO_VARIANTS[r.tipo] ?? 'secondary'}>{TIPO_LABELS[r.tipo] ?? r.tipo}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{r.usuario.nome}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setModalId(r.id); setModalOpen(true) }}>
                          <Plus size={14} className="rotate-45" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleExcluir(r.id)} className="text-destructive hover:text-destructive">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={<MessageSquare className="h-10 w-10" />}
                      title="Nenhuma reunião registrada"
                      description="Registre o histórico de reuniões com responsáveis."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result && totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">{result.total} registro{result.total !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span className="text-sm">{page} / {totalPaginas}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPaginas || loading} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalReuniao
          id={modalId}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); void fetchData(filtroTipo, page) }}
        />
      )}
    </div>
  )
}
