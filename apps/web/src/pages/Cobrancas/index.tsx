import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, X, Send, QrCode, ExternalLink } from 'lucide-react'
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

const PAGE_SIZE = 15

export default function CobrancasPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [gatewayAtivo, setGatewayAtivo] = useState(false)
  const [enviando, setEnviando] = useState<Cobranca | null>(null)

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
      <PageHeader
        title="Cobranças"
        subtitle="Gerencie boletos e cobranças dos alunos"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nova Cobrança
          </Button>
        }
      />

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
      {enviando && (
        <ModalEnviarAsaas
          cobranca={enviando}
          onClose={() => setEnviando(null)}
          onSent={() => { void fetchData(filtroStatus, page) }}
        />
      )}
    </div>
  )
}
