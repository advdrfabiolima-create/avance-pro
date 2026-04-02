import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import {
  responsaveisService,
} from '../../services/responsaveis.service'
import type { ResponsavelCreate, ResponsavelUpdate } from '@kumon-advance/types'

interface Props {
  id: string | null // null = criar
  onClose: () => void
  onSaved: () => void
}

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskTelefone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

interface FormFields {
  nome: string
  cpf: string
  email: string
  telefone: string
  telefoneAlt: string
}

const EMPTY: FormFields = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  telefoneAlt: '',
}

export default function ResponsavelFormModal({ id, onClose, onSaved }: Props) {
  const isEdit = id !== null && id !== ''
  const [fields, setFields] = useState<FormFields>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormFields>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    setFetching(true)
    responsaveisService
      .buscarPorId(id)
      .then((res) => {
        const r = (res.data as any)?.data ?? res.data
        setFields({
          nome: r.nome,
          cpf: maskCpf(r.cpf),
          email: r.email,
          telefone: maskTelefone(r.telefone),
          telefoneAlt: r.telefoneAlt ? maskTelefone(r.telefoneAlt) : '',
        })
      })
      .catch(() => setApiError('Erro ao carregar dados do responsável.'))
      .finally(() => setFetching(false))
  }, [id, isEdit])

  function set(field: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<FormFields> = {}
    if (!fields.nome.trim()) e.nome = 'Nome é obrigatório.'
    if (!fields.cpf.trim() || fields.cpf.replace(/\D/g, '').length !== 11)
      e.cpf = 'CPF inválido (11 dígitos).'
    if (!fields.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
      e.email = 'Email inválido.'
    if (!fields.telefone.trim() || fields.telefone.replace(/\D/g, '').length < 10)
      e.telefone = 'Telefone inválido.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError(null)
    try {
      const rawTel = fields.telefone.replace(/\D/g, '')
      const rawTelAlt = fields.telefoneAlt.replace(/\D/g, '')
      if (isEdit) {
        const data: ResponsavelUpdate = {
          nome: fields.nome,
          email: fields.email,
          telefone: rawTel,
          telefoneAlt: rawTelAlt || undefined,
        }
        await responsaveisService.atualizar(id, data)
      } else {
        const data: ResponsavelCreate = {
          nome: fields.nome,
          cpf: fields.cpf, // já formatado com pontos e traço
          email: fields.email,
          telefone: rawTel,
          telefoneAlt: rawTelAlt || undefined,
        }
        await responsaveisService.criar(data)
      }
      onSaved()
    } catch {
      setApiError('Erro ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-background shadow-lg">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Editar Responsável' : 'Novo Responsável'}
          </h2>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6">
            {apiError && (
              <Alert variant="destructive">
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={fields.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Nome completo"
              />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={fields.cpf}
                onChange={(e) => set('cpf', maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                disabled={isEdit}
              />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={fields.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={fields.telefone}
                  onChange={(e) => set('telefone', maskTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
                {errors.telefone && (
                  <p className="text-xs text-destructive">{errors.telefone}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="telefoneAlt">Telefone Alternativo</Label>
                <Input
                  id="telefoneAlt"
                  value={fields.telefoneAlt}
                  onChange={(e) => set('telefoneAlt', maskTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={loading}>
                {isEdit ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
