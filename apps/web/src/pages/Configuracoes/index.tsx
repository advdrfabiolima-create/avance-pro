import { useState } from 'react'
import { KeyRound, User, CheckCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import PageHeader from '../../components/shared/PageHeader'
import { useAuthStore } from '../../store/auth.store'
import { usuariosService } from '../../services/usuarios.service'

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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-2xl">
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
