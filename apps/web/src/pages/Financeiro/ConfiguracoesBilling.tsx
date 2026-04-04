import { useState, useEffect } from 'react'
import { Save, TestTube2, Zap, Building2, Landmark, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { gatewayService } from '../../services/gateway.service'

type Provider = 'asaas' | 'inter' | 'bradesco'

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode; status: 'disponivel' | 'em_breve' }[] = [
  { id: 'asaas', label: 'Asaas', icon: <Zap size={18} />, status: 'disponivel' },
  { id: 'inter', label: 'Banco Inter', icon: <Building2 size={18} />, status: 'em_breve' },
  { id: 'bradesco', label: 'Bradesco', icon: <Landmark size={18} />, status: 'em_breve' },
]

const LS_BILLING_RULES = 'avancepro.billing.rules'

interface BillingRules {
  juros: string
  multa: string
  diasTolerancia: string
  cobrancaAutomatica: boolean
}

function loadRules(): BillingRules {
  try {
    const s = localStorage.getItem(LS_BILLING_RULES)
    if (s) return JSON.parse(s) as BillingRules
  } catch {}
  return { juros: '1', multa: '2', diasTolerancia: '3', cobrancaAutomatica: false }
}

export default function ConfiguracoesBilling() {
  const [provider, setProvider] = useState<Provider>('asaas')
  const [apiKey, setApiKey] = useState('')
  const [ambiente, setAmbiente] = useState<'sandbox' | 'producao'>('sandbox')
  const [loading, setLoading] = useState(false)
  const [testando, setTestando] = useState(false)
  const [testeOk, setTesteOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gatewayAtivo, setGatewayAtivo] = useState(false)
  const [rules, setRules] = useState<BillingRules>(loadRules)
  const [rulesSaved, setRulesSaved] = useState(false)

  useEffect(() => {
    gatewayService.buscar().then((res) => {
      const gw = (res.data as any)?.data
      if (gw) {
        setProvider((gw.tipo as Provider) ?? 'asaas')
        setAmbiente(gw.ambiente === 'producao' ? 'producao' : 'sandbox')
        setGatewayAtivo(gw.ativo ?? false)
      }
    }).catch(() => {})
  }, [])

  async function handleSalvarGateway() {
    if (!apiKey.trim()) { setError('Informe a API Key'); return }
    setLoading(true); setError(null); setTesteOk(null)
    try {
      await gatewayService.salvar({ tipo: provider, ambiente, apiKey: apiKey.trim() })
      setGatewayAtivo(true)
      setApiKey('')
      setTesteOk('Gateway salvo com sucesso.')
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao salvar gateway')
    } finally {
      setLoading(false)
    }
  }

  async function handleTestar() {
    if (!apiKey.trim()) { setError('Informe a API Key para testar'); return }
    setTestando(true); setError(null); setTesteOk(null)
    try {
      const res = await gatewayService.testar({ ambiente, apiKey: apiKey.trim() })
      const conta = (res.data as any)?.data
      setTesteOk(`Conexão OK — conta: ${conta?.name ?? conta?.commercialName ?? 'verificada'}`)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Falha na conexão com o gateway')
    } finally {
      setTestando(false)
    }
  }

  async function handleDesativar() {
    if (!confirm('Desativar o gateway de pagamento?')) return
    try {
      await gatewayService.desativar()
      setGatewayAtivo(false)
      setTesteOk('Gateway desativado.')
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erro ao desativar')
    }
  }

  function handleSalvarRules() {
    localStorage.setItem(LS_BILLING_RULES, JSON.stringify(rules))
    setRulesSaved(true)
    setTimeout(() => setRulesSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Provider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Provider de Cobrança</CardTitle>
          <p className="text-xs text-muted-foreground">Selecione o banco/gateway para envio de cobranças</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => p.status === 'disponivel' && setProvider(p.id)}
                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                  provider === p.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : p.status === 'em_breve'
                    ? 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed'
                    : 'border-border hover:border-primary/50 text-foreground cursor-pointer'
                }`}
              >
                {p.icon}
                {p.label}
                {p.status === 'em_breve' && (
                  <span className="absolute -top-2 -right-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
                    Em breve
                  </span>
                )}
                {provider === p.id && p.status === 'disponivel' && (
                  <CheckCircle2 size={14} className="absolute top-2 right-2 text-primary" />
                )}
              </button>
            ))}
          </div>

          {provider === 'asaas' && (
            <div className="space-y-4 border-t pt-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {testeOk && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 size={14} /> {testeOk}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Ambiente</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={ambiente}
                    onChange={(e) => setAmbiente(e.target.value as 'sandbox' | 'producao')}
                  >
                    <option value="sandbox">Sandbox (testes)</option>
                    <option value="producao">Produção</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>API Key {gatewayAtivo && <span className="text-xs text-green-600 font-normal ml-1">(configurada)</span>}</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={gatewayAtivo ? '••••••••••••••••••• (deixe em branco para manter)' : '$aact_...'}
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleSalvarGateway} disabled={loading || !apiKey.trim()}>
                  <Save size={13} /> {loading ? 'Salvando...' : 'Salvar Gateway'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleTestar} disabled={testando || !apiKey.trim()}>
                  <TestTube2 size={13} /> {testando ? 'Testando...' : 'Testar Conexão'}
                </Button>
                {gatewayAtivo && (
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDesativar}>
                    Desativar
                  </Button>
                )}
              </div>
            </div>
          )}

          {provider !== 'asaas' && (
            <div className="border-t pt-4 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
              Integração com <strong>{PROVIDERS.find((p) => p.id === provider)?.label}</strong> em desenvolvimento.
              A arquitetura está preparada — o adapter está criado e aguarda as credenciais oficiais do banco.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regras de cobrança */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Regras de Cobrança</CardTitle>
          <p className="text-xs text-muted-foreground">
            Configurações aplicadas automaticamente nas cobranças geradas
            <span className="ml-1 text-amber-600">(salvas localmente — persistência em banco em desenvolvimento)</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Juros ao mês (%)</Label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rules.juros}
                onChange={(e) => setRules((r) => ({ ...r, juros: e.target.value }))}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">Juros diários pró-rata sobre atraso</p>
            </div>
            <div className="space-y-1.5">
              <Label>Multa por atraso (%)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={rules.multa}
                onChange={(e) => setRules((r) => ({ ...r, multa: e.target.value }))}
                placeholder="2"
              />
              <p className="text-xs text-muted-foreground">Multa única aplicada após vencimento</p>
            </div>
            <div className="space-y-1.5">
              <Label>Dias de tolerância</Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={rules.diasTolerancia}
                onChange={(e) => setRules((r) => ({ ...r, diasTolerancia: e.target.value }))}
                placeholder="3"
              />
              <p className="text-xs text-muted-foreground">Dias após vencimento para aplicar multa</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <input
              type="checkbox"
              id="cobrancaAuto"
              checked={rules.cobrancaAutomatica}
              onChange={(e) => setRules((r) => ({ ...r, cobrancaAutomatica: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <label htmlFor="cobrancaAuto" className="text-sm font-medium cursor-pointer">
                Cobrança automática
              </label>
              <p className="text-xs text-muted-foreground">
                Gerar e enviar cobranças automaticamente no dia configurado (requer agendador — em desenvolvimento)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSalvarRules}>
              <Save size={13} /> Salvar Regras
            </Button>
            {rulesSaved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Salvo!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info arquitetura */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Arquitetura Multi-Banco</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O sistema usa o padrão <strong>BillingCore + Adapters</strong>. Cada provider implementa a interface
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">BillingProviderAdapter</code>
            com <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">createCharge</code>,
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">getCharge</code> e
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">cancelCharge</code>.
            Para adicionar um novo banco: criar o adapter em
            <code className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">apps/api/src/shared/billing/adapters/</code>,
            registrar no BillingCore e selecionar aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
