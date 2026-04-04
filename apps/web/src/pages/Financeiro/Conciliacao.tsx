import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Zap, Upload,
  RefreshCw, ChevronDown, ChevronUp, FileText, Info, MoreHorizontal,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import {
  conciliacaoService,
  type CobrancaPendente,
  type ResumoConciliacao,
} from '../../services/conciliacao.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function diffDias(a: string, b: string) {
  return Math.abs(Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000))
}

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_COBRANCA_LABEL: Record<string, string> = {
  aguardando: 'Aguardando', enviada: 'Enviada', paga: 'Paga',
  vencida: 'Vencida', cancelada: 'Cancelada',
}
const STATUS_COBRANCA_VARIANT: Record<string, any> = {
  aguardando: 'warning', enviada: 'stagnant', paga: 'success',
  vencida: 'destructive', cancelada: 'secondary',
}

function statusConciliacao(c: CobrancaPendente): { label: string; variant: any; icon: React.ReactNode } {
  if (c.reconciliacao?.status === 'ignorado') {
    return { label: 'Ignorado', variant: 'secondary', icon: <XCircle size={12} /> }
  }
  if (c.reconciliacao?.status === 'divergente') {
    return { label: 'Divergente', variant: 'destructive', icon: <AlertTriangle size={12} /> }
  }
  if (c.sugestao) {
    return { label: 'Sugestão encontrada', variant: 'stagnant', icon: <Zap size={12} /> }
  }
  if (c.status === 'paga') {
    return { label: 'Paga — pendente conciliação', variant: 'warning', icon: <Clock size={12} /> }
  }
  if (c.status === 'vencida') {
    return { label: 'Vencida', variant: 'destructive', icon: <AlertTriangle size={12} /> }
  }
  return { label: 'Pendente', variant: 'secondary', icon: <Clock size={12} /> }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, sub }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Modal de confirmação rápida ─────────────────────────────────────────────

interface ModalNotasProps {
  titulo: string
  descricao: string
  onConfirmar: (notas: string) => Promise<void>
  onCancelar: () => void
}

