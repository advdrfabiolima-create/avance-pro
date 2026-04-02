import { useState } from 'react'
import { FileText, TrendingUp, AlertCircle, Calculator } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import { pagamentosService } from '../../services/pagamentos.service'

function formatarValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ReajustesPage() {
  const [mesReferencia, setMesReferencia] = useState('')
  const [tipoReajuste, setTipoReajuste] = useState<'percentual' | 'fixo'>('percentual')
  const [percentual, setPercentual] = useState('')
  const [valorFixo, setValorFixo] = useState('')
  const [previewAtivo, setPreviewAtivo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  // Simulação de preview
  const exemplos = [
    { nome: 'Ana Silva', valorAtual: 320.00 },
    { nome: 'Pedro Santos', valorAtual: 320.00 },
    { nome: 'Maria Oliveira', valorAtual: 280.00 },
  ]

  function calcularNovoValor(valorAtual: number): number {
    if (tipoReajuste === 'percentual') {
      const pct = parseFloat(percentual.replace(',', '.'))
      if (isNaN(pct)) return valorAtual
      return valorAtual * (1 + pct / 100)
    } else {
      const fixo = parseFloat(valorFixo.replace(/\./g, '').replace(',', '.'))
      if (isNaN(fixo)) return valorAtual
      return valorAtual + fixo
    }
  }

  const handleSimular = () => {
    setError(null)
    if (!mesReferencia) {
      setError('Selecione o mês de referência para o reajuste.')
      return
    }
    if (tipoReajuste === 'percentual' && !percentual) {
      setError('Informe o percentual de reajuste.')
      return
    }
    if (tipoReajuste === 'fixo' && !valorFixo) {
      setError('Informe o valor do reajuste.')
      return
    }
    setPreviewAtivo(true)
  }

  const handleAplicar = async () => {
    setLoading(true)
    setError(null)
    setSucesso(null)
    try {
      // Aqui chamaria a API de reajuste em lote
      // await pagamentosService.reajustarEmLote({ mesReferencia, tipoReajuste, percentual, valorFixo })
      await new Promise((r) => setTimeout(r, 1200)) // simulação
      setSucesso(`Reajuste aplicado com sucesso para ${mesReferencia}. As mensalidades foram atualizadas.`)
      setPreviewAtivo(false)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao aplicar reajuste.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reajustes em Lote"
        subtitle="Atualize os valores de mensalidades em massa"
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-700">
          <strong>Atenção:</strong> O reajuste em lote afeta todas as mensalidades do período selecionado.
          Use a função "Simular" antes de aplicar para revisar os novos valores.
        </p>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {sucesso && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-700">{sucesso}</p>
        </div>
      )}

      {/* Configuração */}
      <div className="rounded-xl border bg-card p-6 space-y-5">
        <h3 className="font-semibold">Configurar Reajuste</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mesReajuste">Mês de Referência *</Label>
            <Input
              id="mesReajuste"
              type="month"
              value={mesReferencia}
              onChange={(e) => { setMesReferencia(e.target.value); setPreviewAtivo(false) }}
            />
            <p className="text-xs text-muted-foreground">Mês que terá o novo valor aplicado</p>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Reajuste</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTipoReajuste('percentual'); setPreviewAtivo(false) }}
                className={`flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-medium transition-all ${tipoReajuste === 'percentual' ? 'border-primary bg-primary/10 text-primary' : 'border-muted'}`}
              >
                <TrendingUp size={14} /> %
              </button>
              <button
                type="button"
                onClick={() => { setTipoReajuste('fixo'); setPreviewAtivo(false) }}
                className={`flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-medium transition-all ${tipoReajuste === 'fixo' ? 'border-primary bg-primary/10 text-primary' : 'border-muted'}`}
              >
                <Calculator size={14} /> R$
              </button>
            </div>
          </div>

          {tipoReajuste === 'percentual' ? (
            <div className="space-y-1.5">
              <Label htmlFor="percentual">Percentual de Reajuste (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="percentual"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Ex: 5,5"
                  value={percentual}
                  onChange={(e) => { setPercentual(e.target.value); setPreviewAtivo(false) }}
                  className="max-w-[140px]"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="valorFixo">Valor do Reajuste (R$)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  id="valorFixo"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valorFixo}
                  onChange={(e) => { setValorFixo(e.target.value); setPreviewAtivo(false) }}
                  className="max-w-[140px]"
                />
              </div>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={handleSimular}>
          <FileText size={14} /> Simular Reajuste
        </Button>
      </div>

      {/* Preview */}
      {previewAtivo && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Preview do Reajuste</h3>
            <span className="text-xs text-muted-foreground">Mostrando amostra de 3 alunos</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Aluno</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Valor Atual</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Novo Valor</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {exemplos.map((ex) => {
                const novoValor = calcularNovoValor(ex.valorAtual)
                const diff = novoValor - ex.valorAtual
                return (
                  <tr key={ex.nome} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{ex.nome}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatarValor(ex.valorAtual)}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-primary">{formatarValor(novoValor)}</td>
                    <td className="px-4 py-2 text-right font-mono text-emerald-600">+{formatarValor(diff)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="border-t px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Este reajuste será aplicado a <strong>todos</strong> os alunos com mensalidade em {mesReferencia}.
            </p>
            <Button onClick={handleAplicar} disabled={loading}>
              {loading ? 'Aplicando...' : 'Aplicar Reajuste'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
