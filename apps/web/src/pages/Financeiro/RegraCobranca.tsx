import { useState, useEffect, useCallback } from 'react'
import {
  Zap, MessageSquare, Bell, Clock, AlertTriangle, CheckCircle2,
  Send, Copy, ExternalLink, ChevronDown, ChevronUp, Plus, Pencil,
  Trash2, ToggleLeft, ToggleRight, Eye, X, Calendar, History,
  Play, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import {
  reguaCobrancaService,
  montarUrlWhatsapp,
  copiarMensagem,
  type BillingRule,
  type FilaHoje,
  type BillingActionLog,
  type EventType,
  type Channel,
  type AutomationStatus,
} from '../../services/reguaCobranca.service'

// ─── Formatadores ─────────────────────────────────────────────────────────────

function fmt(v: number | string) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).toLocaleDateString('pt-BR')
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const EVENT_LABEL: Record<EventType, string> = {
  before: 'Antes do vencimento',
  on_due: 'No dia do vencimento',
  after: 'Após o vencimento',
}

const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp assistido',
  internal: 'Alerta interno',
  email: 'E-mail (em breve)',
  webhook: 'Webhook (em breve)',
}

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  whatsapp: <MessageSquare size={13} className="text-green-600" />,
  internal: <Bell size={13} className="text-blue-600" />,
  email: <Send size={13} className="text-purple-600" />,
  webhook: <Zap size={13} className="text-orange-600" />,
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  enviado: { label: 'Enviado', cls: 'bg-green-100 text-green-700 border-green-200' },
  pendente: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  ignorado: { label: 'Ignorado', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  erro: { label: 'Erro', cls: 'bg-red-100 text-red-700 border-red-200' },
}

const VARIABLES = [
  { key: '{{nome_aluno}}', desc: 'Nome do aluno' },
  { key: '{{nome_responsavel}}', desc: 'Nome do responsável' },
  { key: '{{valor}}', desc: 'Valor da cobrança' },
  { key: '{{vencimento}}', desc: 'Data de vencimento' },
  { key: '{{link_pagamento}}', desc: 'Link de pagamento / PIX' },
  { key: '{{linha_digitavel}}', desc: 'Linha digitável (boleto)' },
  { key: '{{instituicao}}', desc: 'Nome do provider (banco/gateway)' },
]

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string; value: number | string
  icon: React.ReactNode; color: string; sub?: string
}

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

// ─── Modal de Regra ───────────────────────────────────────────────────────────

interface ModalRegraProps {
  rule?: BillingRule | null
  onClose: () => void
  onSaved: () => void
}

