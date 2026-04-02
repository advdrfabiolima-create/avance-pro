import { useState, useEffect, useCallback } from 'react'
import { RefreshCcw, Plus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { api } from '../../services/api'

const PERIODICIDADE_LABELS: Record<string, string> = {
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

function formatarValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border bg-card p-5">
      <div className="h-5 w-40 rounded bg-muted mb-2" />
      <div className="h-4 w-24 rounded bg-muted mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded bg-muted" />
        <div className="h-6 w-16 rounded bg-muted" />
      </div>
    </div>
  )
}

interface ModalRecorrenciaProps {
  onClose: () => void
  onSaved: () => void
}

function ModalRecorrencia({ onClose, onSaved }: ModalRecorrenciaProps) {
  const [nome, setNome] = useState('')
  const [valorRaw, setValorRaw] = useState('')
  const [periodicidade, setPeriodicidade] = useState('mensal')
  const [diaVencimento, setDiaVencimento] = useState('10')
  const [dataInicio, setDataInicio] = useState(hoje())
  const [descricao, setDescricao] = useState('')
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
    const diaNum = parseInt(diaVencimento, 10)
    if (!nome.trim() || isNaN(valorNum) || valorNum <= 0 || isNaN(diaNum) || diaNum < 1 || diaNum > 28) {
      setError('Preencha todos os campos corretamente.')
      return
    }
    setLoading(true)
    try {
      await api.post('/recorrencias', { nome: nome.trim(), valor: valorNum, periodicidade, diaVencimento: diaNum, dataInicio, descricao: descricao.trim() || undefined })
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar recorrência.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Nova Recorrência</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Mensalidade Padrão" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input type="text" inputMode="numeric" placeholder="0,00" value={valorRaw} onChange={handleValorChange} />
            </div>
            <div className="space-y-1.5">
              <Label>Periodicidade</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={periodicidade}
                onChange={(e) => setPeriodicidade(e.target.value)}
              >
                {Object.entries(PERIODICIDADE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia Vencimento (1-28)</Label>
              <Input type="number" min="1" max="28" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Informações adicionais" />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RecorrenciasPage() {
  const [recorrencias, setRecorrencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/recorrencias')
      const data = (res.data as any)?.data ?? res.data
      setRecorrencias(Array.isArray(data) ? data : [])
    } catch {
      setError('Erro ao carregar recorrências.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const handleDesativar = async (id: string) => {
    try {
      await api.put(`/recorrencias/${id}`, { ativo: false })
      void fetchData()
    } catch {
      setError('Erro ao desativar recorrência.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recorrências"
        subtitle="Configurações de cobranças recorrentes"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nova Recorrência
          </Button>
        }
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-700">
          <strong>Recorrências:</strong> Configure padrões de cobrança para geração automática de mensalidades.
          A geração automática será ativada quando integrada ao agendador.
        </p>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : recorrencias.length === 0 ? (
          <div className="col-span-3 py-12">
            <EmptyState
              icon={<RefreshCcw className="h-10 w-10" />}
              title="Nenhuma recorrência configurada"
              description="Crie padrões de cobrança recorrente para gerar mensalidades automaticamente."
            />
          </div>
        ) : (
          recorrencias.map((rec) => (
            <div key={rec.id} className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{rec.nome}</h3>
                  {rec.descricao && <p className="text-xs text-muted-foreground">{rec.descricao}</p>}
                </div>
                <Badge variant={rec.ativo ? 'success' : 'secondary'}>{rec.ativo ? 'Ativa' : 'Inativa'}</Badge>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-semibold">{formatarValor(Number(rec.valor))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periodicidade</span>
                  <span>{PERIODICIDADE_LABELS[rec.periodicidade] ?? rec.periodicidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dia de vencimento</span>
                  <span>Dia {rec.diaVencimento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Início</span>
                  <span>{formatarData(rec.dataInicio)}</span>
                </div>
              </div>

              {rec.ativo && (
                <button
                  onClick={() => handleDesativar(rec.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Desativar
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ModalRecorrencia
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); void fetchData() }}
        />
      )}
    </div>
  )
}
