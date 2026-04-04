import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Landmark, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Star,
  FileDown, Upload, CheckCircle2, AlertTriangle, X, ChevronDown,
  ChevronUp, FileText, Info, ShieldCheck, Zap, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import {
  bancosService, downloadCnabFile, readFileAsText,
  type BillingBankAccount, type BankCatalog, type RetornoPreview, type CnabFileLog,
} from '../../services/bancos.service'
import { gatewayService } from '../../services/gateway.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

function fmtDatetime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function maskDoc(doc: string) {
  const d = doc.replace(/\D/g, '')
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ account }: { account: BillingBankAccount }) {
  if (!account.isActive) return <span className="rounded-full border bg-gray-100 text-gray-500 px-2 py-0.5 text-[10px] font-semibold">Inativa</span>
  const erros = !account.agreementCode || !account.walletCode
  if (erros) return <span className="rounded-full border border-orange-200 bg-orange-50 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">Incompleta</span>
  return <span className="rounded-full border border-green-200 bg-green-50 text-green-700 px-2 py-0.5 text-[10px] font-semibold">Configurada</span>
}

// ─── Modal: Nova / Editar Conta ──────────────────────────────────────────────

interface ModalContaProps {
  conta?: BillingBankAccount | null
  catalogo: BankCatalog[]
  onClose: () => void
  onSaved: () => void
}

