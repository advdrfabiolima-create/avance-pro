import { useState, useEffect } from 'react'
import { KeyRound, User, CheckCircle, Zap, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import PageHeader from '../../components/shared/PageHeader'
import { useAuthStore } from '../../store/auth.store'
import { usuariosService } from '../../services/usuarios.service'
import { gatewayService, type ConfigGateway } from '../../services/gateway.service'

interface SenhaForm {
  senhaAtual: string
  novaSenha: string
  confirmacaoSenha: string
}

const SENHA_VAZIA: SenhaForm = {
  senhaAtual: '',
  novaSenha: '',
  confirmacaoSenha: '',
}

// ─── Card Asaas ───────────────────────────────────────────────────────────────

function CardAsaas() {
  const [config, setConfig] = useState<ConfigGateway | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [ambiente, setAmbiente] = useState<'sandbox' | 'producao'>('sandbox')
  const [mostrarKey, setMostrarKey] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  useEffect(() => {
    gatewayService.buscar().then((res) => {
      setConfig(res.data?.data ?? null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleTestar() {
    if (!apiKey.trim()) { setErro('Informe a API Key antes de testar'); return }
    setTestando(true); setErro(null); setSucesso(null)
    try {
      const res = await gatewayService.testar({ apiKey: apiKey.trim(), ambiente })
      setSucesso(`Conectado: ${res.data?.data?.nome ?? 'conta válida'}`)
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Falha na conexão com o Asaas')
    } finally { setTestando(false) }
  }

  async function handleSalvar() {
    if (!apiKey.trim()) { setErro('Informe a API Key'); return }
    setSalvando(true); setErro(null); setSucesso(null)
    try {
      const res = await gatewayService.salvar({ tipo: 'asaas', ambiente, apiKey: apiKey.trim() })
      setConfig(res.data?.data ?? null)
      setApiKey('')
      setSucesso('Configuração salva com sucesso!')
    } catch {
      setErro('Erro ao salvar configuração')
    } finally { setSalvando(false) }
  }

  async function handleDesativar() {
    if (!confirm('Desativar a integração com o Asaas?')) return
    try {
      await gatewayService.desativar()
      setConfig(null)
      setSucesso('Integração desativada')
    } catch { setErro('Erro ao desativar') }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Gateway de Pagamento — Asaas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-8 rounded bg-muted animate-pulse" />
        ) : config?.ativo ? (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-green-800">Asaas conectado</p>
              <p className="text-xs text-green-700 mt-0.5">
                Ambiente: <span className="font-semibold capitalize">{config.ambiente}</span>
                {' · '}Chave: <span className="font-mono">{config.apiKeyMasked}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="success">Ativo</Badge>
              <Button variant="ghost" size="sm" onClick={handleDesativar} className="text-muted-foreground">
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum gateway configurado. Preencha abaixo para ativar o Asaas.</p>
        )}

        {sucesso && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{sucesso}</AlertDescription>
          </Alert>
        )}
        {erro && <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ambiente</Label>
            <div className="flex gap-2">
              {(['sandbox', 'producao'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmbiente(a)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    ambiente === a
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  {a === 'sandbox' ? 'Sandbox (testes)' : 'Produção'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={mostrarKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.ativo ? 'Digite para substituir a chave atual' : 'Cole sua API Key do Asaas aqui'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {mostrarKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre sua API Key em: <span className="font-mono">Asaas → Configurações → Integrações → API Key</span>
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleTestar} disabled={testando || !apiKey.trim()}>
              {testando ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button type="button" onClick={handleSalvar} disabled={salvando || !apiKey.trim()}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const usuario = useAuthStore((s) => s.usuario)

  // Troca de senha
  const [senha, setSenha] = useState<SenhaForm>(SENHA_VAZIA)
  const [loadingSenha, setLoadingSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [sucessoSenha, setSucessoSenha] = useState(false)

  function setSenhaField(field: keyof SenhaForm, value: string) {
    setSenha((prev) => ({ ...prev, [field]: value }))
    setErroSenha(null)
    setSucessoSenha(false)
  }

  async function handleTrocarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroSenha(null)
    setSucessoSenha(false)

    if (senha.novaSenha.length < 6) {
      setErroSenha('Nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha.novaSenha !== senha.confirmacaoSenha) {
      setErroSenha('Nova senha e confirmação não coincidem.')
      return
    }
    if (!usuario?.id) {
      setErroSenha('Usuário não autenticado.')
      return
    }

    setLoadingSenha(true)
    try {
      await usuariosService.trocarSenha(usuario.id, {
        senhaAtual: senha.senhaAtual,
        novaSenha: senha.novaSenha,
      })
      setSenha(SENHA_VAZIA)
      setSucessoSenha(true)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao trocar senha.'
      setErroSenha(msg)
    } finally {
      setLoadingSenha(false)
    }
  }

  const perfil = usuario?.perfil === 'franqueado' ? 'Franqueado' : 'Assistente'
  const dataFormatada = usuario?.criadoEm
    ? new Date(usuario.criadoEm).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Configurações" />

      {/* Dados da conta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Minha Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nome
              </dt>
              <dd className="mt-1 text-sm font-medium">{usuario?.nome ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                E-mail
              </dt>
              <dd className="mt-1 text-sm">{usuario?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Perfil
              </dt>
              <dd className="mt-1">
                <Badge variant={usuario?.perfil === 'franqueado' ? 'default' : 'secondary'}>
                  {perfil}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Membro desde
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{dataFormatada}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Gateway de Pagamento — visível só para franqueado */}
      {usuario?.perfil === 'franqueado' && <CardAsaas />}

      {/* Troca de senha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sucessoSenha && (
            <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>Senha alterada com sucesso.</AlertDescription>
            </Alert>
          )}

          {erroSenha && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{erroSenha}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleTrocarSenha} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senhaAtual">Senha Atual</Label>
              <Input
                id="senhaAtual"
                type="password"
                value={senha.senhaAtual}
                onChange={(e) => setSenhaField('senhaAtual', e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <Input
                id="novaSenha"
                type="password"
                value={senha.novaSenha}
                onChange={(e) => setSenhaField('novaSenha', e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmacaoSenha">Confirmar Nova Senha</Label>
              <Input
                id="confirmacaoSenha"
                type="password"
                value={senha.confirmacaoSenha}
                onChange={(e) => setSenhaField('confirmacaoSenha', e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loadingSenha}>
                {loadingSenha ? 'Salvando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
