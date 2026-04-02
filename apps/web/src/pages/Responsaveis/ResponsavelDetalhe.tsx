import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Phone, Mail, CreditCard, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { responsaveisService } from '../../services/responsaveis.service'
import ResponsavelFormModal from './ResponsavelFormModal'

interface AlunoVinculo {
  aluno: { id: string; nome: string }
  parentesco: string
  principal: boolean
}

interface ResponsavelDetalhado {
  id: string
  nome: string
  cpf: string
  email: string
  telefone: string
  telefoneAlt?: string | null
  criadoEm: string
  alunos: AlunoVinculo[]
}

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatTelefone(tel: string): string {
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel
}

function formatarData(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function ResponsavelDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const [responsavel, setResponsavel] = useState<ResponsavelDetalhado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  function carregar() {
    if (!id) return
    setLoading(true)
    setError(null)
    responsaveisService
      .buscarPorId(id)
      .then((res) => {
        const data = (res.data as any)?.data ?? res.data
        setResponsavel(data)
      })
      .catch(() => setError('Erro ao carregar dados do responsável.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    )
  }

  if (error || !responsavel) {
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <Link to="/responsaveis">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <p className="text-sm text-destructive">{error ?? 'Responsável não encontrado.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Link to="/responsaveis">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{responsavel.nome}</h1>
          <p className="text-sm text-muted-foreground">
            Cadastrado em {formatarData(responsavel.criadoEm)}
          </p>
        </div>
        <Button onClick={() => setEditando(true)}>
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados de contato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados de Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="font-mono text-sm">{formatCpf(responsavel.cpf)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{responsavel.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-sm">{formatTelefone(responsavel.telefone)}</p>
              </div>
            </div>
            {responsavel.telefoneAlt && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefone Alternativo</p>
                  <p className="text-sm">{formatTelefone(responsavel.telefoneAlt)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alunos vinculados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Alunos Vinculados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {responsavel.alunos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado.</p>
            ) : (
              <ul className="space-y-3">
                {responsavel.alunos.map(({ aluno, parentesco, principal }) => (
                  <li key={aluno.id} className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/alunos/${aluno.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {aluno.nome}
                      </Link>
                      <p className="text-xs capitalize text-muted-foreground">{parentesco}</p>
                    </div>
                    {principal && (
                      <Badge variant="secondary" className="text-xs">Principal</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {editando && (
        <ResponsavelFormModal
          id={responsavel.id}
          onClose={() => setEditando(false)}
          onSaved={() => {
            setEditando(false)
            carregar()
          }}
        />
      )}
    </div>
  )
}
