import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, X, Send, QrCode, ExternalLink, MessageSquare, Copy, Check, History, Phone, PhoneOff, Mail } from 'lucide-react'
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
import { gatewayService } from '../../services/gateway.service'
import {
  reguaCobrancaService,
  montarUrlWhatsapp,
  copiarMensagem,
  type BillingActionLog,
} from '../../services/reguaCobranca.service'

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
  onSaved: (cobranca: Cobranca) => void
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
      const res = await cobrancasService.criar({ alunoId, valor: valorNum, vencimento, descricao: descricao.trim() || undefined })
      const criada = (res.data as any)?.data ?? res.data
      onSaved(criada)
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
                Após criar, use o botão <strong>WhatsApp</strong> na linha da cobrança para enviar a mensagem ao responsável.
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

// ─── Modal Enviar Asaas ───────────────────────────────────────────────────────

interface ModalEnviarAsaasProps {
  cobranca: Cobranca
  onClose: () => void
  onSent: () => void
}

function ModalEnviarAsaas({ cobranca, onClose, onSent }: ModalEnviarAsaasProps) {
  const [tipo, setTipo] = useState<'PIX' | 'BOLETO'>('PIX')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<any>(null)

  async function handleEnviar() {
    setLoading(true); setError(null)
    try {
      const res = await gatewayService.enviarCobranca(cobranca.id, tipo)
      setResultado(res.data?.data)
      onSent()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao enviar cobrança')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Enviar via Asaas</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><X size={16} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <p className="text-sm text-muted-foreground">Aluno: <span className="font-medium text-foreground">{cobranca.aluno.nome}</span></p>
            <p className="text-sm text-muted-foreground">Valor: <span className="font-medium text-foreground">{formatarValor(Number(cobranca.valor))}</span></p>
            <p className="text-sm text-muted-foreground">Vencimento: <span className="font-medium text-foreground">{formatarData(cobranca.vencimento)}</span></p>
          </div>

          {!resultado && (
            <>
              <div className="space-y-1.5">
                <Label>Tipo de cobrança</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PIX', 'BOLETO'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                        tipo === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {t === 'PIX' ? <QrCode size={16} /> : <Receipt size={16} />}
                      {t === 'BOLETO' ? 'Boleto' : 'Pix'}
                    </button>
                  ))}
                </div>
              </div>

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button onClick={handleEnviar} disabled={loading}>
                  <Send size={14} />
                  {loading ? 'Enviando...' : 'Enviar Cobrança'}
                </Button>
              </div>
            </>
          )}

          {resultado && (
            <div className="space-y-3">
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800 font-medium">Cobrança enviada com sucesso!</AlertDescription>
              </Alert>

              {resultado.pixChave && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Pix Copia e Cola:</p>
                  <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all select-all">
                    {resultado.pixChave}
                  </div>
                  {resultado.pixQrCode && (
                    <img
                      src={`data:image/png;base64,${resultado.pixQrCode}`}
                      alt="QR Code Pix"
                      className="h-36 w-36 mx-auto rounded"
                    />
                  )}
                </div>
              )}

              {resultado.boletoUrl && (
                <a
                  href={resultado.boletoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink size={14} /> Abrir boleto bancário
                </a>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={onClose}>Fechar</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Template padrão WhatsApp ─────────────────────────────────────────────────
const TEMPLATE_WPP =
  'Olá, {{nome_responsavel}}! A mensalidade de *{{nome_aluno}}*, no valor de *{{valor}}*, vence em *{{vencimento}}*. Caso precise dos dados de pagamento, é só responder esta mensagem.'

// ─── Modal WhatsApp ───────────────────────────────────────────────────────────

interface ModalWhatsappProps {
  cobranca: Cobranca
  onClose: () => void
  onEnviado: () => void
}

function ModalWhatsapp({ cobranca, onClose, onEnviado }: ModalWhatsappProps) {
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
        // fallback local sem chamada ao servidor
        const venc = new Date(cobranca.vencimento).toLocaleDateString('pt-BR')
        const valor = Number(cobranca.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        setMensagem(
          `Olá, ${responsavel?.nome ?? 'responsável'}! A mensalidade de *${cobranca.aluno.nome}*, no valor de *${valor}*, vence em *${venc}*. Caso precise dos dados de pagamento, é só responder.`,
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

  async function handleAbrirWhatsapp() {
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
            <MessageSquare size={16} className="text-green-600" />
            Enviar por WhatsApp
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Info cobrança */}
          <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">Aluno: </span><span className="font-medium">{cobranca.aluno.nome}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Valor: </span><span className="font-medium">{Number(cobranca.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Vencimento: </span><span className="font-medium">{new Date(cobranca.vencimento).toLocaleDateString('pt-BR')}</span></p>
          </div>

          {/* Responsável / telefone */}
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${telefone ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
            {telefone
              ? <Phone size={14} className="text-green-600 shrink-0" />
              : <PhoneOff size={14} className="text-orange-600 shrink-0" />}
            <span className={telefone ? 'text-green-800' : 'text-orange-800'}>
              {telefone
                ? <>{responsavel?.nome ?? 'Responsável'} — <strong>{telefone}</strong></>
                : <>Nenhum telefone cadastrado para o responsável. Copie a mensagem e envie manualmente.</>
              }
            </span>
          </div>

          {/* Mensagem gerada */}
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
            <p className="text-xs text-muted-foreground">Edite a mensagem se necessário antes de enviar.</p>
          </div>

          {registrado && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <Check size={14} /> Ação registrada no histórico.
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 flex-wrap justify-end border-t pt-4">
            <Button variant="outline" size="sm" onClick={handleCopiar} disabled={loading} className="gap-1.5">
              {copiado ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copiado ? 'Copiado!' : 'Copiar mensagem'}
            </Button>
            <Button
              size="sm"
              onClick={handleAbrirWhatsapp}
              disabled={loading || !telefone}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              title={!telefone ? 'Sem telefone cadastrado' : undefined}
            >
              <MessageSquare size={13} />
              Abrir WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Histórico de ações ─────────────────────────────────────────────────

interface ModalHistoricoProps {
  cobranca: Cobranca
  onClose: () => void
}

const ACTION_LABELS: Record<string, string> = {
  whatsapp_sent: 'WhatsApp enviado',
  whatsapp_prepared: 'Mensagem copiada',
  email_sent: 'E-mail enviado',
  internal_alert: 'Alerta interno',
  manual: 'Ação manual',
  ignored: 'Ignorada',
  auto_error: 'Erro automático',
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
            <History size={16} />
            Histórico — {cobranca.aluno.nome}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {loading && <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>}
          {!loading && logs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ação registrada para esta cobrança.</p>
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
                    {log.triggeredBy && (
                      <span className="text-xs text-muted-foreground">· {log.triggeredBy}</span>
                    )}
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

// ─── Modal Email ─────────────────────────────────────────────────────────────

interface ModalEmailCobrancaProps {
  cobranca: Cobranca
  onClose: () => void
  onEnviado: () => void
}

function ModalEmailCobranca({ cobranca, onClose, onEnviado }: ModalEmailCobrancaProps) {
  const responsavel = cobranca.aluno.responsaveis?.[0]?.responsavel ?? null
  const email = responsavel?.email ?? null

  const [subject, setSubject] = useState(`Cobrança — ${cobranca.aluno.nome}`)
  const [template, setTemplate] = useState(
    `Olá, {{nome_responsavel}}!\n\nInformamos que há uma cobrança para {{nome_aluno}} no valor de {{valor}} com vencimento em {{vencimento}}.\n\nCaso tenha dúvidas, entre em contato conosco.\n\nAtenciosamente,\nEquipe Kumon`,
  )
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEnviar() {
    if (!email) return
    setLoading(true); setError(null)
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
            <Mail size={16} className="text-purple-600" />
            Enviar por E-mail
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X size={16} />
          </button>
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
                  rows={5}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {'{{nome_aluno}}'}, {'{{nome_responsavel}}'}, {'{{valor}}'}, {'{{vencimento}}'}.
                </p>
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

const PAGE_SIZE = 15

export default function CobrancasPage({ embedded = false }: { embedded?: boolean }) {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [gatewayAtivo, setGatewayAtivo] = useState(false)
  const [enviando, setEnviando] = useState<Cobranca | null>(null)
  const [wppCobranca, setWppCobranca] = useState<Cobranca | null>(null)
  const [emailCobranca, setEmailCobranca] = useState<Cobranca | null>(null)
  const [historicoCobranca, setHistoricoCobranca] = useState<Cobranca | null>(null)

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
    gatewayService.buscar().then((r) => setGatewayAtivo(r.data?.data?.ativo ?? false)).catch(() => {})
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
      {!embedded ? (
        <PageHeader
          title="Cobranças"
          subtitle="Gerencie boletos e cobranças dos alunos"
          actions={
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Nova Cobrança
            </Button>
          }
        />
      ) : (
        <div className="flex items-center justify-end">
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nova Cobrança
          </Button>
        </div>
      )}

      {!gatewayAtivo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-700">
            <strong>Asaas não configurado.</strong> Configure a integração para emitir cobranças via Pix ou boleto automaticamente.
          </p>
          <a href="/configuracoes" className="text-xs font-medium text-amber-800 underline whitespace-nowrap">Configurar</a>
        </div>
      )}

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
                        {/* WhatsApp — para cobranças em aberto */}
                        {c.status !== 'paga' && c.status !== 'cancelada' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWppCobranca(c)}
                            title="Enviar cobrança por WhatsApp"
                            className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          >
                            <MessageSquare size={13} />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                        )}
                        {/* E-mail — para cobranças em aberto */}
                        {c.status !== 'paga' && c.status !== 'cancelada' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEmailCobranca(c)}
                            title="Enviar cobrança por E-mail"
                            className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50 px-2"
                          >
                            <Mail size={13} />
                          </Button>
                        )}
                        {gatewayAtivo && c.status === 'aguardando' && (
                          <Button variant="outline" size="sm" onClick={() => setEnviando(c)} title="Enviar via Asaas">
                            <Send size={13} /> Enviar
                          </Button>
                        )}
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
                        {/* Histórico de ações */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoricoCobranca(c)}
                          title="Ver histórico de ações"
                          className="text-muted-foreground px-2"
                        >
                          <History size={13} />
                        </Button>
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
          onSaved={(cobranca) => {
            setModalOpen(false)
            void fetchData(filtroStatus, page)
            if (gatewayAtivo) setEnviando(cobranca)
          }}
        />
      )}
      {enviando && (
        <ModalEnviarAsaas
          cobranca={enviando}
          onClose={() => setEnviando(null)}
          onSent={() => { void fetchData(filtroStatus, page) }}
        />
      )}
      {wppCobranca && (
        <ModalWhatsapp
          cobranca={wppCobranca}
          onClose={() => setWppCobranca(null)}
          onEnviado={() => void fetchData(filtroStatus, page)}
        />
      )}
      {emailCobranca && (
        <ModalEmailCobranca
          cobranca={emailCobranca}
          onClose={() => setEmailCobranca(null)}
          onEnviado={() => void fetchData(filtroStatus, page)}
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