function ModalNotas({ titulo, descricao, onConfirmar, onCancelar }: ModalNotasProps) {
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleOk() {
    setLoading(true)
    try { await onConfirmar(notas) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card shadow-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground">{titulo}</h3>
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Observações (opcional)"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancelar} disabled={loading}>Cancelar</Button>
          <Button size="sm" onClick={handleOk} disabled={loading}>
            {loading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Linha expandível da tabela ───────────────────────────────────────────────

function LinhaCobranca({
  cobranca,
  onAcao,
}: {
  cobranca: CobrancaPendente
  onAcao: (tipo: 'confirmar' | 'pagar-manual' | 'ignorar', cobranca: CobrancaPendente) => void
}) {
  const [expandida, setExpandida] = useState(false)
  const sc = statusConciliacao(cobranca)
  const responsavelNome = cobranca.aluno.responsaveis[0]?.responsavel.nome

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors">
        {/* Aluno */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlunoAvatar nome={cobranca.aluno.nome} foto={cobranca.aluno.foto} size="sm" />
            <div>
              <p className="text-sm font-medium">{cobranca.aluno.nome}</p>
              {responsavelNome && (
                <p className="text-xs text-muted-foreground">{responsavelNome}</p>
              )}
            </div>
          </div>
        </td>

        {/* Valor */}
        <td className="px-4 py-3 tabular-nums font-semibold text-sm">
          {fmt(cobranca.valor)}
        </td>

        {/* Vencimento */}
        <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
          {fmtData(cobranca.vencimento)}
        </td>

        {/* Status cobrança */}
        <td className="hidden px-4 py-3 lg:table-cell">
          <Badge variant={STATUS_COBRANCA_VARIANT[cobranca.status]}>
            {STATUS_COBRANCA_LABEL[cobranca.status] ?? cobranca.status}
          </Badge>
        </td>

        {/* Status conciliação */}
        <td className="px-4 py-3">
          <Badge variant={sc.variant} className="flex items-center gap-1 w-fit">
            {sc.icon} {sc.label}
          </Badge>
        </td>

        {/* Provider */}
        <td className="hidden px-4 py-3 text-xs text-muted-foreground xl:table-cell">
          {cobranca.provider ?? '—'}
        </td>

        {/* Ações */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpandida((e) => !e)}
              title="Ver detalhes"
              className="h-7 w-7"
            >
              {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>

            {cobranca.sugestao && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAcao('confirmar', cobranca)}
                title="Confirmar sugestão"
              >
                <CheckCircle2 size={12} /> Confirmar
              </Button>
            )}

            {!cobranca.sugestao && cobranca.status !== 'paga' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onAcao('pagar-manual', cobranca)}
              >
                <MoreHorizontal size={12} /> Manual
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Linha expandida */}
      {expandida && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Detalhes da cobrança */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cobrança</p>
                {cobranca.descricao && <p className="text-sm">{cobranca.descricao}</p>}
                {cobranca.asaasId && (
                  <p className="text-xs text-muted-foreground font-mono">ID: {cobranca.asaasId}</p>
                )}
                {cobranca.pagoEm && (
                  <p className="text-xs text-muted-foreground">Pago em: {fmtData(cobranca.pagoEm)}</p>
                )}
              </div>

              {/* Sugestão de movimento */}
              {cobranca.sugestao && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                    <Zap size={11} /> Movimento compatível encontrado
                  </p>
                  <p className="text-sm font-medium">{cobranca.sugestao.descricao}</p>
                  <p className="text-xs text-blue-600">
                    {fmt(cobranca.sugestao.valor)}
                    {' · '}
                    {fmtData(cobranca.sugestao.data)}
                    {' · '}
                    {diffDias(cobranca.sugestao.data, cobranca.vencimento)}d de diferença
                  </p>
                </div>
              )}

              {/* Ações expandidas */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</p>
                {cobranca.sugestao && (
                  <Button size="sm" onClick={() => onAcao('confirmar', cobranca)} className="justify-start">
                    <CheckCircle2 size={13} /> Confirmar conciliação com sugestão
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onAcao('pagar-manual', cobranca)} className="justify-start">
                  <FileText size={13} /> Marcar como pago manualmente
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground justify-start"
                  onClick={() => onAcao('ignorar', cobranca)}
                >
                  <XCircle size={13} /> Ignorar por agora
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Seção de Importação ──────────────────────────────────────────────────────

function ImportacaoSection() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload size={16} />
          Importação de Arquivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Importe arquivo de retorno bancário ou planilha para conciliação manual assistida.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled title="Em desenvolvimento">
            <Upload size={13} /> Importar CSV
          </Button>
          <Button variant="outline" size="sm" disabled title="Em desenvolvimento">
            <FileText size={13} /> Importar CNAB 400
          </Button>
          <Button variant="outline" size="sm" disabled title="Em desenvolvimento">
            <FileText size={13} /> Importar CNAB 240
          </Button>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2.5 flex items-start gap-2">
          <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Em desenvolvimento:</strong> Suportará retorno CNAB 400/240 (Bradesco, Inter),
            extratos bancários em CSV e planilhas. A arquitetura já está preparada —
            veja <code className="rounded bg-background px-1 font-mono">billing.core.ts</code> e
            os adapters de banco.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Histórico ────────────────────────────────────────────────────────────────

function HistoricoSection({ itens }: { itens: any[] }) {
  const MATCH_LABEL: Record<string, string> = {
    auto: 'Automático', manual: 'Manual', imported: 'Importado',
    webhook: 'Webhook', cnab: 'CNAB',
  }
  const STATUS_VARIANT: Record<string, any> = {
    conciliado: 'success', ignorado: 'secondary', divergente: 'destructive',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 size={16} />
          Histórico Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma conciliação realizada ainda
          </p>
        ) : (
          <div className="space-y-2">
            {itens.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <AlunoAvatar nome={item.cobranca?.aluno?.nome ?? '?'} foto={item.cobranca?.aluno?.foto} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.cobranca?.aluno?.nome ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(item.cobranca?.valor)}
                      {item.reconciladoPor && ` · por ${item.reconciladoPor}`}
                      {item.reconciladoEm && ` · ${fmtData(item.reconciladoEm)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.matchType && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {MATCH_LABEL[item.matchType] ?? item.matchType}
                    </span>
                  )}
                  <Badge variant={STATUS_VARIANT[item.status] ?? 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type ModalState =
  | { tipo: 'confirmar'; cobranca: CobrancaPendente }
  | { tipo: 'pagar-manual'; cobranca: CobrancaPendente }
  | { tipo: 'ignorar'; cobranca: CobrancaPendente }
  | null

export default function ConciliacaoPage() {
  const [resumo, setResumo] = useState<ResumoConciliacao | null>(null)
  const [pendentes, setPendentes] = useState<CobrancaPendente[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error'; msg: string } | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [page, setPage] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const PAGE_SIZE = 15

  const carregar = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const [resumoRes, pendentesRes, historicoRes] = await Promise.all([
        conciliacaoService.resumo(),
        conciliacaoService.pendentes({ page: p, pageSize: PAGE_SIZE }),
        conciliacaoService.historico(),
      ])
      setResumo((resumoRes.data as any)?.data ?? null)
      const pd = (pendentesRes.data as any)?.data
      setPendentes(pd?.data ?? [])
      setTotalPaginas(pd?.totalPaginas ?? 1)
      setHistorico((historicoRes.data as any)?.data ?? [])
    } catch {
      setFeedback({ tipo: 'error', msg: 'Erro ao carregar dados de conciliação' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar(page) }, [carregar, page])

  function showFeedback(tipo: 'success' | 'error', msg: string) {
    setFeedback({ tipo, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function handleAcao(
    tipo: 'confirmar' | 'pagar-manual' | 'ignorar',
    cobranca: CobrancaPendente,
  ) {
    setModal({ tipo, cobranca } as ModalState)
  }

  async function executarAcao(notas: string) {
    if (!modal) return
    const { tipo, cobranca } = modal
    try {
      if (tipo === 'confirmar') {
        await conciliacaoService.confirmar(cobranca.id, {
          movimentoId: cobranca.sugestao?.id,
          notas,
          matchType: cobranca.sugestao ? 'auto' : 'manual',
        })
        showFeedback('success', 'Conciliação confirmada com sucesso.')
      } else if (tipo === 'pagar-manual') {
        await conciliacaoService.pagarManual(cobranca.id, notas)
        showFeedback('success', 'Pagamento registrado e conciliação realizada.')
      } else if (tipo === 'ignorar') {
        await conciliacaoService.ignorar(cobranca.id, notas)
        showFeedback('success', 'Item ignorado. Pode revisitar depois.')
      }
      setModal(null)
      void carregar(page)
    } catch (e: any) {
      showFeedback('error', e?.response?.data?.error ?? 'Erro ao executar ação')
    }
  }

  const MODAL_CONFIG = {
    confirmar: {
      titulo: 'Confirmar Conciliação',
      descricao: modal?.cobranca?.sugestao
        ? `Confirma a conciliação de ${fmt(modal.cobranca.valor)} com o movimento de ${fmt(modal.cobranca.sugestao.valor)} em ${fmtData(modal.cobranca.sugestao.data)}?`
        : `Confirmar conciliação de ${fmt(modal?.cobranca?.valor ?? 0)} sem movimento vinculado?`,
    },
    'pagar-manual': {
      titulo: 'Registrar Pagamento Manual',
      descricao: `Marcar cobrança de ${fmt(modal?.cobranca?.valor ?? 0)} como paga. Um movimento de entrada será criado automaticamente.`,
    },
    ignorar: {
      titulo: 'Ignorar Sugestão',
      descricao: 'Esta cobrança ficará fora da lista de pendentes. Você poderá revisá-la depois.',
    },
  }

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {feedback && (
        <Alert variant={feedback.tipo === 'error' ? 'destructive' : 'default'}>
          <AlertDescription className="flex items-center gap-2">
            {feedback.tipo === 'success'
              ? <CheckCircle2 size={14} className="text-green-600" />
              : <AlertTriangle size={14} />}
            {feedback.msg}
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pendentes"
          value={resumo?.pendentes ?? '—'}
          icon={<Clock size={18} className="text-amber-600" />}
          color="bg-amber-50"
          sub="cobranças aguardando conciliação"
        />
        <KpiCard
          label="Sugestões disponíveis"
          value={pendentes.filter((c) => c.sugestao).length}
          icon={<Zap size={18} className="text-blue-600" />}
          color="bg-blue-50"
          sub="movimentos compatíveis encontrados"
        />
        <KpiCard
          label="Conciliadas hoje"
          value={resumo?.conciliadasHoje ?? '—'}
          icon={<CheckCircle2 size={18} className="text-green-600" />}
          color="bg-green-50"
        />
        <KpiCard
          label="Divergências"
          value={resumo?.divergentes ?? '—'}
          icon={<AlertTriangle size={18} className="text-red-500" />}
          color="bg-red-50"
          sub="requerem revisão manual"
        />
      </div>

      {/* Tabela de pendentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={16} />
                Pendentes de Conciliação
              </CardTitle>
              {resumo && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {resumo.pendentes} cobrança{resumo.pendentes !== 1 ? 's' : ''} aguardando
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => carregar(page)}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="text-sm font-medium">Tudo conciliado!</p>
              <p className="text-xs text-muted-foreground">Nenhuma cobrança pendente no momento.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Aluno</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Valor</th>
                      <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground text-xs md:table-cell">Vencimento</th>
                      <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground text-xs lg:table-cell">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Conciliação</th>
                      <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground text-xs xl:table-cell">Provider</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.map((c) => (
                      <LinhaCobranca key={c.id} cobranca={c} onAcao={handleAcao} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Página {page} de {totalPaginas}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1 || loading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Importação + Histórico lado a lado em telas grandes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ImportacaoSection />
        <HistoricoSection itens={historico} />
      </div>

      {/* Modal de ação */}
      {modal && (
        <ModalNotas
          titulo={MODAL_CONFIG[modal.tipo].titulo}
          descricao={MODAL_CONFIG[modal.tipo].descricao}
          onConfirmar={executarAcao}
          onCancelar={() => setModal(null)}
        />
      )}
    </div>
  )
}
