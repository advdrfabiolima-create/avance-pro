import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Clock, Users, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { relatoriosService } from '../../services/relatorios.service'
import { cobrancasService } from '../../services/cobrancas.service'

function fmt(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesAtual() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return { inicio: `${y}-${m}-01`, fim: `${y}-${m}-${new Date(y, now.getMonth() + 1, 0).getDate()}` }
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
}

function KpiCard({ label, value, sub, icon, color, trend }: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && (
          <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
            {trend === 'up' && <TrendingUp size={11} className="text-green-600" />}
            {trend === 'down' && <TrendingDown size={11} className="text-red-500" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export default function VisaoGeral() {
  const { inicio, fim } = mesAtual()
  const [resumo, setResumo] = useState<any>(null)
  const [inadimplentes, setInadimplentes] = useState<any>(null)
  const [ultimasCobrancas, setUltimasCobrancas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const [resumoRes, inadRes, cobRes] = await Promise.all([
          relatoriosService.resumo({ dataInicio: inicio, dataFim: fim }),
          relatoriosService.inadimplencia(),
          cobrancasService.listar({ pageSize: 5 }),
        ])
        setResumo((resumoRes.data as any)?.data ?? null)
        setInadimplentes((inadRes.data as any)?.data ?? null)
        const cobs = (cobRes.data as any)?.data?.data ?? []
        setUltimasCobrancas(cobs)
      } catch {
        /* silencioso */
      } finally {
        setLoading(false)
      }
    }
    void carregar()
  }, [inicio, fim])

  const mensalidades = resumo?.mensalidades
  const movimentos = resumo?.movimentos

  const totalInadimplentes = inadimplentes?.totalAlunos ?? 0
  const totalInadimplencia = inadimplentes?.totalDevido ?? 0

  const txInadimplencia =
    mensalidades?.total > 0
      ? Math.round((mensalidades.totalVencido / mensalidades.valorTotal) * 100)
      : 0

  const STATUS_LABEL: Record<string, string> = {
    aguardando: 'Aguardando', enviada: 'Enviada', paga: 'Paga',
    vencida: 'Vencida', cancelada: 'Cancelada',
  }
  const STATUS_VARIANT: Record<string, any> = {
    aguardando: 'warning', enviada: 'stagnant', paga: 'success',
    vencida: 'destructive', cancelada: 'secondary',
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Receita do mês"
          value={fmt(mensalidades?.valorRecebido)}
          sub={`de ${fmt(mensalidades?.valorTotal)} faturado`}
          icon={<DollarSign size={18} className="text-green-600" />}
          color="bg-green-50"
          trend="up"
        />
        <KpiCard
          label="Em aberto"
          value={fmt(mensalidades?.valorPendente)}
          sub={`${mensalidades?.totalPendente ?? 0} mensalidade(s) pendente(s)`}
          icon={<Clock size={18} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <KpiCard
          label="Vencido"
          value={fmt(mensalidades?.totalVencido ? totalInadimplencia : 0)}
          sub={`${totalInadimplentes} aluno(s) inadimplente(s)`}
          icon={<AlertTriangle size={18} className="text-red-500" />}
          color="bg-red-50"
          trend={txInadimplencia > 20 ? 'down' : 'neutral'}
        />
        <KpiCard
          label="Saldo do período"
          value={fmt(movimentos?.saldo)}
          sub={`E: ${fmt(movimentos?.totalEntradas)} | S: ${fmt(movimentos?.totalSaidas)}`}
          icon={<TrendingUp size={18} className="text-purple-600" />}
          color="bg-purple-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Últimas cobranças */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 size={16} />
                Últimas Cobranças
              </CardTitle>
              <Link
                to="/financeiro?tab=cobrancas"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver todas <ArrowRight size={11} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {ultimasCobrancas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma cobrança registrada</p>
            ) : (
              <div className="space-y-2">
                {ultimasCobrancas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.aluno?.nome ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc. {new Date(c.vencimento).toLocaleDateString('pt-BR')}
                        {c.descricao && ` · ${c.descricao}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">{fmt(c.valor)}</span>
                      <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inadimplência */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users size={16} />
                Inadimplência
              </CardTitle>
              <Link
                to="/financeiro?tab=relatorios"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Relatório completo <ArrowRight size={11} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {totalInadimplentes === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={32} className="text-green-500" />
                <p className="text-sm text-muted-foreground">Nenhum aluno inadimplente no período</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-red-50 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{totalInadimplentes}</p>
                    <p className="text-xs text-red-700 mt-0.5">aluno(s) inadimplente(s)</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{fmt(totalInadimplencia)}</p>
                    <p className="text-xs text-orange-700 mt-0.5">total em aberto</p>
                  </div>
                </div>
                {txInadimplencia > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Taxa de inadimplência</span>
                      <span className="text-xs font-bold text-red-600">{txInadimplencia}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{ width: `${Math.min(txInadimplencia, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo de movimentos */}
      {movimentos && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={16} />
                Fluxo de Caixa — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <Link
                to="/financeiro?tab=movimentacoes"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver movimentos <ArrowRight size={11} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-green-50 px-4 py-3 text-center">
                <p className="text-xs text-green-700 uppercase tracking-wide">Entradas</p>
                <p className="mt-1 text-xl font-bold text-green-700">{fmt(movimentos.totalEntradas)}</p>
              </div>
              <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
                <p className="text-xs text-red-700 uppercase tracking-wide">Saídas</p>
                <p className="mt-1 text-xl font-bold text-red-700">{fmt(movimentos.totalSaidas)}</p>
              </div>
              <div className={`rounded-lg px-4 py-3 text-center ${Number(movimentos.saldo) >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <p className={`text-xs uppercase tracking-wide ${Number(movimentos.saldo) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo</p>
                <p className={`mt-1 text-xl font-bold ${Number(movimentos.saldo) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(movimentos.saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
