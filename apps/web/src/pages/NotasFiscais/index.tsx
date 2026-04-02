import { useState, useEffect, useCallback } from 'react'
import { Landmark, Plus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import { notasFiscaisService, type NotaFiscal, type StatusNotaFiscal } from '../../services/notas-fiscais.service'
import { alunosService } from '../../services/alunos.service'

const STATUS_LABELS: Record<StatusNotaFiscal, string> = {
  rascunho: 'Rascunho',
  emitida: 'Emitida',
  cancelada: 'Cancelada',
}

const STATUS_VARIANTS: Record<StatusNotaFiscal, any> = {
  rascunho: 'outline',
  emitida: 'success',
  cancelada: 'secondary',
}

function formatarValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
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

interface ModalNFProps {
  onClose: () => void
  onSaved: () => void
}

function ModalNF({ onClose, onSaved }: ModalNFProps) {
  const [alunos, setAlunos] = useState<any[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [alunoId, setAlunoId] = useState('')
  const [valorRaw, setValorRaw] = useState('')
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7))
  const [descricao, setDescricao] = useState('Serviços educacionais — Kumon')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await alunosService.listar({ ativo: true, pageSize: 100 })
        setAlunos((res.data as any)?.data?.data ?? [])
      } catch {
        setError('Erro ao carregar alunos.')
      } finally {
        setLoadingInit(false)
      }
    }
    void init()
  }, [])

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { setValorRaw(''); return }
    const num = parseInt(digits, 10)
    setValorRaw((num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const valorNum = parseFloat(valorRaw.replace(/\./g, '').replace(',', '.'))
    if (!alunoId || !competencia || isNaN(valorNum) || valorNum <= 0) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    setLoading(true)
    try {
      await notasFiscaisService.criar({ alunoId, valor: valorNum, competencia: competencia + '-01', descricao: descricao.trim() || undefined })
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar nota fiscal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Nova Nota Fiscal</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"><X size={16} /></button>
        </div>

        {loadingInit ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="space-y-1.5">
              <Label>Aluno / Tomador *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={alunoId}
                onChange={(e) => setAlunoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="text" inputMode="numeric" placeholder="0,00" value={valorRaw} onChange={handleValorChange} />
              </div>
              <div className="space-y-1.5">
                <Label>Competência *</Label>
                <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição do Serviço</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>

            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                Integração com prefeitura preparada para fase futura.
                A nota será criada como rascunho.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Rascunho'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const PAGE_SIZE = 15

export default function NotasFiscaisPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchData = useCallback(async (status: string, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await notasFiscaisService.listar({ status: status || undefined, page: p, pageSize: PAGE_SIZE })
      setResult((res.data as any)?.data ?? res.data)
    } catch {
      setError('Erro ao carregar notas fiscais.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    void fetchData(filtroStatus, 1)
  }, [filtroStatus, fetchData])

  useEffect(() => {
    void fetchData(filtroStatus, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleEmitir = async (id: string) => {
    try {
      await notasFiscaisService.atualizar(id, { status: 'emitida' })
      void fetchData(filtroStatus, page)
    } catch {
      setError('Erro ao emitir nota fiscal.')
    }
  }

  const totalPaginas = result?.totalPaginas ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas Fiscais"
        subtitle="Faturamento e emissão de NFS-e"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nova NF
          </Button>
        }
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-700">
          <strong>Notas Fiscais:</strong> Estrutura pronta para integração com a prefeitura via API NFS-e.
          Crie rascunhos agora e configure a emissão automática futuramente.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Competência</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : result?.data?.length > 0 ? (
                result.data.map((nf: NotaFiscal) => (
                  <tr key={nf.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AlunoAvatar nome={nf.aluno.nome} foto={nf.aluno.foto} size="sm" />
                        <span className="font-medium">{nf.aluno.nome}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{nf.descricao ?? '—'}</td>
                    <td className="px-4 py-3 capitalize">{formatarData(nf.competencia)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatarValor(Number(nf.valor))}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[nf.status]}>{STATUS_LABELS[nf.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {nf.status === 'rascunho' && (
                        <Button variant="outline" size="sm" onClick={() => handleEmitir(nf.id)}>
                          Emitir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={<Landmark className="h-10 w-10" />}
                      title="Nenhuma nota fiscal encontrada"
                      description="Crie notas fiscais para faturar os serviços prestados."
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
        <ModalNF
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); void fetchData(filtroStatus, page) }}
        />
      )}
    </div>
  )
}
