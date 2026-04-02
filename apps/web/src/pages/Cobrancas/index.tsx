import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import { cobrancasService, type Cobranca, type StatusCobranca } from '../../services/cobrancas.service'
import { alunosService } from '../../services/alunos.service'

const STATUS_LABELS: Record<StatusCobranca, string> = {
  aguardando: 'Aguardando',
  enviada: 'Enviada',
  paga: 'Paga',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

const STATUS_VARIANTS: Record<StatusCobranca, any> = {
  aguardando: 'outline',
  enviada: 'warning',
  paga: 'success',
  vencida: 'destructive',
  cancelada: 'secondary',
}

function formatarValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
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

interface ModalNovaCobrancaProps {
  onClose: () => void
  onSaved: () => void
}

function ModalNovaCobranca({ onClose, onSaved }: ModalNovaCobrancaProps) {
  const [alunos, setAlunos] = useState<any[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [alunoId, setAlunoId] = useState('')
  const [valorRaw, setValorRaw] = useState('')
  const [vencimento, setVencimento] = useState(hoje())
  const [descricao, setDescricao] = useState('')
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
    if (!alunoId || !vencimento || isNaN(valorNum) || valorNum <= 0) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    setLoading(true)
    try {
      await cobrancasService.criar({ alunoId, valor: valorNum, vencimento, descricao: descricao.trim() || undefined })
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar cobrança.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Nova Cobrança</h2>
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
              <Label>Aluno *</Label>
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
                <Label>Vencimento *</Label>
                <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Mensalidade Abril 2026" />
            </div>

            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground text-center">
                A integração com gateway de pagamento está preparada para configuração futura.
                Atualmente, as cobranças são gerenciadas manualmente.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Cobrança'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const PAGE_SIZE = 15

export default function CobrancasPage() {
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
      const res = await cobrancasService.listar({ status: status || undefined, page: p, pageSize: PAGE_SIZE })
      setResult((res.data as any)?.data ?? res.data)
    } catch {
      setError('Erro ao carregar cobranças.')
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

  const handleRegistrarPagamento = async (id: string) => {
    try {
      await cobrancasService.registrarPagamento(id, hoje())
      void fetchData(filtroStatus, page)
    } catch {
      setError('Erro ao registrar pagamento.')
    }
  }

  const handleCancelar = async (id: string) => {
    if (!confirm('Cancelar esta cobrança?')) return
    try {
      await cobrancasService.cancelar(id)
      void fetchData(filtroStatus, page)
    } catch {
      setError('Erro ao cancelar cobrança.')
    }
  }

  const totalPaginas = result?.totalPaginas ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobranças"
        subtitle="Gerencie boletos e cobranças dos alunos"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nova Cobrança
          </Button>
        }
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-700">
          <strong>Fase 2 — Cobranças:</strong> Estrutura preparada para integração com gateway de pagamento (Asaas, PagSeguro, etc.).
          Atualmente funciona como controle manual.
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : result?.data?.length > 0 ? (
                result.data.map((c: Cobranca) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AlunoAvatar nome={c.aluno.nome} foto={c.aluno.foto} size="sm" />
                        <span className="font-medium">{c.aluno.nome}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{c.descricao ?? '—'}</td>
                    <td className="px-4 py-3">{formatarData(c.vencimento)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatarValor(Number(c.valor))}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status !== 'paga' && c.status !== 'cancelada' && (
                          <Button variant="outline" size="sm" onClick={() => handleRegistrarPagamento(c.id)}>
                            Pago
                          </Button>
                        )}
                        {c.status !== 'paga' && c.status !== 'cancelada' && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancelar(c.id)} className="text-muted-foreground">
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={<Receipt className="h-10 w-10" />}
                      title="Nenhuma cobrança encontrada"
                      description="Crie cobranças para controlar os pagamentos dos alunos."
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
        <ModalNovaCobranca
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); void fetchData(filtroStatus, page) }}
        />
      )}
    </div>
  )
}
