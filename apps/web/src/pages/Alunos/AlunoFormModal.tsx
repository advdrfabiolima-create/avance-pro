import { useState, useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import { alunosService } from '../../services/alunos.service'
import { responsaveisService } from '../../services/responsaveis.service'
import type { AlunoCreate, AlunoUpdate } from '@kumon-advance/types'

interface Props {
  id: string | null // null = criar
  onClose: () => void
  onSaved: () => void
}

interface FormFields {
  nome: string
  dataNascimento: string
  escola: string
  serieEscolar: string
}

const EMPTY: FormFields = {
  nome: '',
  dataNascimento: '',
  escola: '',
  serieEscolar: '',
}

interface ResponsavelOpcao {
  id: string
  nome: string
}

interface VinculoForm {
  responsavelId: string
  parentesco: string
  principal: boolean
}

export default function AlunoFormModal({ id, onClose, onSaved }: Props) {
  const isEdit = id !== null && id !== ''
  const [fields, setFields] = useState<FormFields>(EMPTY)
  const [foto, setFoto] = useState<string | null>(null)
  const [fotoAlterada, setFotoAlterada] = useState(false)
  const [vinculos, setVinculos] = useState<VinculoForm[]>([
    { responsavelId: '', parentesco: '', principal: true },
  ])
  const [responsaveisOpcoes, setResponsaveisOpcoes] = useState<ResponsavelOpcao[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      setLoadingInit(true)
      try {
        const resResp = await responsaveisService.listar({ pageSize: 100 })
        const lista = (resResp.data as any)?.data?.data ?? (resResp.data as any)?.data ?? []
        setResponsaveisOpcoes(lista.map((r: any) => ({ id: r.id, nome: r.nome })))

        if (isEdit && id) {
          const resAluno = await alunosService.buscarPorId(id)
          const aluno = (resAluno.data as any)?.data ?? resAluno.data
          const dn = aluno.dataNascimento
            ? new Date(aluno.dataNascimento).toISOString().split('T')[0] ?? ''
            : ''
          setFields({
            nome: aluno.nome ?? '',
            dataNascimento: dn,
            escola: aluno.escola ?? '',
            serieEscolar: aluno.serieEscolar ?? '',
          })
          setFoto(aluno.foto ?? null)
        }
      } catch {
        setError('Erro ao carregar dados')
      } finally {
        setLoadingInit(false)
      }
    }
    void init()
  }, [id, isEdit])

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Foto muito grande. Máximo 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setFoto(reader.result as string)
      setFotoAlterada(true)
    }
    reader.readAsDataURL(file)
  }

  function handleRemoverFoto() {
    setFoto(null)
    setFotoAlterada(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function set(field: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  function setVinculo(index: number, field: keyof VinculoForm, value: string | boolean) {
    setVinculos((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, [field]: value } as VinculoForm
      // Garante apenas um principal
      if (field === 'principal' && value === true) {
        return next.map((v, i) => ({ ...v, principal: i === index }))
      }
      return next
    })
  }

  function addVinculo() {
    setVinculos((prev) => [...prev, { responsavelId: '', parentesco: '', principal: false }])
  }

  function removeVinculo(index: number) {
    setVinculos((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Se removeu o principal, marca o primeiro como principal
      if (prev[index]!.principal && next.length > 0) {
        next[0]!.principal = true
      }
      return next
    })
  }

  const dispensaResponsavel = fields.serieEscolar === 'Faculdade' || fields.serieEscolar === 'Adulto'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fields.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }
    if (!fields.dataNascimento) {
      setError('Data de nascimento é obrigatória')
      return
    }

    if (!isEdit && !dispensaResponsavel) {
      const vinculosValidos = vinculos.filter((v) => v.responsavelId && v.parentesco)
      if (vinculosValidos.length === 0) {
        setError('Informe ao menos um responsável')
        return
      }
      const temPrincipal = vinculosValidos.some((v) => v.principal)
      if (!temPrincipal) {
        setError('Marque um responsável como principal')
        return
      }
    }

    setLoading(true)
    try {
      if (isEdit) {
        const data: AlunoUpdate & { foto?: string | null } = {
          nome: fields.nome.trim(),
          dataNascimento: new Date(fields.dataNascimento),
          escola: fields.escola.trim() || undefined,
          serieEscolar: fields.serieEscolar.trim() || undefined,
          ...(fotoAlterada && { foto }),
        }
        await alunosService.atualizar(id!, data)
      } else {
        const data: AlunoCreate & { responsaveis: VinculoForm[] } = {
          nome: fields.nome.trim(),
          dataNascimento: new Date(fields.dataNascimento),
          escola: fields.escola.trim() || undefined,
          serieEscolar: fields.serieEscolar.trim() || undefined,
          responsaveis: vinculos
            .filter((v) => v.responsavelId && v.parentesco)
            .map((v) => ({
              responsavelId: v.responsavelId,
              parentesco: v.parentesco.trim(),
              principal: v.principal,
            })),
        }
        await alunosService.criar(data)
      }
      onSaved()
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ?? (isEdit ? 'Erro ao atualizar aluno' : 'Erro ao criar aluno')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-background shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {loadingInit ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={fields.nome}
                    onChange={(e) => set('nome', e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    value={fields.dataNascimento}
                    onChange={(e) => set('dataNascimento', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="serieEscolar">Série Escolar</Label>
                  <select
                    id="serieEscolar"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={fields.serieEscolar}
                    onChange={(e) => set('serieEscolar', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <optgroup label="Educação Infantil">
                      <option>Maternal</option>
                      <option>Jardim I</option>
                      <option>Jardim II</option>
                      <option>Pré-escola</option>
                    </optgroup>
                    <optgroup label="Ensino Fundamental I">
                      <option>1º ano</option>
                      <option>2º ano</option>
                      <option>3º ano</option>
                      <option>4º ano</option>
                      <option>5º ano</option>
                    </optgroup>
                    <optgroup label="Ensino Fundamental II">
                      <option>6º ano</option>
                      <option>7º ano</option>
                      <option>8º ano</option>
                      <option>9º ano</option>
                    </optgroup>
                    <optgroup label="Ensino Médio">
                      <option>1º ano EM</option>
                      <option>2º ano EM</option>
                      <option>3º ano EM</option>
                    </optgroup>
                    <optgroup label="Outro">
                      <option>Faculdade</option>
                      <option>Adulto</option>
                    </optgroup>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="escola">Escola</Label>
                  <Input
                    id="escola"
                    value={fields.escola}
                    onChange={(e) => set('escola', e.target.value)}
                    placeholder="Nome da escola"
                  />
                </div>
              </div>

              {/* Foto */}
              <div className="space-y-2">
                <Label>Foto do Aluno</Label>
                <div className="flex items-center gap-4">
                  <AlunoAvatar nome={fields.nome || 'A'} foto={foto} size="lg" />
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Camera size={14} />
                      {foto ? 'Trocar foto' : 'Adicionar foto'}
                    </button>
                    {foto && (
                      <button
                        type="button"
                        onClick={handleRemoverFoto}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remover foto
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP · Máx. 2MB</p>
                  </div>
                </div>
              </div>

              {!isEdit && !dispensaResponsavel && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Responsáveis *</Label>
                    <button
                      type="button"
                      onClick={addVinculo}
                      className="text-xs text-primary hover:underline"
                    >
                      + Adicionar responsável
                    </button>
                  </div>

                  {vinculos.map((v, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Responsável {i + 1}
                        </span>
                        {vinculos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVinculo(i)}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Responsável</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={v.responsavelId}
                            onChange={(e) => setVinculo(i, 'responsavelId', e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {responsaveisOpcoes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Parentesco</Label>
                          <Input
                            value={v.parentesco}
                            onChange={(e) => setVinculo(i, 'parentesco', e.target.value)}
                            placeholder="Ex: mãe, pai, avó"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.principal}
                          onChange={(e) => setVinculo(i, 'principal', e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-xs text-muted-foreground">
                          Responsável principal
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Aluno'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
