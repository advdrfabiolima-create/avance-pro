import { useState } from 'react'
import { Save, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'

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
  const [rules, setRules] = useState<BillingRules>(loadRules)
  const [rulesSaved, setRulesSaved] = useState(false)

  function handleSalvarRules() {
    localStorage.setItem(LS_BILLING_RULES, JSON.stringify(rules))
    setRulesSaved(true)
    setTimeout(() => setRulesSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Regras de cobrança */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Regras de Cobrança</CardTitle>
          <p className="text-xs text-muted-foreground">
            Configurações aplicadas automaticamente às cobranças geradas pela unidade.
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
                Gera e processa cobranças automaticamente conforme as regras configuradas na aba Régua.
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

    </div>
  )
}
