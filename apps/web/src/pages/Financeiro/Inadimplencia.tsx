import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, Mail, MessageSquare, History, Check,
  DollarSign, Users, Clock, X, Phone, PhoneOff, Copy,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Label } from '../../components/ui/Label'
import { Input } from '../../components/ui/Input'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import EmptyState from '../../components/shared/EmptyState'
import {
  cobrancasService,
  type CobrancaInadimplente,
  type ResumoInadimplencia,
} from '../../services/cobrancas.service'
import {
  reguaCobrancaService,
  montarUrlWhatsapp,
  copiarMensagem,
  type BillingActionLog,
} from '../../services/reguaCobranca.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  return new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).toLocaleDateString('pt-BR')
}

// ─── Faixas de atraso ────────────────────────────────────────────────────────

interface Faixa { id: string; label: string; critica?: boolean }

const FAIXAS: Faixa[] = [
  { id: '',       label: 'Todos' },
  { id: '1-30',   label: '1-30 dias' },
  { id: '31-90',  label: '31-90 dias' },
  { id: '91-180', label: '91-180 dias' },
  { id: '181-364',label: '181-364 dias' },
  { id: '365+',   label: '365+ dias', critica: true },
]

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiProps { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }

function KpiCard({ label, value, icon, color, sub }: KpiProps) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Modal WhatsApp ───────────────────────────────────────────────────────────

const TEMPLATE_WPP =
  'Olá, {{nome_responsavel}}! A mensalidade de *{{nome_aluno}}* está em atraso no valor de *{{valor}}*. Pedimos que realize o pagamento o quanto antes. Em caso de dúvidas, entre em contato conosco.'

interface ModalWppProps {
  cobranca: CobrancaInadimplente
  onClose: () => void
  onEnviado: () => void
}