function ModalConta({ conta, catalogo, onClose, onSaved }: ModalContaProps) {
  const [bankCode, setBankCode] = useState(conta?.bankCode ?? '')
  const [accountName, setAccountName] = useState(conta?.accountName ?? '')
  const [agency, setAgency] = useState(conta?.agency ?? '')
  const [agencyDigit, setAgencyDigit] = useState(conta?.agencyDigit ?? '')
  const [accountNumber, setAccountNumber] = useState(conta?.accountNumber ?? '')
  const [accountDigit, setAccountDigit] = useState(conta?.accountDigit ?? '')
  const [agreementCode, setAgreementCode] = useState(conta?.agreementCode ?? '')
  const [walletCode, setWalletCode] = useState(conta?.walletCode ?? '')
  const [beneficiaryName, setBeneficiaryName] = useState(conta?.beneficiaryName ?? '')
  const [beneficiaryDocument, setBeneficiaryDocument] = useState(conta?.beneficiaryDocument ?? '')
  const [remittanceLayout, setRemittanceLayout] = useState(conta?.remittanceLayout ?? 'cnab240')
  const [protestDays, setProtestDays] = useState(String(conta?.protestDays ?? 0))
  const [instructions, setInstructions] = useState(conta?.instructions ?? '')
  const [isDefault, setIsDefault] = useState(conta?.isDefault ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBank = catalogo.find((b) => b.code === bankCode)

  async function handleSave() {
    if (!bankCode || !accountName || !agency || !accountNumber || !beneficiaryName || !beneficiaryDocument) {
      setError('Preencha todos os campos obrigatórios (*)'); return
    }
    setLoading(true); setError(null)
    try {
      const data = { bankCode, accountName, agency, agencyDigit, accountNumber, accountDigit, agreementCode, walletCode, beneficiaryName, beneficiaryDocument: beneficiaryDocument.replace(/\D/g, ''), remittanceLayout, protestDays: Number(protestDays), instructions, isDefault }
      if (conta) {
        await bancosService.updateConta(conta.id, data)
      } else {
        await bancosService.createConta(data)
      }
      onSaved(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-background shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">{conta ? 'Editar conta bancária' : 'Nova conta bancária'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Banco */}
          <div className="space-y-1.5">
            <Label>Banco *</Label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione o banco...</option>
              {catalogo.map((b) => (
                <option key={b.code} value={b.code}>{b.code} — {b.name} ({b.cnabSupport})</option>
              ))}
            </select>
            {selectedBank?.metadata && (() => {
              try {
                const m = JSON.parse(selectedBank.metadata)
                return <p className="text-xs text-muted-foreground">{m.obs}</p>
              } catch { return null }
            })()}
          </div>

          <div className="space-y-1.5">
            <Label>Nome da conta (identificação interna) *</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Ex: Bradesco Conta Principal" />
          </div>

          {/* Agência / Conta */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Agência *</Label>
              <Input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="0001" maxLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label>Dígito ag.</Label>
              <Input value={agencyDigit} onChange={(e) => setAgencyDigit(e.target.value)} placeholder="X" maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta *</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="000000" maxLength={13} />
            </div>
            <div className="space-y-1.5">
              <Label>Dígito cta.</Label>
              <Input value={accountDigit} onChange={(e) => setAccountDigit(e.target.value)} placeholder="X" maxLength={2} />
            </div>
          </div>

          {/* Convênio / Carteira */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código de convênio</Label>
              <Input value={agreementCode} onChange={(e) => setAgreementCode(e.target.value)} placeholder="Fornecido pelo banco" />
              <p className="text-xs text-muted-foreground">Obrigatório para geração de remessa CNAB</p>
            </div>
            <div className="space-y-1.5">
              <Label>Carteira (código)</Label>
              <Input value={walletCode} onChange={(e) => setWalletCode(e.target.value)} placeholder="Ex: 09, 17, 109..." maxLength={5} />
            </div>
          </div>

          {/* Beneficiário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do beneficiário *</Label>
              <Input value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Razão social ou nome" />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ / CPF *</Label>
              <Input value={beneficiaryDocument} onChange={(e) => setBeneficiaryDocument(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          {/* Layout / Protesto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Layout de remessa</Label>
              <select
                value={remittanceLayout}
                onChange={(e) => setRemittanceLayout(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {selectedBank?.cnab240Supported && <option value="cnab240">CNAB 240</option>}
                {selectedBank?.cnab400Supported && <option value="cnab400">CNAB 400</option>}
                {!bankCode && <option value="cnab240">CNAB 240</option>}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Dias para protesto</Label>
              <Input type="number" min="0" max="60" value={protestDays} onChange={(e) => setProtestDays(e.target.value)} />
            </div>
          </div>

          {/* Instruções / Padrão */}
          <div className="space-y-1.5">
            <Label>Instruções do título</Label>
            <textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Não aceitar após o vencimento. Cobrar multa de 2%."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary" />
            <span className="text-sm">Definir como conta padrão da unidade</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar conta'}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Gerar Remessa ────────────────────────────────────────────────────

interface ModalRemessaProps {
  conta: BillingBankAccount
  onClose: () => void
  onDone: () => void
}

function ModalRemessa({ conta, onClose, onDone }: ModalRemessaProps) {
  const [cobrancas, setCobrancas] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    bancosService.getElegiveis(conta.id)
      .then((r) => setCobrancas((r.data as any)?.data ?? []))
      .catch(() => setError('Erro ao carregar cobranças'))
      .finally(() => setLoading(false))
  }, [conta.id])

  function toggleAll() {
    if (selected.size === cobrancas.length) setSelected(new Set())
    else setSelected(new Set(cobrancas.map((c: any) => c.id)))
  }

  async function handleGerar() {
    if (selected.size === 0) { setError('Selecione pelo menos uma cobrança'); return }
    setGerando(true); setError(null)
    try {
      const res = await bancosService.gerarRemessa(conta.id, Array.from(selected))
      const data = (res.data as any)?.data
      downloadCnabFile(data.content, data.fileName)
      onDone(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao gerar remessa')
    } finally {
      setGerando(false)
    }
  }

  const totalSelecionado = cobrancas
    .filter((c: any) => selected.has(c.id))
    .reduce((s: number, c: any) => s + Number(c.valor), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-background shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Gerar Remessa CNAB</h2>
            <p className="text-xs text-muted-foreground">{conta.accountName} · {conta.remittanceLayout.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}
          {loading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : cobrancas.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
              <CheckCircle2 size={32} className="text-green-500" />
              <p className="text-sm">Nenhuma cobrança elegível para remessa</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {selected.size === cobrancas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
                <span className="text-xs text-muted-foreground">{selected.size} selecionada(s)</span>
              </div>
              {cobrancas.map((c: any) => (
                <label key={c.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${selected.has(c.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <input type="checkbox" checked={selected.has(c.id)}
                    onChange={() => setSelected((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                    className="h-4 w-4 accent-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.aluno?.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Venc. {fmtDate(c.vencimento)} ·
                      {c.aluno?.responsaveis?.[0]?.responsavel?.cpf ? ' CPF OK' : <span className="text-orange-600"> sem CPF</span>}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">{fmt(c.valor)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          {selected.size > 0 && (
            <p className="text-sm font-medium">Total: <span className="text-primary">{fmt(totalSelecionado)}</span></p>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleGerar} disabled={gerando || selected.size === 0} className="gap-1.5">
              <FileDown size={14} />{gerando ? 'Gerando...' : `Gerar e baixar (${selected.size})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Importar Retorno ──────────────────────────────────────────────────

interface ModalRetornoProps {
  conta: BillingBankAccount
  onClose: () => void
  onDone: () => void
}

function ModalRetorno({ conta, onClose, onDone }: ModalRetornoProps) {
  const [preview, setPreview] = useState<RetornoPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [efetivando, setEfetivando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true); setError(null); setPreview(null)
    try {
      const content = await readFileAsText(file)
      const res = await bancosService.previewRetorno(conta.id, file.name, content)
      setPreview((res.data as any)?.data ?? null)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao processar arquivo')
    } finally {
      setLoading(false)
    }
  }

  async function handleEfetivar() {
    if (!preview?.cnabFileId) return
    setEfetivando(true)
    try {
      const res = await bancosService.efetivarRetorno(preview.cnabFileId)
      const r = (res.data as any)?.data
      alert(`Retorno processado: ${r.processedCount} conciliados, ${r.errorCount} sem match.`)
      onDone(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao efetivar retorno')
    } finally {
      setEfetivando(false)
    }
  }

  const CATEGORY_LABEL: Record<string, string> = {
    payment: 'Liquidação', entry_confirmed: 'Entrada', write_off: 'Baixa',
    rejection: 'Rejeição', alteration: 'Alteração', protest: 'Protesto', unknown: 'Outro',
  }
  const CATEGORY_CLS: Record<string, string> = {
    payment: 'bg-green-100 text-green-700 border-green-200',
    entry_confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    write_off: 'bg-gray-100 text-gray-600 border-gray-200',
    rejection: 'bg-red-100 text-red-700 border-red-200',
    alteration: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    protest: 'bg-orange-100 text-orange-700 border-orange-200',
    unknown: 'bg-muted text-muted-foreground border',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-background shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">Importar Retorno CNAB</h2>
            <p className="text-xs text-muted-foreground">{conta.accountName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Upload */}
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Clique ou arraste o arquivo de retorno</p>
            <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: .RET, .TXT, .240 (CNAB 240)</p>
            <input ref={fileRef} type="file" accept=".ret,.txt,.240,.RET,.TXT" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {loading && <div className="h-16 animate-pulse rounded-xl bg-muted" />}

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-blue-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-blue-700">{preview.totalRecords}</p>
                  <p className="text-xs text-blue-600">registros</p>
                </div>
                <div className="rounded-lg border bg-green-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-green-700">{preview.matched}</p>
                  <p className="text-xs text-green-600">vinculados</p>
                </div>
                <div className="rounded-lg border bg-orange-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-orange-700">{preview.unmatched}</p>
                  <p className="text-xs text-orange-600">sem match</p>
                </div>
              </div>

              {preview.parseErrors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-red-700 mb-1">Erros de parse:</p>
                  {preview.parseErrors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ocorrências</p>
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {preview.occurrences.slice(0, 50).map((occ, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 font-semibold ${CATEGORY_CLS[occ.category] ?? CATEGORY_CLS['unknown']}`}>
                        {CATEGORY_LABEL[occ.category] ?? occ.category}
                      </span>
                      <span className="flex-1 truncate font-medium">{occ.alunoNome ?? occ.ourNumber}</span>
                      {occ.paidAmount && <span className="tabular-nums shrink-0">{fmt(occ.paidAmount)}</span>}
                      {!occ.matchFound && <span className="text-orange-600 shrink-0">sem match</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {preview && (
            <Button onClick={handleEfetivar} disabled={efetivando} className="gap-1.5">
              <CheckCircle2 size={14} />{efetivando ? 'Processando...' : 'Confirmar e conciliar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Card de Conta Bancária ───────────────────────────────────────────────────

interface CartaoBancoProps {
  conta: BillingBankAccount
  onEdit: (c: BillingBankAccount) => void
  onRemessa: (c: BillingBankAccount) => void
  onRetorno: (c: BillingBankAccount) => void
  onReload: () => void
}

function CartaoBanco({ conta, onEdit, onRemessa, onRetorno, onReload }: CartaoBancoProps) {
  const [expandido, setExpandido] = useState(false)
  const [arquivos, setArquivos] = useState<CnabFileLog[]>([])
  const [loadArq, setLoadArq] = useState(false)

  async function toggleExpand() {
    if (!expandido && arquivos.length === 0) {
      setLoadArq(true)
      bancosService.listArquivos(conta.id)
        .then((r) => setArquivos((r.data as any)?.data ?? []))
        .finally(() => setLoadArq(false))
    }
    setExpandido(!expandido)
  }

  async function handleToggle() {
    await bancosService.toggleActive(conta.id)
    onReload()
  }

  async function handleSetDefault() {
    await bancosService.setDefault(conta.id)
    onReload()
  }

  async function handleDelete() {
    if (!confirm(`Excluir conta "${conta.accountName}"? Esta operação não pode ser desfeita.`)) return
    try {
      await bancosService.deleteConta(conta.id)
      onReload()
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Erro ao excluir')
    }
  }

  const ultimoArq = conta.cnabFiles?.[0]

  return (
    <div className={`rounded-xl border overflow-hidden transition-opacity ${conta.isActive ? '' : 'opacity-60'}`}>
      {/* Linha principal */}
      <div className="flex items-start gap-4 px-5 py-4 bg-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Landmark size={18} className="text-blue-600" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{conta.accountName}</p>
            <StatusBadge account={conta} />
            {conta.isDefault && (
              <span className="flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700 px-2 py-0.5 text-[10px] font-semibold">
                <Star size={10} /> Padrão
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conta.bankCode} — {conta.bankName} · Ag {conta.agency}/{conta.agencyDigit ?? '0'} · Cta {conta.accountNumber}-{conta.accountDigit ?? '0'}
          </p>
          <p className="text-xs text-muted-foreground">
            {conta.remittanceLayout.toUpperCase()}
            {conta.walletCode && ` · Carteira ${conta.walletCode}`}
            {conta.agreementCode && ` · Conv. ${conta.agreementCode}`}
          </p>
          {ultimoArq && (
            <p className="text-xs text-muted-foreground mt-1">
              Último {ultimoArq.type}: <span className="font-medium">{ultimoArq.fileName}</span> · {fmtDatetime(ultimoArq.createdAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => onRemessa(conta)} title="Gerar remessa">
            <FileDown size={13} /> Remessa
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => onRetorno(conta)} title="Importar retorno">
            <Upload size={13} /> Retorno
          </Button>
          <button onClick={() => onEdit(conta)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Editar">
            <Pencil size={14} className="text-muted-foreground" />
          </button>
          {!conta.isDefault && (
            <button onClick={handleSetDefault} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Definir como padrão">
              <Star size={14} className="text-muted-foreground" />
            </button>
          )}
          <button onClick={handleToggle} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={conta.isActive ? 'Desativar' : 'Ativar'}>
            {conta.isActive ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-muted-foreground" />}
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Excluir">
            <Trash2 size={14} />
          </button>
          <button onClick={toggleExpand} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Logs expandidos */}
      {expandido && (
        <div className="border-t bg-muted/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Histórico de arquivos</p>
          {loadArq ? (
            <div className="h-8 animate-pulse rounded bg-muted" />
          ) : arquivos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum arquivo gerado ou importado ainda</p>
          ) : (
            <div className="space-y-1.5">
              {arquivos.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-xs">
                  <FileText size={13} className={f.type === 'remessa' ? 'text-blue-600' : 'text-green-600'} />
                  <span className="font-medium">{f.fileName}</span>
                  <span className="text-muted-foreground">{f.type}</span>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${f.status === 'processado' ? 'bg-green-50 text-green-700 border-green-200' : f.status === 'erro' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                    {f.status}
                  </span>
                  {f.processedCount != null && <span className="text-muted-foreground">{f.processedCount} títulos</span>}
                  <span className="ml-auto text-muted-foreground">{fmtDatetime(f.createdAt)}</span>
                  {f.createdBy && <span className="text-muted-foreground">{f.createdBy}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Seção: Gateway/API (Asaas) ───────────────────────────────────────────────

function SecaoGateway() {
  const [gatewayAtivo, setGatewayAtivo] = useState<boolean | null>(null)
  const [gatewayInfo, setGatewayInfo] = useState<any>(null)

  useEffect(() => {
    gatewayService.buscar()
      .then((r) => {
        const gw = (r.data as any)?.data
        setGatewayInfo(gw)
        setGatewayAtivo(gw?.ativo ?? false)
      })
      .catch(() => setGatewayAtivo(false))
  }, [])

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4 bg-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
          <Zap size={18} className="text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">Asaas</p>
            {gatewayAtivo === null ? null : gatewayAtivo ? (
              <span className="rounded-full border border-green-200 bg-green-50 text-green-700 px-2 py-0.5 text-[10px] font-semibold">Ativo</span>
            ) : (
              <span className="rounded-full border bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">Não configurado</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gateway API — PIX e boleto via integração direta · {gatewayInfo?.ambiente === 'producao' ? 'Produção' : 'Sandbox'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Emissão imediata por API REST, sem geração de arquivo CNAB. Ideal para cobrança online.
          </p>
        </div>
        <div className="shrink-0">
          <a href="/financeiro?tab=configuracoes" className="text-xs text-primary hover:underline">
            Configurar →
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── BancosPage ────────────────────────────────────────────────────────────────

export default function BancosPage() {
  const [contas, setContas] = useState<BillingBankAccount[]>([])
  const [catalogo, setCatalogo] = useState<BankCatalog[]>([])
  const [resumo, setResumo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalConta, setModalConta] = useState(false)
  const [editandoConta, setEditandoConta] = useState<BillingBankAccount | null>(null)
  const [modalRemessa, setModalRemessa] = useState<BillingBankAccount | null>(null)
  const [modalRetorno, setModalRetorno] = useState<BillingBankAccount | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const [contasRes, catRes, resumoRes] = await Promise.all([
        bancosService.listContas(),
        bancosService.catalogo(),
        bancosService.resumo(),
      ])
      setContas((contasRes.data as any)?.data ?? [])
      setCatalogo((catRes.data as any)?.data ?? [])
      setResumo((resumoRes.data as any)?.data ?? null)
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 4000)
  }

  function handleEdit(conta: BillingBankAccount) {
    setEditandoConta(conta)
    setModalConta(true)
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-600" /> {feedback}
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Contas cadastradas" value={resumo?.totalContas ?? '—'} icon={<Landmark size={17} className="text-blue-600" />} color="bg-blue-50" />
        <KpiCard label="Contas ativas" value={resumo?.contasAtivas ?? '—'} icon={<CheckCircle2 size={17} className="text-green-600" />} color="bg-green-50" />
        <KpiCard
          label="Última remessa"
          value={resumo?.ultimaRemessa ? fmtDate(resumo.ultimaRemessa.createdAt) : '—'}
          sub={resumo?.ultimaRemessa?.fileName ?? 'Nenhuma gerada'}
          icon={<FileDown size={17} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <KpiCard
          label="Último retorno"
          value={resumo?.ultimoRetorno ? fmtDate(resumo.ultimoRetorno.createdAt) : '—'}
          sub={resumo?.ultimoRetorno?.fileName ?? 'Nenhum importado'}
          icon={<Upload size={17} className="text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {/* Seção Gateway/API */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Zap size={15} className="text-purple-600" /> Gateway / API
            </h3>
            <p className="text-xs text-muted-foreground">Integração direta por API REST — sem arquivo CNAB</p>
          </div>
        </div>
        <SecaoGateway />
      </div>

      {/* Seção Bancos CNAB */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText size={15} className="text-blue-600" /> Bancos CNAB
            </h3>
            <p className="text-xs text-muted-foreground">
              Cobrança via arquivo de remessa/retorno · {catalogo.length} banco{catalogo.length !== 1 ? 's' : ''} no catálogo
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditandoConta(null); setModalConta(true) }}>
            <Plus size={14} /> Nova conta
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 gap-3">
            <Landmark size={36} className="text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma conta bancária CNAB cadastrada</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Cadastre a conta bancária conveniada com o banco para emitir cobranças via arquivo CNAB.
            </p>
            <Button size="sm" onClick={() => { setEditandoConta(null); setModalConta(true) }}>
              <Plus size={14} /> Adicionar conta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contas.map((c) => (
              <CartaoBanco
                key={c.id}
                conta={c}
                onEdit={handleEdit}
                onRemessa={setModalRemessa}
                onRetorno={setModalRetorno}
                onReload={() => { void carregar() }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Catálogo de bancos suportados */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck size={16} />
            Bancos suportados
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada banco requer convênio homologado. O suporte é baseado no layout CNAB público.
            Posições específicas por banco precisam de validação com o gerente de conta.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {catalogo.map((b) => {
              const meta = (() => { try { return JSON.parse(b.metadata ?? '{}') } catch { return {} } })()
              return (
                <div key={b.code} className="rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{b.code}</span>
                    <p className="text-sm font-medium">{b.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.cnabSupport}</p>
                  {meta.obs && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{meta.obs}</p>}
                  {meta.homologacaoNecessaria && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <Clock size={10} /> Requer homologação com o banco
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Nota técnica */}
      <div className="rounded-xl border border-dashed bg-muted/30 px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Arquitetura CNAB — pontos de extensão
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Cada banco tem seu adapter em <code className="font-mono bg-muted px-1 rounded">apps/api/src/shared/cnab/adapters/</code>.
          Para adicionar um banco: criar o adapter implementando <code className="font-mono bg-muted px-1 rounded">CnabBankAdapter</code> e
          registrar em <code className="font-mono bg-muted px-1 rounded">cnab.registry.ts</code>.
          O fluxo de retorno alimenta automaticamente a aba Conciliação.
          API-READY: <code className="font-mono bg-muted px-1 rounded">BillingBankAccount.metadata</code> pode carregar
          credenciais de API quando o banco oferecer esta opção.
        </p>
      </div>

      {/* Modais */}
      {modalConta && (
        <ModalConta
          conta={editandoConta}
          catalogo={catalogo}
          onClose={() => { setModalConta(false); setEditandoConta(null) }}
          onSaved={() => { void carregar(); showFeedback('Conta salva com sucesso.') }}
        />
      )}
      {modalRemessa && (
        <ModalRemessa
          conta={modalRemessa}
          onClose={() => setModalRemessa(null)}
          onDone={() => { void carregar(); showFeedback('Remessa gerada e baixada com sucesso.') }}
        />
      )}
      {modalRetorno && (
        <ModalRetorno
          conta={modalRetorno}
          onClose={() => setModalRetorno(null)}
          onDone={() => { void carregar(); showFeedback('Retorno processado e conciliação atualizada.') }}
        />
      )}
    </div>
  )
}
