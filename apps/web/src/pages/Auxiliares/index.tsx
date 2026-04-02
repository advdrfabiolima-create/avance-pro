import { useState, useEffect, useCallback } from 'react'
import { UserCheck, Plus, Pencil, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { usuariosService } from '../../services/usuarios.service'
import { useAuthStore } from '../../store/auth.store'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: 'franqueado' | 'assistente'
  ativo: boolean
  criadoEm: string
}

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

interface ModalAuxiliarProps {
  id: string | null
  initialData?: { nome: string; email: string }
  onClose: () => void
  onSaved: () => void
}

function ModalAuxiliar({ id, initialData, onClose, onSaved }: ModalAuxiliarProps) {
  const [nome, setNome] = useState(initialData?.nome ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingInit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!nome.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios.')
      return
    }
    if (!id && !senha.trim()) {
      setError('Senha é obrigatória para novo auxiliar.')
      return
    }
    setLoading(true)
    try {
      if (id) {
        await usuariosService.atualizar(id, { nome: nome.trim(), email: email.trim() })
      } else {
        await usuariosService.criar({ nome: nome.trim(), email: email.trim(), senha, perfil: 'assistente' })
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao salvar auxiliar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{id ? 'Editar Auxiliar' : 'Novo Auxiliar'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X size={16} />
          </button>
        </div>

        {loadingInit ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>

            {!id && (
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha *</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha de acesso" />
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AuxiliaresPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const isFranqueado = usuario?.perfil === 'franqueado'

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalId, setModalId] = useState<string | null>(null)
  const [modalInitial, setModalInitial] = useState<{ nome: string; email: string } | undefined>()
  const [modalOpen, setModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await usuariosService.listar()
      const data = (res.data as any)?.data ?? res.data
      const lista = Array.isArray(data) ? data : []
      setUsuarios(lista.filter((u: Usuario) => u.perfil === 'assistente'))
    } catch {
      setError('Erro ao carregar auxiliares.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  function handleEditar(u: Usuario) {
    setModalId(u.id)
    setModalInitial({ nome: u.nome, email: u.email })
    setModalOpen(true)
  }

  function handleNovo() {
    setModalId(null)
    setModalInitial(undefined)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auxiliares"
        subtitle="Instrutores e auxiliares da unidade"
        actions={
          isFranqueado ? (
            <Button onClick={handleNovo}>
              <Plus size={14} />
              Novo Auxiliar
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Desde</th>
                {isFranqueado && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={isFranqueado ? 5 : 4} className="py-12">
                    <EmptyState
                      icon={<UserCheck className="h-10 w-10" />}
                      title="Nenhum auxiliar cadastrado"
                      description="Adicione instrutores e auxiliares da unidade."
                    />
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                          {u.nome.charAt(0)}
                        </div>
                        <span className="font-medium">{u.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.ativo ? 'success' : 'secondary'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                    </td>
                    {isFranqueado && (
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditar(u)}>
                          <Pencil size={14} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ModalAuxiliar
          id={modalId}
          initialData={modalInitial}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            void fetchData()
          }}
        />
      )}
    </div>
  )
}
