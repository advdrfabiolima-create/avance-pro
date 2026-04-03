import { useState, useEffect, useRef } from 'react'
import { Camera, UserPlus, X, Check, Loader2 } from 'lucide-react'
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
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

const EMPTY: FormFields = {
  nome: '',
  dataNascimento: '',
  escola: '',
  serieEscolar: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
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

// ─── Máscaras ─────────────────────────────────────────────────────────────────

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

function maskCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

async function buscarCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}

// ─── Formulário inline de novo responsável ────────────────────────────────────

interface NovoResponsavelInlineProps {
  onCriado: (resp: ResponsavelOpcao) => void
  onCancelar: () => void
}

function NovoResponsavelInline({ onCriado, onCancelar }: NovoResponsavelInlineProps) {
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSalvar() {
    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      setErro('Nome, e-mail e telefone são obrigatórios')
      return
    }
    if (cpf && cpf.replace(/\D/g, '').length !== 11) {
      setErro('CPF inválido — informe os 11 dígitos')
      return
    }
    const telDigitos = telefone.replace(/\D/g, '')
    if (telDigitos.length < 10) {
      setErro('Telefone inválido — informe DDD + número')
      return
    }
    setLoading(true)
    setErro(null)
    try {
      const res = await responsaveisService.criar({
        nome: nome.trim(),
        cpf: cpf.replace(/\D/g, '').length === 11 ? cpf : undefined,
        email: email.trim(),
        telefone: telDigitos,
      } as any)
      const criado = (res.data as any)?.data ?? res.data
      onCriado({ id: criado.id, nome: criado.nome })
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao criar responsável')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">Novo Responsável</span>
        <button type="button" onClick={onCancelar} className="text-muted-foreground hover:text-foreground">
          <X size={13} />
        </button>
      </div>

      {erro && <p className="text-xs text-destructive">{erro}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CPF</Label>
          <Input value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telefone *</Label>
          <Input value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} className="h-8 text-sm" />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">E-mail *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="h-8 text-sm" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancelar} disabled={loading}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSalvar} disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {loading ? 'Salvando...' : 'Criar e Selecionar'}
        </Button>
      </div>
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

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
  const [novoRespParaVinculo, setNovoRespParaVinculo] = useState<number | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
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
            cep: aluno.cep ?? '',
            logradouro: aluno.logradouro ?? '',
            numero: aluno.numero ?? '',
            complemento: aluno.complemento ?? '',
            bairro: aluno.bairro ?? '',
            cidade: aluno.cidade ?? '',
            estado: aluno.estado ?? '',
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
          cep: fields.cep.trim() || undefined,
          logradouro: fields.logradouro.trim() || undefined,
          numero: fields.numero.trim() || undefined,
          complemento: fields.complemento.trim() || undefined,
          bairro: fields.bairro.trim() || undefined,
          cidade: fields.cidade.trim() || undefined,
          estado: fields.estado.trim() || undefined,
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

              {/* Endereço */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Endereço</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cep">CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cep"
                        value={fields.cep}
                        onChange={(e) => set('cep', maskCep(e.target.value))}
                        placeholder="00000-000"
                        maxLength={9}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={buscandoCep || fields.cep.replace(/\D/g, '').length !== 8}
                        onClick={async () => {
                          setBuscandoCep(true)
                          const dados = await buscarCep(fields.cep)
                          setBuscandoCep(false)
                          if (dados) {
                            setFields((f) => ({
                              ...f,
                              logradouro: dados.logradouro || f.logradouro,
                              bairro: dados.bairro || f.bairro,
                              cidade: dados.localidade || f.cidade,
                              estado: dados.uf || f.estado,
                            }))
                          } else {
                            setError('CEP não encontrado')
                          }
                        }}
                      >
                        {buscandoCep ? '...' : 'Buscar'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="estado">Estado (UF)</Label>
                    <Input
                      id="estado"
                      value={fields.estado}
                      onChange={(e) => set('estado', e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={fields.logradouro}
                      onChange={(e) => set('logradouro', e.target.value)}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={fields.numero}
                      onChange={(e) => set('numero', e.target.value)}
                      placeholder="123"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={fields.complemento}
                      onChange={(e) => set('complemento', e.target.value)}
                      placeholder="Apto, Bloco..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={fields.bairro}
                      onChange={(e) => set('bairro', e.target.value)}
                      placeholder="Bairro"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={fields.cidade}
                      onChange={(e) => set('cidade', e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
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
                      + Adicionar vínculo
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
                          <div className="flex items-center justify-between">
                            <Label>Responsável</Label>
                            {novoRespParaVinculo !== i && (
                              <button
                                type="button"
                                onClick={() => setNovoRespParaVinculo(i)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <UserPlus size={11} /> Criar novo
                              </button>
                            )}
                          </div>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={v.responsavelId}
                            onChange={(e) => setVinculo(i, 'responsavelId', e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {responsaveisOpcoes.map((r) => (
                              <option key={r.id} value={r.id}>{r.nome}</option>
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

                      {/* Formulário inline de novo responsável */}
                      {novoRespParaVinculo === i && (
                        <NovoResponsavelInline
                          onCriado={(resp) => {
                            setResponsaveisOpcoes((prev) => [...prev, resp])
                            setVinculo(i, 'responsavelId', resp.id)
                            setNovoRespParaVinculo(null)
                          }}
                          onCancelar={() => setNovoRespParaVinculo(null)}
                        />
                      )}

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