function ModalWpp({ cobranca, onClose, onEnviado }: ModalWppProps) {
  const responsavel = cobranca.aluno.responsaveis?.[0]?.responsavel ?? null
  const telefone = responsavel?.telefone ?? null

  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [registrado, setRegistrado] = useState(false)

  useEffect(() => {
    reguaCobrancaService
      .renderTemplate(TEMPLATE_WPP, cobranca.id)
      .then((res) => setMensagem((res.data as any)?.data?.rendered ?? TEMPLATE_WPP))
      .catch(() => {
        const venc = new Date(cobranca.vencimento).toLocaleDateString('pt-BR')
        const valor = Number(cobranca.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        setMensagem(
          `Olá, ${responsavel?.nome ?? 'responsável'}! A mensalidade de *${cobranca.aluno.nome}* (venc. ${venc}) no valor de *${valor}* está em atraso. Pedimos que realize o pagamento o quanto antes.`,
        )
      })
      .finally(() => setLoading(false))
  }, [cobranca, responsavel])

  async function registrarAcao(actionType: string) {
    if (registrado) return
    try {
      await reguaCobrancaService.logAction({
        cobrancaId: cobranca.id,
        actionType,
        channel: 'whatsapp',
        messageSnapshot: mensagem,
        status: 'enviado',
      })
      setRegistrado(true)
      onEnviado()
    } catch { /* silencioso */ }
  }

  async function handleAbrirWpp() {
    if (!telefone) return
    window.open(montarUrlWhatsapp(telefone, mensagem), '_blank')
    await registrarAcao('whatsapp_sent')
  }

  async function handleCopiar() {
    await copiarMensagem(mensagem)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
    await registrarAcao('whatsapp_prepared')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare size={16} className="text-green-600" /> WhatsApp — {cobranca.aluno.nome}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">Atraso: </span><span className="font-medium text-red-600">{cobranca.diasAtraso} dias</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Vencimento: </span><span className="font-medium">{fmtData(cobranca.vencimento)}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Valor: </span><span className="font-medium">{fmtMoeda(Number(cobranca.valor))}</span></p>
          </div>

          <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${telefone ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
            {telefone ? <Phone size={14} className="text-green-600 shrink-0" /> : <PhoneOff size={14} className="text-orange-600 shrink-0" />}
            <span className={telefone ? 'text-green-800' : 'text-orange-800'}>
              {telefone
                ? <>{responsavel?.nome ?? 'Responsável'} — <strong>{telefone}</strong></>
                : <>Nenhum telefone cadastrado. Copie a mensagem e envie manualmente.</>}
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem</p>
            {loading ? (
              <div className="h-20 rounded-lg bg-muted animate-pulse" />
            ) : (
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            )}
          </div>

          {registrado && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <Check size={14} /> Ação registrada no histórico.
            </div>
          )}

          <div className="flex gap-2 justify-end border-t pt-4">
            <Button variant="outline" size="sm" onClick={handleCopiar} disabled={loading} className="gap-1.5">
              {copiado ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copiado ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button
              size="sm"
              onClick={handleAbrirWpp}
              disabled={loading || !telefone}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              title={!telefone ? 'Sem telefone cadastrado' : undefined}
            >
              <MessageSquare size={13} /> Abrir WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Email ──────────────────────────────────────────────────────────────

interface ModalEmailProps {
  cobranca: CobrancaInadimplente
  onClose: () => void
  onEnviado: () => void
}

function ModalEmail({ cobranca, onClose, onEnviado }: ModalEmailProps) {
  const responsavel = cobranca.aluno.responsaveis?.[0]?.responsavel ?? null
  const email = responsavel?.email ?? null

  const [subject, setSubject] = useState(`Mensalidade em atraso — ${cobranca.aluno.nome}`)
  const [template, setTemplate] = useState(
    `Olá, {{nome_responsavel}}!\n\nA mensalidade de {{nome_aluno}} está em atraso ({{vencimento}}) no valor de {{valor}}.\n\nPedimos que realize o pagamento o quanto antes para evitar encargos adicionais.\n\nEm caso de dúvidas, entre em contato conosco.\n\nAtenciosamente,\nEquipe Kumon`,
  )
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEnviar() {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      await cobrancasService.enviarEmail(cobranca.id, subject, template)
      setEnviado(true)
      onEnviado()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao enviar e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Mail size={16} className="text-purple-600" /> Enviar E-mail — {cobranca.aluno.nome}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {enviado ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <Check size={16} /> E-mail enviado com sucesso para <strong>{email}</strong>!
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={onClose}>Fechar</Button>
              </div>
            </div>
          ) : (
            <>
              <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${email ? 'border-purple-200 bg-purple-50' : 'border-orange-200 bg-orange-50'}`}>
                <Mail size={14} className={email ? 'text-purple-600 shrink-0' : 'text-orange-600 shrink-0'} />
                <span className={email ? 'text-purple-800' : 'text-orange-800'}>
                  {email
                    ? <>{responsavel?.nome ?? 'Responsável'} — <strong>{email}</strong></>
                    : <>Nenhum e-mail cadastrado para o responsável.</>}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Mensagem</Label>
                <textarea
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={6}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use variáveis: {'{{nome_aluno}}'}, {'{{nome_responsavel}}'}, {'{{valor}}'}, {'{{vencimento}}'}.</p>
              </div>

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button
                  size="sm"
                  onClick={handleEnviar}
                  disabled={loading || !email}
                  className="gap-1.5"
                  title={!email ? 'Sem e-mail cadastrado' : undefined}
                >
                  <Mail size={13} />
                  {loading ? 'Enviando...' : 'Enviar E-mail'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal Histórico ──────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  whatsapp_sent: 'WhatsApp enviado',
  whatsapp_prepared: 'Mensagem copiada',
  email_sent: 'E-mail enviado',
  internal_alert: 'Alerta interno',
  manual: 'Ação manual',
  ignored: 'Ignorada',
  auto_error: 'Erro automático',
}

interface ModalHistoricoProps {
  cobranca: CobrancaInadimplente
  onClose: () => void
}

function ModalHistorico({ cobranca, onClose }: ModalHistoricoProps) {
  const [logs, setLogs] = useState<BillingActionLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reguaCobrancaService
      .historicoPorCobranca(cobranca.id)
      .then((res) => setLogs((res.data as any)?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cobranca.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <History size={16} /> Histórico — {cobranca.aluno.nome}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {loading && <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>}
          {!loading && logs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ação registrada.</p>
          )}
          {!loading && logs.length > 0 && (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{ACTION_LABELS[log.actionType] ?? log.actionType}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.triggeredAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">{log.channel}</span>
                    {log.triggeredBy && <span className="text-xs text-muted-foreground">· {log.triggeredBy}</span>}
                    <span className={`ml-auto text-[10px] font-semibold rounded-full px-1.5 py-0.5 border ${
                      log.status === 'enviado' ? 'bg-green-50 text-green-700 border-green-200'
                      : log.status === 'erro' ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>{log.status}</span>
                  </div>
                  {log.messageSnapshot && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{log.messageSnapshot}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t px-6 py-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 rounded bg-muted" /></td>
      ))}
    </tr>
  )
}

// ─── InadimplenciaPage ────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function InadimplenciaPage() {
  const [resumo, setResumo] = useState<ResumoInadimplencia | null>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingResumo, setLoadingResumo] = useState(true)
  const [page, setPage] = useState(1)
  const [faixaSelecionada, setFaixaSelecionada] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [wppCobranca, setWppCobranca] = useState<CobrancaInadimplente | null>(null)
  const [emailCobranca, setEmailCobranca] = useState<CobrancaInadimplente | null>(null)
  const [historicoCobranca, setHistoricoCobranca] = useState<CobrancaInadimplente | null>(null)

  const fetchLista = useCallback(async (faixa: string, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await cobrancasService.listarInadimplencia({ faixa: faixa || undefined, page: p, pageSize: PAGE_SIZE })
      setResultado((res.data as any)?.data ?? null)
    } catch {
      setError('Erro ao carregar inadimplência.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cobrancasService.resumoInadimplencia()
      .then((res) => setResumo((res.data as any)?.data ?? null))
      .catch(() => {})
      .finally(() => setLoadingResumo(false))
  }, [])

  useEffect(() => {
    setPage(1)
    void fetchLista(faixaSelecionada, 1)
  }, [faixaSelecionada, fetchLista])

  useEffect(() => {
    void fetchLista(faixaSelecionada, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handlePago = async (id: string) => {
    try {
      await cobrancasService.registrarPagamento(id, new Date().toISOString().slice(0, 10))
      void fetchLista(faixaSelecionada, page)
      cobrancasService.resumoInadimplencia()
        .then((res) => setResumo((res.data as any)?.data ?? null))
        .catch(() => {})
    } catch {
      setError('Erro ao registrar pagamento.')
    }
  }

  const totalPaginas = resultado?.totalPaginas ?? 1

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {loadingResumo ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : resumo ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Total em atraso"
            value={fmtMoeda(resumo.valorTotal)}
            icon={<DollarSign size={20} />}
            color="bg-red-100 text-red-600"
            sub={`${resumo.totalCobrancas} cobrança${resumo.totalCobrancas !== 1 ? 's' : ''}`}
          />
          <KpiCard
            label="Alunos inadimplentes"
            value={resumo.totalAlunos}
            icon={<Users size={20} />}
            color="bg-orange-100 text-orange-600"
          />
          <KpiCard
            label="Críticos (365+ dias)"
            value={resumo.faixas.find((f) => f.label === '365+')?.count ?? 0}
            icon={<AlertTriangle size={20} />}
            color="bg-purple-100 text-purple-600"
            sub={fmtMoeda(resumo.faixas.find((f) => f.label === '365+')?.valor ?? 0)}
          />
        </div>
      ) : null}

      {/* Faixas */}
      <div className="flex flex-wrap gap-2">
        {FAIXAS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFaixaSelecionada(f.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              faixaSelecionada === f.id
                ? f.critica
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-primary text-primary-foreground border-primary'
                : f.critica
                  ? 'border-red-300 text-red-600 hover:bg-red-50'
                  : 'border-border text-muted-foreground hover:bg-muted/40'
            }`}
          >
            {f.critica && <AlertTriangle size={11} />}
            {f.label}
            {resumo && f.id && (
              <span className="opacity-75">
                ({resumo.faixas.find((r) => r.label === f.id)?.count ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Responsável</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Referência</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Atraso</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Última ação</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : resultado?.data?.length > 0 ? (
                resultado.data.map((c: CobrancaInadimplente) => {
                  const responsavel = c.aluno.responsaveis?.[0]?.responsavel ?? null
                  const ultimaAcao = c.actionLogs?.[0] ?? null
                  const diasClass =
                    c.diasAtraso >= 365 ? 'text-purple-700 font-semibold'
                    : c.diasAtraso >= 181 ? 'text-red-700 font-semibold'
                    : c.diasAtraso >= 91 ? 'text-orange-700 font-medium'
                    : c.diasAtraso >= 31 ? 'text-yellow-700'
                    : 'text-muted-foreground'

                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <AlunoAvatar nome={c.aluno.nome} foto={c.aluno.foto} size="sm" />
                          <span className="font-medium">{c.aluno.nome}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {responsavel ? (
                          <div className="text-xs">
                            <div className="font-medium text-foreground">{responsavel.nome}</div>
                            {responsavel.telefone && <div className="text-muted-foreground">{responsavel.telefone}</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {c.pagamento?.mesReferencia ?? c.descricao ?? '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{fmtData(c.vencimento)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 ${diasClass}`}>
                          <Clock size={12} />
                          {c.diasAtraso}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {fmtMoeda(Number(c.valor))}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {ultimaAcao ? (
                          <div className="text-xs">
                            <div className="text-muted-foreground">{ACTION_LABELS[ultimaAcao.actionType] ?? ultimaAcao.actionType}</div>
                            <div className="text-muted-foreground/60">
                              {new Date(ultimaAcao.triggeredAt).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem ações</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWppCobranca(c)}
                            title="WhatsApp"
                            className="gap-1 text-green-700 border-green-300 hover:bg-green-50 px-2"
                          >
                            <MessageSquare size={13} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEmailCobranca(c)}
                            title="E-mail"
                            className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50 px-2"
                          >
                            <Mail size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoricoCobranca(c)}
                            title="Histórico"
                            className="text-muted-foreground px-2"
                          >
                            <History size={13} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePago(c.id)}
                            className="text-xs"
                          >
                            Pago
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12">
                    <EmptyState
                      icon={<AlertTriangle className="h-10 w-10" />}
                      title="Nenhuma inadimplência encontrada"
                      description={faixaSelecionada ? 'Nenhuma cobrança nesta faixa de atraso.' : 'Todos os alunos estão em dia com os pagamentos.'}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {resultado && totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">{resultado.total} registro{resultado.total !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span className="text-sm">{page} / {totalPaginas}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPaginas || loading} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {wppCobranca && (
        <ModalWpp
          cobranca={wppCobranca}
          onClose={() => setWppCobranca(null)}
          onEnviado={() => void fetchLista(faixaSelecionada, page)}
        />
      )}
      {emailCobranca && (
        <ModalEmail
          cobranca={emailCobranca}
          onClose={() => setEmailCobranca(null)}
          onEnviado={() => void fetchLista(faixaSelecionada, page)}
        />
      )}
      {historicoCobranca && (
        <ModalHistorico
          cobranca={historicoCobranca}
          onClose={() => setHistoricoCobranca(null)}
        />
      )}
    </div>
  )
}
