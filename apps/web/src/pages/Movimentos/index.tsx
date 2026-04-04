import { useState, useEffect, useCallback } from 'react'
import { ArrowLeftRight, Plus, X, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { movimentosService, type TipoMovimento, type OrigemMovimento, type StatusMovimento } from '../../services/movimentos.service'

const ORIGEM_LABELS: Record<string, string> = {
  mensalidade: 'Mensalidade',
  matricula: 'Matrícula',
  material: 'Material',
  salario: 'Salário',
  aluguel: 'Aluguel',
  servico: 'Serviço',
  outro: 'Outro',
}

const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
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
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 rounded bg-muted" /></td>
      ))}
    </tr>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalMovimentoProps {
  onClose: () => void
  onSaved: () => void
}

function ModalMovimento({ onClose, onSaved }: ModalMovimentoProps) {
  const [tipo, setTipo] = useState<TipoMovimento>('entrada')
  const [origem, setOrigem] = useState<OrigemMovimento>('outro')
  const [descricao, setDescricao] = useState('')
  const [valorRaw, setValorRaw] = useState('')
  const [data, setData] = useState(hoje())
  const [status, setStatus] = useState<StatusMovimento>('confirmado')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (!descricao.trim() || !data || isNaN(valorNum) || valorNum <= 0) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    setLoading(true)
    try {
      await movimentosService.criar({ tipo, origem, descricao: descricao.trim(), valor: valorNum, data, status, observacao: observacao.trim() || undefined })
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao salvar movimento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Novo Movimento</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo('entrada')}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${tipo === 'entrada' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-muted hover:border-muted-foreground/30'}`}
            >
              <TrendingUp size={15} /> Entrada
            </button>
            <button
              type="button"
              onClick={() => setTipo('saida')}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${tipo === 'saida' ? 'border-red-500 bg-red-50 text-red-700' : 'border-muted hover:border-muted-foreground/30'}`}
            >
              <TrendingDown size={15} /> Saída
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="origem">Origem</Label>
              <select
                id="origem"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={origem}
                onChange={(e) => setOrigem(e.target.value as OrigemMovimento)}
              >
                {Object.entries(ORIGEM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataMovimento">Data *</Label>
              <Input id="dataMovimento" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="descricaoMov">Descrição *</Label>
              <Input id="descricaoMov" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Mensalidade Março — João Silva" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valorMov">Valor (R$) *</Label>
              <Input id="valorMov" type="text" inputMode="numeric" placeholder="0,00" value={valorRaw} onChange={handleValorChange} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="statusMov">Status</Label>
              <select
                id="statusMov"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusMovimento)}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="obsMov">Observação</Label>
              <textarea
                id="obsMov"
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Informações adicionais..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export default function MovimentosPage({ embedded = false }: { embedded?: boolean }) {
  const [result, setResult] = useState<any>(null)
  const [resumo, setResumo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filtroTipo, setFiltroTipo] = useState<'' | TipoMovimento>('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchData = useCallback(async (tipo: string, status: string, inicio: string, fim: string, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const [resLista, resResumo] = await Promise.all([
        movimentosService.listar({
          tipo: tipo as TipoMovimento || undefined,
          status: status || undefined,
          dataInicio: inicio || undefined,
          dataFim: fim || undefined,
          page: p,
          pageSize: PAGE_SIZE,
        }),
        movimentosService.resumo({ dataInicio: inicio || undefined, dataFim: fim || undefined }),
      ])
      setResult((resLista.data as any)?.data ?? resLista.data)
      setResumo((resResumo.data as any)?.data ?? resResumo.data)
    } catch {
      setError('Erro ao carregar movimentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    void fetchData(filtroTipo, filtroStatus, dataInicio, dataFim, 1)
  }, [filtroTipo, filtroStatus, dataInicio, dataFim, fetchData])

  useEffect(() => {
    void fetchData(filtroTipo, filtroStatus, dataInicio, dataFim, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPaginas = result?.totalPaginas ?? 1

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          title="Movimentações"
          subtitle="Controle de entradas e saídas da unidade"
          actions={
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Novo Movimento
            </Button>
          }
        />
      ) : (
        <div className="flex items-center justify-end">
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Novo Movimento
          </Button>
        </div>
      )}

      {/* Cards resumo */}
      {resumo && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <TrendingUp size={16} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Entradas</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatarValor(resumo.totalEntradas ?? 0)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <TrendingDown size={16} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Saídas</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatarValor(resumo.totalSaidas ?? 0)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${(resumo.saldo ?? 0) >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                <Wallet size={16} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Saldo</p>
            </div>
            <p className={`text-2xl font-bold ${(resumo.saldo ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatarValor(resumo.saldo ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
          >
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>De</Label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1.5">
          <Label>Até</Label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-36" />
        </div>
        {(filtroTipo || filtroStatus || dataInicio || dataFim) && (
          <Button variant="outline" size="sm" onClick={() => { setFiltroTipo(''); setFiltroStatus(''); setDataInicio(''); setDataFim('') }}>
            Limpar
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Origem</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : result?.data?.length > 0 ? (
                result.data.map((m: any) => (
                  <tr key={m.id} className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${m.tipo === 'entrada' ? '' : 'bg-red-50/20'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {m.tipo === 'entrada' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        </div>
                        <span className="font-medium">{m.descricao}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {ORIGEM_LABELS[m.origem] ?? m.origem}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatarData(m.data)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'} {formatarValor(Number(m.valor))}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <Badge variant={m.status === 'confirmado' ? 'success' : m.status === 'pendente' ? 'warning' : 'secondary'}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12">
                    <EmptyState
                      icon={<ArrowLeftRight className="h-10 w-10" />}
                      title="Nenhum movimento registrado"
                      description="Registre entradas e saídas financeiras da unidade."
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
        <ModalMovimento
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); void fetchData(filtroTipo, filtroStatus, dataInicio, dataFim, page) }}
        />
      )}
    </div>
  )
}
