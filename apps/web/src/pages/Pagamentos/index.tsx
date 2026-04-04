import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { DollarSign } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { pagamentosService } from '../../services/pagamentos.service'
import { materiasService, type Materia } from '../../services/materias.service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pagamento {
  id: string
  mesReferencia: string
  vencimento: string
  valor: number
  status: 'pendente' | 'pago' | 'vencido'
  pagoEm?: string
  aluno: { id: string; nome: string }
  matricula: { materia: { id: string; nome: string } }
  responsavel: { id: string; nome: string }
}

interface PaginadoPagamentos {
  data: Pagamento[]
  total: number
  page: number
  pageSize: number
  totalPaginas: number
}

type StatusFiltro = 'pendente' | 'pago' | 'vencido' | ''
type FormaPagamento = 'pix' | 'cartao' | 'boleto' | 'dinheiro'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatarMesRef(mesRef: string): string {
  const d = new Date(mesRef)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
}

function formatarData(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

function formatarValor(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// SkeletonRow
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Modal Registrar Pagamento
// ---------------------------------------------------------------------------

interface ModalRegistrarProps {
  pagamento: Pagamento
  onClose: () => void
  onConfirm: () => void
}

function ModalRegistrarPagamento({ pagamento, onClose, onConfirm }: ModalRegistrarProps) {
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [pagoEm, setPagoEm] = useState(hoje())
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirmar = async () => {
    setLoading(true)
    setError(null)
    try {
      await pagamentosService.registrarPagamento(pagamento.id, {
        pagoEm,
        formaPagamento,
        observacao: observacao.trim() || undefined,
      })
      onConfirm()
    } catch {
      setError('Erro ao registrar pagamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Registrar Pagamento</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pagamento.aluno.nome} — {formatarMesRef(pagamento.mesReferencia)}
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <Label htmlFor="formaPagamento">Forma de pagamento</Label>
            <select
              id="formaPagamento"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
            >
              <option value="pix">Pix</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </div>

          {/* Data do pagamento */}
          <div className="space-y-1.5">
            <Label htmlFor="pagoEm">Data do pagamento</Label>
            <Input
              id="pagoEm"
              type="date"
              value={pagoEm}
              onChange={(e) => setPagoEm(e.target.value)}
            />
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <textarea
              id="observacao"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Alguma anotação sobre este pagamento..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={loading || !pagoEm}>
            Confirmar Pagamento
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal Gerar Mensalidades
// ---------------------------------------------------------------------------

interface ModalGerarProps {
  onClose: () => void
  onGerado: () => void
}

function ModalGerarMensalidades({ onClose, onGerado }: ModalGerarProps) {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [materiaId, setMateriaId] = useState('')
  const [mesReferencia, setMesReferencia] = useState('')
  const [valor, setValor] = useState('')
  const [diaVencimento, setDiaVencimento] = useState('10')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await materiasService.listar()
        const data = (res.data as any)?.data ?? res.data
        setMaterias(Array.isArray(data) ? data : [])
      } catch {
        setError('Erro ao carregar matérias')
      } finally {
        setLoadingInit(false)
      }
    }
    void init()
  }, [])

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { setValor(''); return }
    const num = parseInt(digits, 10)
    setValor((num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    const diaNum = parseInt(diaVencimento, 10)

    if (!materiaId || !mesReferencia || !valor || !diaVencimento) {
      setError('Preencha todos os campos')
      return
    }
    if (isNaN(valorNum) || valorNum <= 0) {
      setError('Valor inválido')
      return
    }
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 28) {
      setError('Dia de vencimento deve ser entre 1 e 28')
      return
    }

    setLoading(true)
    try {
      await pagamentosService.gerarMensalidades({
        materiaId,
        mesReferencia,
        valor: valorNum,
        diaVencimento: diaNum,
      })
      onGerado()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao gerar mensalidades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Gerar Mensalidades</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gera cobranças para todos os alunos ativos na matéria selecionada
          </p>
        </div>

        {loadingInit ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="gerarMateria">Matéria *</Label>
              <select
                id="gerarMateria"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={materiaId}
                onChange={(e) => setMateriaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gerarMes">Mês de Referência *</Label>
              <Input
                id="gerarMes"
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gerarValor">Valor (R$) *</Label>
              <Input
                id="gerarValor"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={valor}
                onChange={handleValorChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gerarDia">Dia de Vencimento *</Label>
              <Input
                id="gerarDia"
                type="number"
                min="1"
                max="28"
                placeholder="10"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Entre 1 e 28</p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Gerando...' : 'Gerar Mensalidades'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15

export default function PagamentosPage({ embedded = false }: { embedded?: boolean }) {
  const location = useLocation()

  // Lê ?status=vencido da URL na montagem inicial
  const statusInicial = (): StatusFiltro => {
    const params = new URLSearchParams(location.search)
    const s = params.get('status')
    if (s === 'pendente' || s === 'pago' || s === 'vencido') return s
    return ''
  }

  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>(statusInicial)
  const [mesFiltro, setMesFiltro] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PaginadoPagamentos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalPagamento, setModalPagamento] = useState<Pagamento | null>(null)
  const [gerandoMensalidades, setGerandoMensalidades] = useState(false)

  const fetchData = useCallback(async (status: StatusFiltro, mes: string, pageVal: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await pagamentosService.listar({
        status: status || undefined,
        mes: mes || undefined,
        page: pageVal,
        pageSize: PAGE_SIZE,
      })
      const payload = (res.data as any)?.data ?? res.data
      setResult(payload)
    } catch {
      setError('Erro ao carregar pagamentos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    void fetchData(statusFiltro, mesFiltro, 1)
  }, [statusFiltro, mesFiltro, fetchData])

  useEffect(() => {
    void fetchData(statusFiltro, mesFiltro, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleLimparFiltros = () => {
    setStatusFiltro('')
    setMesFiltro('')
  }

  const handlePagamentoConfirmado = () => {
    setModalPagamento(null)
    void fetchData(statusFiltro, mesFiltro, page)
  }

  const totalPaginas = result?.totalPaginas ?? 1

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          title="Mensalidades"
          subtitle="Gerencie as mensalidades dos alunos"
          actions={
            <Button onClick={() => setGerandoMensalidades(true)}>
              Gerar Mensalidades
            </Button>
          }
        />
      ) : (
        <div className="flex items-center justify-end">
          <Button onClick={() => setGerandoMensalidades(true)}>
            Gerar Mensalidades
          </Button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtroStatus">Status</Label>
          <select
            id="filtroStatus"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filtroMes">Mês</Label>
          <Input
            id="filtroMes"
            type="month"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="w-44"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLimparFiltros}
          disabled={!statusFiltro && !mesFiltro}
        >
          Limpar filtros
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Matéria</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mês ref.</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Vencimento</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : result && result.data.length > 0 ? (
                result.data.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.aluno.nome}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {p.matricula.materia.nome}
                    </td>
                    <td className="px-4 py-3">{formatarMesRef(p.mesReferencia)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {formatarData(p.vencimento)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatarValor(p.valor)}</td>
                    <td className="px-4 py-3">
                      {p.status === 'pago' ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="success">Pago</Badge>
                          {p.pagoEm && (
                            <span className="text-xs text-muted-foreground">{formatarData(p.pagoEm)}</span>
                          )}
                        </div>
                      ) : p.status === 'pendente' ? (
                        <Badge variant="outline">Pendente</Badge>
                      ) : (
                        <Badge variant="destructive">Vencido</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status !== 'pago' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModalPagamento(p)}
                        >
                          Registrar Pagamento
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      title="Nenhum pagamento encontrado"
                      description={
                        statusFiltro || mesFiltro
                          ? 'Tente ajustar os filtros aplicados.'
                          : 'Nenhum pagamento cadastrado ainda.'
                      }
                      icon={<DollarSign className="h-10 w-10" />}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {result && result.totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {result.total} registro{result.total !== 1 ? 's' : ''} encontrado{result.total !== 1 ? 's' : ''}
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
              <span className="text-sm">
                {page} / {totalPaginas}
              </span>
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

      {/* Modal registrar pagamento */}
      {modalPagamento && (
        <ModalRegistrarPagamento
          pagamento={modalPagamento}
          onClose={() => setModalPagamento(null)}
          onConfirm={handlePagamentoConfirmado}
        />
      )}

      {/* Modal gerar mensalidades */}
      {gerandoMensalidades && (
        <ModalGerarMensalidades
          onClose={() => setGerandoMensalidades(false)}
          onGerado={() => {
            setGerandoMensalidades(false)
            void fetchData(statusFiltro, mesFiltro, page)
          }}
        />
      )}
    </div>
  )
}
