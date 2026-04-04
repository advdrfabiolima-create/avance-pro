import { useState, useEffect, useCallback } from 'react'
import { BarChart2, TrendingUp, TrendingDown, Wallet, AlertTriangle, RefreshCw, Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import { relatoriosService } from '../../services/relatorios.service'

type AbaAtiva = 'resumo' | 'cobranca' | 'fluxo' | 'inadimplencia'

function formatarValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function mesAtual() {
  const hoje = new Date()
  return {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10),
    fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10),
  }
}

// ─── Aba Resumo ───────────────────────────────────────────────────────────────

function AbaResumo({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const res = await relatoriosService.resumo({ dataInicio, dataFim })
        setData((res.data as any)?.data ?? res.data)
      } catch {
        setError('Erro ao carregar resumo.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [dataInicio, dataFim])

  if (loading) return <div className="flex justify-center py-12"><span className="text-sm text-muted-foreground">Carregando...</span></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Total Mensalidades</p>
          <p className="text-xl font-bold">{formatarValor(data.mensalidades?.total ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Recebido</p>
          <p className="text-xl font-bold text-emerald-600">{formatarValor(data.mensalidades?.recebido ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Pendente</p>
          <p className="text-xl font-bold text-amber-600">{formatarValor(data.mensalidades?.pendente ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Vencido</p>
          <p className="text-xl font-bold text-red-600">{formatarValor(data.mensalidades?.vencido ?? 0)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4">Movimentos do Período</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"><TrendingUp size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="font-bold text-emerald-600">{formatarValor(data.movimentos?.entradas ?? 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100"><TrendingDown size={18} className="text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="font-bold text-red-600">{formatarValor(data.movimentos?.saidas ?? 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${(data.movimentos?.saldo ?? 0) >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
              <Wallet size={18} className={(data.movimentos?.saldo ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={`font-bold ${(data.movimentos?.saldo ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatarValor(data.movimentos?.saldo ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Aba Cobrança ─────────────────────────────────────────────────────────────

function AbaCobranca({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const res = await relatoriosService.cobranca({ dataInicio, dataFim })
        setData((res.data as any)?.data ?? res.data)
      } catch {
        setError('Erro ao carregar relatório de cobrança.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [dataInicio, dataFim])

  if (loading) return <div className="flex justify-center py-12"><span className="text-sm text-muted-foreground">Carregando...</span></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
  if (!data) return null

  const { resumo, pagamentos } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: resumo.total, color: 'text-foreground' },
          { label: 'Pagos', value: resumo.totalPagos, color: 'text-emerald-600' },
          { label: 'Pendentes', value: resumo.totalPendentes, color: 'text-amber-600' },
          { label: 'Vencidos', value: resumo.totalVencidos, color: 'text-red-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
          <p className="text-lg font-bold">{formatarValor(resumo.valorTotal)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Valor Recebido</p>
          <p className="text-lg font-bold text-emerald-600">{formatarValor(resumo.valorRecebido)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">A Receber</p>
          <p className="text-lg font-bold text-amber-600">{formatarValor(resumo.valorPendente)}</p>
        </div>
      </div>

      {pagamentos && pagamentos.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Responsável</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.aluno.nome}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{p.responsavel.nome}</td>
                    <td className="px-4 py-3">{formatarData(p.vencimento)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatarValor(Number(p.valor))}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'pago' ? 'success' : p.status === 'vencido' ? 'destructive' : 'outline'}>
                        {p.status === 'pago' ? 'Pago' : p.status === 'vencido' ? 'Vencido' : 'Pendente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba Inadimplência ────────────────────────────────────────────────────────

function AbaInadimplencia() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const res = await relatoriosService.inadimplencia()
        setData((res.data as any)?.data ?? res.data)
      } catch {
        setError('Erro ao carregar inadimplência.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><span className="text-sm text-muted-foreground">Carregando...</span></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-red-50 border-red-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-medium text-red-700">Alunos inadimplentes</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{data.totalInadimplentes}</p>
        </div>
        <div className="rounded-xl border bg-red-50 border-red-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-600" />
            <p className="text-sm font-medium text-red-700">Total vencido</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatarValor(data.totalVencido)}</p>
        </div>
      </div>

      {data.resumoPorAluno?.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Parcelas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Vencido</th>
                </tr>
              </thead>
              <tbody>
                {data.resumoPorAluno.map((item: any) => (
                  <tr key={item.aluno.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{item.aluno.nome}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{item.count}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">{formatarValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelatoriosPage({ embedded = false }: { embedded?: boolean }) {
  const { inicio, fim } = mesAtual()
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('resumo')
  const [dataInicio, setDataInicio] = useState(inicio)
  const [dataFim, setDataFim] = useState(fim)
  const [key, setKey] = useState(0)

  const ABAS: { id: AbaAtiva; label: string }[] = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'cobranca', label: 'Cobrança' },
    { id: 'inadimplencia', label: 'Inadimplência' },
  ]

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Relatórios Financeiros"
          subtitle="Visão consolidada das finanças da unidade"
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir / PDF
            </Button>
          }
        />
      )}

      {/* Filtro de período */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card px-4 py-4">
        <div className="space-y-1.5">
          <Label>Período inicial</Label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label>Período final</Label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)}>
          <RefreshCw size={13} /> Atualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${abaAtiva === aba.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div key={`${abaAtiva}-${key}`}>
        {abaAtiva === 'resumo' && <AbaResumo dataInicio={dataInicio} dataFim={dataFim} />}
        {abaAtiva === 'cobranca' && <AbaCobranca dataInicio={dataInicio} dataFim={dataFim} />}
        {abaAtiva === 'inadimplencia' && <AbaInadimplencia />}
      </div>
    </div>
  )
}
