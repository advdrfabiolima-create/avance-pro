import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Users, Clock } from 'lucide-react'
import TurmaAlunosModal from './TurmaAlunosModal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { turmasService } from '../../services/turmas.service'
import type { Turma as TurmaBase } from '../../services/turmas.service'

// A API pode retornar totalAlunos como campo calculado
type Turma = TurmaBase & { totalAlunos?: number }

const DIAS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

const DIA_ORDER: Record<string, number> = {
  segunda: 0,
  terca: 1,
  quarta: 2,
  quinta: 3,
  sexta: 4,
  sabado: 5,
}

interface FormFields {
  diaSemana: string
  horarioInicio: string
  horarioFim: string
  capacidade: string
}

const EMPTY_FORM: FormFields = {
  diaSemana: 'segunda',
  horarioInicio: '',
  horarioFim: '',
  capacidade: '',
}

function ocupacaoBadge(totalAlunos: number, capacidade: number) {
  if (totalAlunos >= capacidade) {
    return { variant: 'destructive' as const, label: 'Turma cheia' }
  }
  if (totalAlunos >= capacidade * 0.8) {
    return { variant: 'warning' as const, label: 'Quase cheia' }
  }
  return { variant: 'success' as const, label: 'Vagas disponíveis' }
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card shadow animate-pulse">
      <div className="p-6 space-y-3">
        <div className="h-5 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-4 w-1/3 rounded bg-muted" />
      </div>
    </div>
  )
}

interface TurmaFormModalProps {
  id: string | null // null = criar
  turmas: Turma[]
  onClose: () => void
  onSaved: () => void
}

function TurmaFormModal({ id, turmas, onClose, onSaved }: TurmaFormModalProps) {
  const isEdit = id !== null
  const [fields, setFields] = useState<FormFields>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit) {
      const turma = turmas.find((t) => t.id === id)
      if (turma) {
        setFields({
          diaSemana: turma.diaSemana,
          horarioInicio: turma.horarioInicio,
          horarioFim: turma.horarioFim,
          capacidade: String(turma.capacidade),
        })
      }
    } else {
      setFields(EMPTY_FORM)
    }
  }, [id, isEdit, turmas])

  function set(field: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fields.horarioInicio) {
      setError('Horário de início é obrigatório')
      return
    }
    if (!fields.horarioFim) {
      setError('Horário de término é obrigatório')
      return
    }
    if (fields.horarioFim <= fields.horarioInicio) {
      setError('Horário de término deve ser após o início')
      return
    }
    const cap = parseInt(fields.capacidade, 10)
    if (!fields.capacidade || isNaN(cap) || cap < 1) {
      setError('Capacidade deve ser um número maior que zero')
      return
    }

    setLoading(true)
    try {
      const data = {
        diaSemana: fields.diaSemana as Turma['diaSemana'],
        horarioInicio: fields.horarioInicio,
        horarioFim: fields.horarioFim,
        capacidade: cap,
      }
      if (isEdit) {
        await turmasService.atualizar(id!, data)
      } else {
        await turmasService.criar(data)
      }
      onSaved()
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        (isEdit ? 'Erro ao atualizar turma' : 'Erro ao criar turma')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-lg flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Editar Turma' : 'Nova Turma'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-4 px-6 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="diaSemana">Dia da semana *</Label>
              <select
                id="diaSemana"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={fields.diaSemana}
                onChange={(e) => set('diaSemana', e.target.value)}
              >
                {Object.entries(DIAS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="horarioInicio">Início *</Label>
                <Input
                  id="horarioInicio"
                  type="time"
                  value={fields.horarioInicio}
                  onChange={(e) => set('horarioInicio', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="horarioFim">Término *</Label>
                <Input
                  id="horarioFim"
                  type="time"
                  value={fields.horarioFim}
                  onChange={(e) => set('horarioFim', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacidade">Capacidade *</Label>
              <Input
                id="capacidade"
                type="number"
                min={1}
                value={fields.capacidade}
                onChange={(e) => set('capacidade', e.target.value)}
                placeholder="Ex: 20"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Turma'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalId, setModalId] = useState<string | null | undefined>(undefined)
  const [gerenciandoId, setGerenciandoId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await turmasService.listar()
      const payload = (res.data as any)?.data ?? res.data
      const lista: Turma[] = Array.isArray(payload) ? payload : []
      const ordenadas = [...lista].sort(
        (a, b) => (DIA_ORDER[a.diaSemana] ?? 99) - (DIA_ORDER[b.diaSemana] ?? 99),
      )
      setTurmas(ordenadas)
    } catch {
      setError('Erro ao carregar turmas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleSaved = () => {
    setModalId(undefined)
    void fetchData()
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Turmas"
        actions={
          <Button onClick={() => setModalId(null)}>
            <Plus className="h-4 w-4" />
            Nova Turma
          </Button>
        }
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : turmas.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Nenhuma turma cadastrada"
          description='Crie a primeira turma clicando em "Nova Turma".'
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((turma) => {
            const total = turma.totalAlunos ?? turma.alunos?.length ?? 0
            const badge = ocupacaoBadge(total, turma.capacidade)
            return (
              <Card key={turma.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {DIAS[turma.diaSemana] ?? turma.diaSemana}
                    </CardTitle>
                    <button
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setModalId(turma.id)}
                      aria-label="Editar turma"
                      title="Editar turma"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{turma.horarioInicio} – {turma.horarioFim}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>{total}/{turma.capacidade} alunos</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGerenciandoId(turma.id)}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Gerenciar alunos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {modalId !== undefined && (
        <TurmaFormModal
          id={modalId}
          turmas={turmas}
          onClose={() => setModalId(undefined)}
          onSaved={handleSaved}
        />
      )}

      {gerenciandoId !== null && (() => {
        const turma = turmas.find((t) => t.id === gerenciandoId)
        if (!turma) return null
        return (
          <TurmaAlunosModal
            turma={turma}
            onClose={() => setGerenciandoId(null)}
            onChanged={() => void fetchData()}
          />
        )
      })()}
    </div>
  )
}
