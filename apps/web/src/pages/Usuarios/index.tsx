import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { useAuthStore } from '../../store/auth.store'
import { api } from '../../services/api'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: 'franqueado' | 'assistente'
  ativo: boolean
  criadoEm: string
}

interface FormCriar {
  nome: string
  email: string
  senha: string
  perfil: 'franqueado' | 'assistente'
}

interface FormEditar {
  nome: string
  email: string
  perfil: 'franqueado' | 'assistente'
  ativo: boolean
}

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'criar' }
  | { tipo: 'editar'; usuario: Usuario }

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

export default function UsuariosPage() {
  const usuarioLogado = useAuthStore((s) => s.usuario)

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' })

  // Estados do formulário de criar
  const [formCriar, setFormCriar] = useState<FormCriar>({
    nome: '',
    email: '',
    senha: '',
    perfil: 'assistente',
  })

  // Estados do formulário de editar
  const [formEditar, setFormEditar] = useState<FormEditar>({
    nome: '',
    email: '',
    perfil: 'assistente',
    ativo: true,
  })

  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<any>('/usuarios')
      const payload = (res.data as any)?.data ?? res.data
      setUsuarios(Array.isArray(payload) ? payload : [])
    } catch {
      setError('Erro ao carregar usuários. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUsuarios()
  }, [fetchUsuarios])

  function abrirCriar() {
    setFormCriar({ nome: '', email: '', senha: '', perfil: 'assistente' })
    setErroModal(null)
    setModal({ tipo: 'criar' })
  }

  function abrirEditar(usuario: Usuario) {
    setFormEditar({
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
    })
    setErroModal(null)
    setModal({ tipo: 'editar', usuario })
  }

  function fecharModal() {
    setModal({ tipo: 'fechado' })
    setErroModal(null)
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!formCriar.nome.trim() || !formCriar.email.trim() || !formCriar.senha.trim()) {
      setErroModal('Preencha todos os campos obrigatórios.')
      return
    }
    setSalvando(true)
    setErroModal(null)
    try {
      await api.post<any>('/usuarios', formCriar)
      fecharModal()
      void fetchUsuarios()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Erro ao criar usuário. Tente novamente.'
      setErroModal(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (modal.tipo !== 'editar') return
    if (!formEditar.nome.trim() || !formEditar.email.trim()) {
      setErroModal('Preencha todos os campos obrigatórios.')
      return
    }
    setSalvando(true)
    setErroModal(null)
    try {
      await api.put<any>(`/usuarios/${modal.usuario.id}`, formEditar)
      fecharModal()
      void fetchUsuarios()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Erro ao atualizar usuário. Tente novamente.'
      setErroModal(msg)
    } finally {
      setSalvando(false)
    }
  }

  const ehLogado = (id: string) => usuarioLogado?.id === id

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Usuários"
        actions={
          <Button onClick={abrirCriar}>
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        }
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Perfil</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : usuarios.length > 0 ? (
                usuarios.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span>{usuario.nome}</span>
                      {ehLogado(usuario.id) && (
                        <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {usuario.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={usuario.perfil === 'franqueado' ? 'default' : 'secondary'}>
                        {usuario.perfil === 'franqueado' ? 'Franqueado' : 'Assistente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={usuario.ativo ? 'success' : 'secondary'}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => abrirEditar(usuario)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12">
                    <EmptyState
                      icon={<Users className="h-10 w-10" />}
                      title="Nenhum usuário encontrado"
                      description='Cadastre o primeiro usuário clicando em "Novo Usuário".'
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar */}
      {modal.tipo === 'criar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background shadow-lg">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Novo Usuário</h2>
            </div>
            <form onSubmit={handleCriar}>
              <div className="space-y-4 px-6 py-4">
                {erroModal && (
                  <Alert variant="destructive">
                    <AlertDescription>{erroModal}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="criar-nome">Nome *</Label>
                  <Input
                    id="criar-nome"
                    value={formCriar.nome}
                    onChange={(e) => setFormCriar((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome completo"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="criar-email">Email *</Label>
                  <Input
                    id="criar-email"
                    type="email"
                    value={formCriar.email}
                    onChange={(e) => setFormCriar((f) => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@email.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="criar-senha">Senha *</Label>
                  <Input
                    id="criar-senha"
                    type="password"
                    value={formCriar.senha}
                    onChange={(e) => setFormCriar((f) => ({ ...f, senha: e.target.value }))}
                    placeholder="Senha inicial"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="criar-perfil">Perfil *</Label>
                  <select
                    id="criar-perfil"
                    value={formCriar.perfil}
                    onChange={(e) =>
                      setFormCriar((f) => ({
                        ...f,
                        perfil: e.target.value as 'franqueado' | 'assistente',
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="assistente">Assistente</option>
                    <option value="franqueado">Franqueado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={fecharModal} disabled={salvando}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={salvando}>
                  Criar Usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modal.tipo === 'editar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background shadow-lg">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Editar Usuário</h2>
            </div>
            <form onSubmit={handleEditar}>
              <div className="space-y-4 px-6 py-4">
                {erroModal && (
                  <Alert variant="destructive">
                    <AlertDescription>{erroModal}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="editar-nome">Nome *</Label>
                  <Input
                    id="editar-nome"
                    value={formEditar.nome}
                    onChange={(e) => setFormEditar((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome completo"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="editar-email">Email *</Label>
                  <Input
                    id="editar-email"
                    type="email"
                    value={formEditar.email}
                    onChange={(e) => setFormEditar((f) => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@email.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="editar-perfil">Perfil *</Label>
                  <select
                    id="editar-perfil"
                    value={formEditar.perfil}
                    onChange={(e) =>
                      setFormEditar((f) => ({
                        ...f,
                        perfil: e.target.value as 'franqueado' | 'assistente',
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="assistente">Assistente</option>
                    <option value="franqueado">Franqueado</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <label
                    className={`flex items-center gap-2 select-none ${
                      ehLogado(modal.usuario.id)
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formEditar.ativo}
                      disabled={ehLogado(modal.usuario.id)}
                      onChange={(e) => setFormEditar((f) => ({ ...f, ativo: e.target.checked }))}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">Usuário ativo</span>
                  </label>
                  {ehLogado(modal.usuario.id) && (
                    <p className="text-xs text-muted-foreground">
                      Você não pode desativar sua própria conta.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={fecharModal} disabled={salvando}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={salvando}>
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