function ModalRegra({ rule, onClose, onSaved }: ModalRegraProps) {
  const [name, setName] = useState(rule?.name ?? '')
  const [eventType, setEventType] = useState<EventType>(rule?.eventType ?? 'before')
  const [offsetDays, setOffsetDays] = useState(rule?.offsetDays ?? 3)
  const [channel, setChannel] = useState<Channel>(rule?.channel ?? 'whatsapp')
  const [template, setTemplate] = useState(rule?.template ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function insertVar(v: string) {
    setTemplate((prev) => prev + v)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    if (!template.trim()) { setError('Template é obrigatório'); return }
    setLoading(true)
    setError(null)
    try {
      const data = { name, eventType, offsetDays, channel, template, isActive: true }
      if (rule) {
        await reguaCobrancaService.updateRule(rule.id, data)
      } else {
        await reguaCobrancaService.createRule(data)
      }
      onSaved()
      onClose()
    } catch {
      setError('Erro ao salvar regra. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">{rule ? 'Editar regra' : 'Nova regra'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Nome da regra</Label>
            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lembrete amigável" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-type">Tipo de evento</Label>
              <select
                id="event-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="before">Antes do vencimento</option>
                <option value="on_due">No dia</option>
                <option value="after">Após o vencimento</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offset-days">
                {eventType === 'on_due' ? 'Dias (ignorado)' : `Dias ${eventType === 'before' ? 'antes' : 'após'}`}
              </Label>
              <Input
                id="offset-days"
                type="number"
                min={0} max={30}
                value={offsetDays}
                disabled={eventType === 'on_due'}
                onChange={(e) => setOffsetDays(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="channel">Canal</Label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="whatsapp">WhatsApp assistido</option>
              <option value="internal">Alerta interno</option>
              <option value="email">E-mail (placeholder)</option>
              <option value="webhook">Webhook (placeholder)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template">Template da mensagem</Label>
            <textarea
              id="template"
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Escreva a mensagem. Use as variáveis abaixo..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            {/* Variáveis */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.key)}
                  title={v.desc}
                  className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-mono"
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {template.trim() && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Preview</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {template
                  .replace(/\{\{nome_aluno\}\}/g, 'João Silva')
                  .replace(/\{\{nome_responsavel\}\}/g, 'Maria Silva')
                  .replace(/\{\{valor\}\}/g, 'R$ 350,00')
                  .replace(/\{\{vencimento\}\}/g, '10/04/2026')
                  .replace(/\{\{link_pagamento\}\}/g, 'https://pix.example')
                  .replace(/\{\{linha_digitavel\}\}/g, '1234.56789...')
                  .replace(/\{\{instituicao\}\}/g, 'Asaas')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar regra'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de ação WhatsApp ───────────────────────────────────────────────────

interface ModalWhatsappProps {
  mensagem: string
  telefone: string | null
  nomeAluno: string
  cobrancaId: string
  ruleId: string | null
  onClose: () => void
  onDone: () => void
}

function ModalWhatsapp({ mensagem, telefone, nomeAluno, cobrancaId, ruleId, onClose, onDone }: ModalWhatsappProps) {
  const [copiado, setCopiado] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCopiar() {
    await copiarMensagem(mensagem)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function handleWhatsapp() {
    if (!telefone) { alert('Responsável sem telefone cadastrado.'); return }
    window.open(montarUrlWhatsapp(telefone, mensagem), '_blank')
  }

  async function handleRegistrar(status: 'enviado' | 'ignorado') {
    setLoading(true)
    try {
      await reguaCobrancaService.logAction({
        cobrancaId,
        billingRuleId: ruleId,
        actionType: status === 'enviado' ? 'whatsapp_sent' : 'ignored',
        channel: 'whatsapp',
        messageSnapshot: mensagem,
        status,
      })
      setRegistrado(true)
      setTimeout(() => { onDone(); onClose() }, 800)
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-green-600" />
            <h2 className="text-base font-semibold">Enviar via WhatsApp</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Destinatário</p>
            <p className="text-sm font-medium">{nomeAluno}</p>
            <p className="text-xs text-muted-foreground">{telefone ?? 'Sem telefone cadastrado'}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Mensagem</p>
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{mensagem}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopiar}>
              {copiado ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
              {copiado ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleWhatsapp}
              disabled={!telefone}
            >
              <ExternalLink size={14} />
              Abrir WhatsApp
            </Button>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between">
          {registrado ? (
            <p className="text-sm text-green-600 flex items-center gap-1.5">
              <CheckCircle2 size={15} /> Ação registrada!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Registrar resultado:</p>
          )}
          {!registrado && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleRegistrar('ignorado')} disabled={loading}>
                Ignorar
              </Button>
              <Button size="sm" onClick={() => handleRegistrar('enviado')} disabled={loading}>
                Confirmar envio
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Linha da Fila ────────────────────────────────────────────────────────────

interface LinhaFilaProps {
  item: FilaHoje['cobrancas'][0]
  rule: BillingRule
  onActionDone: () => void
}

function LinhaFila({ item, rule, onActionDone }: LinhaFilaProps) {
  const [mensagemRenderizada, setMensagemRenderizada] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [modalWpp, setModalWpp] = useState(false)

  async function handleCobrar() {
    setLoadingMsg(true)
    try {
      const res = await reguaCobrancaService.renderTemplate(rule.template, item.id)
      const rendered = (res.data as any)?.data?.rendered ?? rule.template
      setMensagemRenderizada(rendered)
      setModalWpp(true)
    } catch {
      // fallback: substituição client-side simples
      const fallback = rule.template
        .replace(/\{\{nome_aluno\}\}/g, item.aluno.nome)
        .replace(/\{\{nome_responsavel\}\}/g, item.responsavel ?? item.aluno.nome)
        .replace(/\{\{valor\}\}/g, fmt(item.valor))
        .replace(/\{\{vencimento\}\}/g, fmtDate(item.vencimento))
      setMensagemRenderizada(fallback)
      setModalWpp(true)
    } finally {
      setLoadingMsg(false)
    }
  }

  async function handleAlertaInterno() {
    try {
      await reguaCobrancaService.logAction({
        cobrancaId: item.id,
        billingRuleId: rule.id,
        actionType: 'internal_alert',
        channel: 'internal',
        messageSnapshot: rule.template,
        status: 'enviado',
      })
      onActionDone()
    } catch {
      /* silencioso */
    }
  }

  return (
    <>
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${item.jaAcionada ? 'opacity-50 bg-muted/30' : 'bg-card hover:bg-muted/20'}`}>
        <AlunoAvatar nome={item.aluno.nome} foto={item.aluno.foto} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{item.aluno.nome}</p>
          <p className="text-xs text-muted-foreground">
            {item.responsavel && `Resp: ${item.responsavel} · `}
            Venc. {fmtDate(item.vencimento)} · {fmt(item.valor)}
          </p>
        </div>
        {item.jaAcionada && (
          <span className="text-xs text-muted-foreground shrink-0">já acionada</span>
        )}
        {!item.jaAcionada && (
          <div className="flex items-center gap-1.5 shrink-0">
            {rule.channel === 'whatsapp' ? (
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCobrar} disabled={loadingMsg}>
                <MessageSquare size={13} />
                {loadingMsg ? '...' : 'Cobrar'}
              </Button>
            ) : rule.channel === 'internal' ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAlertaInterno}>
                <Bell size={13} />
                Registrar alerta
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic">canal em breve</span>
            )}
          </div>
        )}
      </div>

      {modalWpp && mensagemRenderizada && (
        <ModalWhatsapp
          mensagem={mensagemRenderizada}
          telefone={item.telefone}
          nomeAluno={item.aluno.nome}
          cobrancaId={item.id}
          ruleId={rule.id}
          onClose={() => setModalWpp(false)}
          onDone={() => { onActionDone() }}
        />
      )}
    </>
  )
}

// ─── Seção Fila Hoje ──────────────────────────────────────────────────────────

function SecaoFilaHoje({ onAcao }: { onAcao: () => void }) {
  const [fila, setFila] = useState<FilaHoje[]>([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})

  const carregar = useCallback(async () => {
    try {
      const res = await reguaCobrancaService.getFilaHoje()
      const data: FilaHoje[] = (res.data as any)?.data ?? []
      setFila(data)
      // Expande o primeiro bloco automaticamente
      if (data.length > 0 && data[0]) setExpandidos({ [data[0].rule.id]: true })
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  function toggle(id: string) {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleAcao() {
    void carregar()
    onAcao()
  }

  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-muted" />

  if (fila.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 gap-2">
        <CheckCircle2 size={32} className="text-green-500" />
        <p className="text-sm font-medium">Nenhuma ação pendente para hoje</p>
        <p className="text-xs text-muted-foreground">Todas as regras foram aplicadas ou não há cobranças elegíveis</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {fila.map(({ rule, cobrancas }) => {
        const pendentes = cobrancas.filter((c) => !c.jaAcionada).length
        const isOpen = !!expandidos[rule.id]

        return (
          <div key={rule.id} className="rounded-xl border overflow-hidden">
            <button
              onClick={() => toggle(rule.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {CHANNEL_ICON[rule.channel as Channel]}
                <div className="text-left">
                  <p className="text-sm font-semibold">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {EVENT_LABEL[rule.eventType]} · {cobrancas.length} cobrança(s)
                    {pendentes > 0 && (
                      <span className="ml-2 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">
                        {pendentes} pendente{pendentes > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>

            {isOpen && (
              <div className="border-t px-4 py-3 space-y-2 bg-muted/10">
                {cobrancas.map((item) => (
                  <LinhaFila key={item.id} item={item} rule={rule} onActionDone={handleAcao} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Seção Regras ─────────────────────────────────────────────────────────────

function SecaoRegras({ onEdit }: { onEdit: (rule: BillingRule) => void }) {
  const [rules, setRules] = useState<BillingRule[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const res = await reguaCobrancaService.listRules()
      setRules((res.data as any)?.data ?? [])
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  async function toggle(id: string) {
    try {
      await reguaCobrancaService.toggleRule(id)
      setRules((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r))
    } catch { /* silencioso */ }
  }

  async function deletar(id: string) {
    if (!confirm('Remover esta regra?')) return
    try {
      await reguaCobrancaService.deleteRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch { /* silencioso */ }
  }

  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-muted" />

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 gap-2">
        <Zap size={28} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma regra configurada</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rules.map((rule) => (
        <div key={rule.id} className={`rounded-xl border px-4 py-3 flex items-start gap-3 transition-opacity ${rule.isActive ? '' : 'opacity-50'}`}>
          <div className="mt-0.5">{CHANNEL_ICON[rule.channel as Channel]}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{rule.name}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rule.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {rule.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {EVENT_LABEL[rule.eventType]}
              {rule.eventType !== 'on_due' && ` · ${rule.offsetDays} dia(s)`}
              {' · '}{CHANNEL_LABEL[rule.channel as Channel]}
            </p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{rule.template}"</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggle(rule.id)}
              title={rule.isActive ? 'Desativar' : 'Ativar'}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {rule.isActive
                ? <ToggleRight size={18} className="text-green-600" />
                : <ToggleLeft size={18} className="text-muted-foreground" />}
            </button>
            <button
              onClick={() => onEdit(rule)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Editar"
            >
              <Pencil size={15} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => deletar(rule.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
              title="Remover"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Seção Histórico ──────────────────────────────────────────────────────────

function SecaoHistorico({ refresh }: { refresh: number }) {
  const [logs, setLogs] = useState<BillingActionLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const res = await reguaCobrancaService.historico()
        setLogs((res.data as any)?.data ?? [])
      } catch {
        /* silencioso */
      } finally {
        setLoading(false)
      }
    }
    void carregar()
  }, [refresh])

  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-muted" />

  if (logs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ação registrada ainda</p>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE['pendente']!
        return (
          <div key={log.id} className="flex items-start gap-3 rounded-lg border px-4 py-3">
            <div className="mt-0.5 shrink-0">
              {CHANNEL_ICON[(log.channel as Channel) ?? 'internal']}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{log.cobranca?.aluno.nome ?? '—'}</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {log.billingRule?.name ?? log.actionType}
                {log.cobranca && ` · ${fmt(log.cobranca.valor)}`}
                {log.cobranca && ` · Venc. ${fmtDate(log.cobranca.vencimento)}`}
              </p>
              {log.messageSnapshot && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">"{log.messageSnapshot}"</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
              {fmtDatetime(log.triggeredAt)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Seção Templates ──────────────────────────────────────────────────────────

function SecaoTemplates() {
  const [template, setTemplate] = useState(
    'Olá, {{nome_responsavel}}! A mensalidade de {{nome_aluno}} no valor de {{valor}} vence em {{vencimento}}. Qualquer dúvida, estamos à disposição! 😊',
  )
  const [preview, setPreview] = useState(false)

  const previewText = template
    .replace(/\{\{nome_aluno\}\}/g, 'João Silva')
    .replace(/\{\{nome_responsavel\}\}/g, 'Maria Silva')
    .replace(/\{\{valor\}\}/g, 'R$ 350,00')
    .replace(/\{\{vencimento\}\}/g, '10/04/2026')
    .replace(/\{\{link_pagamento\}\}/g, 'https://pix.kumon.example')
    .replace(/\{\{linha_digitavel\}\}/g, '1234.56789 01234.56789...')
    .replace(/\{\{instituicao\}\}/g, 'Asaas')

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Templates são usados nas regras da régua. Edite as regras para alterar os templates individualmente.
        Use este editor para testar e montar mensagens antes de salvar em uma regra.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="tpl-editor">Editor de template</Label>
        <textarea
          id="tpl-editor"
          rows={5}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground self-center mr-1">Inserir variável:</span>
        {VARIABLES.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setTemplate((prev) => prev + v.key)}
            title={v.desc}
            className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-mono"
          >
            {v.key}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPreview(!preview)}>
          <Eye size={13} />
          {preview ? 'Fechar preview' : 'Preview'}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copiarMensagem(template)}>
          <Copy size={13} />
          Copiar template
        </Button>
      </div>

      {preview && (
        <div className="rounded-xl border bg-green-50/60 px-5 py-4">
          <p className="text-xs font-semibold text-green-800 mb-2 uppercase tracking-wide">Preview com dados fictícios</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-green-900">{previewText}</p>
        </div>
      )}

      {/* Tabela de variáveis */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-2 text-left">Variável</th>
              <th className="px-4 py-2 text-left">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {VARIABLES.map((v) => (
              <tr key={v.key} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{v.key}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{v.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Card de Automação ────────────────────────────────────────────────────────

function CardAutomacao({ status, onExecutar }: {
  status: AutomationStatus | null
  onExecutar: () => void
}) {
  const [executando, setExecutando] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleExecutar() {
    if (!confirm('Executar a régua de cobrança agora manualmente?')) return
    setExecutando(true); setFeedback(null)
    try {
      const res = await reguaCobrancaService.runAutomation()
      const d = (res.data as any)?.data
      setFeedback(`Concluído — ${d?.processedCount ?? 0} ações geradas, ${d?.errorCount ?? 0} erros, ${d?.skippedCount ?? 0} puladas`)
      onExecutar()
    } catch (e: any) {
      setFeedback(`Erro: ${e?.response?.data?.error ?? 'Falha na execução'}`)
    } finally {
      setExecutando(false)
    }
  }

  const ultima = status?.ultimaExecucao
  const statusBadge = ultima
    ? ultima.status === 'completed'
      ? { label: 'OK', cls: 'bg-green-50 text-green-700 border-green-200' }
      : ultima.status === 'running'
      ? { label: 'Executando', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
      : { label: 'Erro', cls: 'bg-red-50 text-red-700 border-red-200' }
    : null

  return (
    <Card className={`border ${status?.autoEnabled ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status do agendador */}
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${status?.autoEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Zap size={16} className={status?.autoEnabled ? 'text-green-600' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">
                Automação{' '}
                <span className={`text-xs font-normal ${status?.autoEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {status?.autoEnabled ? '● Ativa' : '○ Inativa'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status?.autoEnabled
                  ? `Cron: ${status.cronSchedule} (BRT) — executa automaticamente`
                  : 'Defina BILLING_AUTO_ENABLED=true no Railway para ativar'}
              </p>
            </div>
          </div>

          {/* KPIs inline */}
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums">{status?.execucoesHoje ?? '—'}</p>
              <p className="text-[11px] text-muted-foreground">Execuções hoje</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{status?.acoesAutoHoje ?? '—'}</p>
              <p className="text-[11px] text-muted-foreground">Ações geradas</p>
            </div>
            {ultima && (
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge?.cls}`}>
                    {statusBadge?.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(ultima.startedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ultima.processedCount} processadas · {ultima.errorCount} erros
                </p>
              </div>
            )}
            {!ultima && (
              <div>
                <p className="text-xs text-muted-foreground">Nenhuma execução</p>
              </div>
            )}
          </div>

          {/* Botão executar agora */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExecutar}
            disabled={executando}
            className="gap-1.5 shrink-0"
          >
            {executando ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            {executando ? 'Executando...' : 'Executar agora'}
          </Button>
        </div>

        {feedback && (
          <p className={`mt-3 text-xs rounded-lg px-3 py-2 border ${feedback.startsWith('Erro') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {feedback}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── RegraCobrancaPage ────────────────────────────────────────────────────────

type Secao = 'fila' | 'regras' | 'templates' | 'historico'

export default function RegraCobrancaPage() {
  const [resumo, setResumo] = useState<any>(null)
  const [automacao, setAutomacao] = useState<AutomationStatus | null>(null)
  const [secao, setSecao] = useState<Secao>('fila')
  const [modalRegra, setModalRegra] = useState(false)
  const [editandoRegra, setEditandoRegra] = useState<BillingRule | null>(null)
  const [refreshHistorico, setRefreshHistorico] = useState(0)

  const carregarResumo = useCallback(async () => {
    try {
      const res = await reguaCobrancaService.resumo()
      setResumo((res.data as any)?.data ?? null)
    } catch { /* silencioso */ }
  }, [])

  const carregarAutomacao = useCallback(async () => {
    try {
      const res = await reguaCobrancaService.automationStatus()
      setAutomacao((res.data as any)?.data ?? null)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    void carregarResumo()
    void carregarAutomacao()
  }, [carregarResumo, carregarAutomacao])

  function handleAcaoFeita() {
    void carregarResumo()
    void carregarAutomacao()
    setRefreshHistorico((n) => n + 1)
  }

  function handleEditRegra(rule: BillingRule) {
    setEditandoRegra(rule)
    setModalRegra(true)
  }

  function handleNovaRegra() {
    setEditandoRegra(null)
    setModalRegra(true)
  }

  const SECOES: { id: Secao; label: string; icon: React.ReactNode }[] = [
    { id: 'fila', label: 'Fila de hoje', icon: <Calendar size={14} /> },
    { id: 'regras', label: 'Regras', icon: <Zap size={14} /> },
    { id: 'templates', label: 'Templates', icon: <MessageSquare size={14} /> },
    { id: 'historico', label: 'Histórico', icon: <History size={14} /> },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Regras ativas"
          value={resumo?.regrasAtivas ?? '—'}
          icon={<Zap size={17} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <KpiCard
          label="Vencendo hoje"
          value={resumo?.vencendoHoje ?? '—'}
          icon={<Clock size={17} className="text-orange-600" />}
          color="bg-orange-50"
          sub="requerem atenção"
        />
        <KpiCard
          label="Próx. 3 dias"
          value={resumo?.vencendoEm3Dias ?? '—'}
          icon={<Calendar size={17} className="text-blue-600" />}
          color="bg-blue-50"
          sub="vencimentos à vista"
        />
        <KpiCard
          label="Atraso crítico"
          value={resumo?.atrasoCritico ?? '—'}
          icon={<AlertTriangle size={17} className="text-red-500" />}
          color="bg-red-50"
          sub="+5 dias em aberto"
        />
        <KpiCard
          label="Ações hoje"
          value={resumo?.acoesHoje ?? '—'}
          icon={<CheckCircle2 size={17} className="text-green-600" />}
          color="bg-green-50"
          sub="registradas"
        />
      </div>

      {/* Automação */}
      <CardAutomacao status={automacao} onExecutar={handleAcaoFeita} />

      {/* Sub-nav + ação */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 border-b flex-1">
          {SECOES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSecao(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                secao === s.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        {secao === 'regras' && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleNovaRegra}>
            <Plus size={14} /> Nova regra
          </Button>
        )}
      </div>

      {/* Conteúdo da seção */}
      <div key={secao} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
        {secao === 'fila' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar size={16} />
                Fila de ações para hoje
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Cobranças elegíveis para disparo neste momento, calculadas a partir das regras ativas.
              </p>
            </CardHeader>
            <CardContent>
              <SecaoFilaHoje onAcao={handleAcaoFeita} />
            </CardContent>
          </Card>
        )}

        {secao === 'regras' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap size={16} />
                Regras da régua
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure quando e como o sistema deve agir sobre cobranças.
              </p>
            </CardHeader>
            <CardContent>
              <SecaoRegras onEdit={handleEditRegra} />
            </CardContent>
          </Card>
        )}

        {secao === 'templates' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare size={16} />
                Templates de mensagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SecaoTemplates />
            </CardContent>
          </Card>
        )}

        {secao === 'historico' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History size={16} />
                Histórico de ações
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Últimas 20 ações de cobrança registradas.
              </p>
            </CardHeader>
            <CardContent>
              <SecaoHistorico refresh={refreshHistorico} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Nota de arquitetura */}
      <div className="rounded-xl border border-dashed bg-muted/30 px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Pronto para automação futura
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A fila é calculada sob demanda (MVP assistido). Para automação real, basta um
          scheduler/cron que chame <code className="font-mono bg-muted px-1 rounded">GET /api/regua-cobranca/fila-hoje</code> e
          processe cada item — a API já suporta disparo em lote.
          WhatsApp Business API, e-mail e webhooks: substituir os stubs nos adapters de canal.
        </p>
      </div>

      {/* Modal de regra */}
      {modalRegra && (
        <ModalRegra
          rule={editandoRegra}
          onClose={() => { setModalRegra(false); setEditandoRegra(null) }}
          onSaved={() => { void carregarResumo(); setRefreshHistorico((n) => n + 1) }}
        />
      )}
    </div>
  )
}
