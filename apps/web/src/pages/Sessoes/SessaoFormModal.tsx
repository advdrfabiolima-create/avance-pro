import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { turmasService } from '../../services/turmas.service'
import { alunosService } from '../../services/alunos.service'
import { sessoesService } from '../../services/sessoes.service'
import { useAuthStore } from '../../store/auth.store'

const DIAS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Não classificado' },
  { value: 'avancando_bem', label: 'Avançando bem' },
  { value: 'atencao', label: 'Atenção' },
  { value: 'estagnado', label: 'Estagnado' },
  { value: 'critico', label: 'Crítico' },
]

interface TurmaOpcao {
  id: string
  diaSemana: string
  horarioInicio: string
  horarioFim: string
}

interface AlunoNaTurma {
  id: string
  nome: string
  matriculaAtiva: {
    id: string
    materia: { nome: string; codigo: string }
    nivelAtual: { codigo: string; descricao: string }
  } | null
}

interface AlunoForm {
  alunoId: string
  nome: string
  matriculaId: string | null
  materia: string
  nivel: string
  presente: boolean
  acertos: string
  erros: string
  tempoMinutos: string
  materialCodigo: string
  statusSessao: string
  observacao: string
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function SessaoFormModal({ onClose, onSaved }: Props) {
  const usuario = useAuthStore((s) => s.usuario)

  const [turmas, setTurmas] = useState<TurmaOpcao[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0]!)
  const [observacoes, setObservacoes] = useState('')
  const [alunos, setAlunos] = useState<AlunoForm[]>([])
  const [loadingTurmas, setLoadingTurmas] = useState(true)
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar turmas
  useEffect(() => {
    turmasService
      .listar()
      .then((res) => {
        const lista = (res.data as any)?.data ?? res.data
        setTurmas(Array.isArray(lista) ? lista : [])
      })
      .catch(() => setError('Erro ao carregar turmas.'))
      .finally(() => setLoadingTurmas(false))
  }, [])

  // Carregar alunos da turma selecionada
  useEffect(() => {
    if (!turmaId) {
      setAlunos([])
      return
    }
    setLoadingAlunos(true)
    alunosService
      .listar({ turmaId, ativo: true, pageSize: 100 })
      .then((res) => {
        const payload = (res.data as any)?.data ?? res.data
        const lista: AlunoNaTurma[] = payload?.data ?? []
        setAlunos(
          lista.map((a) => ({
            alunoId: a.id,
            nome: a.nome,
            matriculaId: a.matriculaAtiva?.id ?? null,
            materia: a.matriculaAtiva?.materia.nome ?? '',
            nivel: a.matriculaAtiva?.nivelAtual.codigo ?? '',
            presente: true,
            acertos: '',
            erros: '',
            tempoMinutos: '',
            materialCodigo: '',
            statusSessao: '',
            observacao: '',
          })),
        )
      })
      .catch(() => setError('Erro ao carregar alunos da turma.'))
      .finally(() => setLoadingAlunos(false))
  }, [turmaId])

  function updateAluno(index: number, field: keyof AlunoForm, value: string | boolean) {
    setAlunos((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, [field]: value }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!turmaId) { setError('Selecione uma turma.'); return }
    if (!data) { setError('Informe a data da sessão.'); return }
    if (!usuario?.id) { setError('Usuário não identificado.'); return }

    const alunosComMatricula = alunos.filter((a) => a.matriculaId)
    if (alunosComMatricula.length === 0) {
      setError('Nenhum aluno com matrícula ativa encontrado nesta turma.')
      return
    }

    setSaving(true)
    try {
      await sessoesService.criar({
        turmaId,
        data,
        assistenteId: usuario.id,
        observacoes: observacoes || undefined,
        alunos: alunosComMatricula.map((a) => ({
          alunoId: a.alunoId,
          matriculaId: a.matriculaId!,
          presente: a.presente,
          acertos: a.presente && a.acertos ? parseInt(a.acertos) : undefined,
          erros: a.presente && a.erros ? parseInt(a.erros) : undefined,
          tempoMinutos: a.presente && a.tempoMinutos ? parseInt(a.tempoMinutos) : undefined,
          materialCodigo: a.presente && a.materialCodigo ? a.materialCodigo : undefined,
          statusSessao: (a.presente && a.statusSessao) ? a.statusSessao as any : undefined,
          observacao: a.presente && a.observacao ? a.observacao : undefined,
        })),
      })
      onSaved()
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao registrar sessão. Verifique os dados.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const turmaSelecionada = turmas.find((t) => t.id === turmaId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-background shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">Nova Sessão</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-5 px-6 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Turma + Data */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="turma">Turma *</Label>
                {loadingTurmas ? (
                  <div className="h-9 rounded-md bg-muted animate-pulse" />
                ) : (
                  <select
                    id="turma"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={turmaId}
                    onChange={(e) => { setTurmaId(e.target.value); setError(null) }}
                  >
                    <option value="">Selecione a turma...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {DIAS[t.diaSemana] ?? t.diaSemana} · {t.horarioInicio}–{t.horarioFim}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observações gerais</Label>
              <Input
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre a sessão (opcional)"
              />
            </div>

            {/* Alunos */}
            {turmaId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Alunos da turma
                    {turmaSelecionada && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {DIAS[turmaSelecionada.diaSemana]} · {turmaSelecionada.horarioInicio}–{turmaSelecionada.horarioFim}
                      </span>
                    )}
                  </Label>
                  {!loadingAlunos && alunos.length > 0 && (
                    <span className="text-xs text-muted-foreground">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {loadingAlunos ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : alunos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                    Nenhum aluno ativo nesta turma.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {alunos.map((a, i) => (
                      <div key={a.alunoId} className={`rounded-lg border p-4 space-y-3 transition-colors ${!a.presente ? 'bg-muted/30 opacity-60' : ''}`}>
                        {/* Nome + presença */}
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{a.nome}</p>
                            {a.materia && (
                              <p className="text-xs text-muted-foreground">
                                {a.materia}{a.nivel ? ` · Nível ${a.nivel}` : ''}
                              </p>
                            )}
                            {!a.matriculaId && (
                              <p className="text-xs text-destructive">Sem matrícula ativa</p>
                            )}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={a.presente}
                              onChange={(e) => updateAluno(i, 'presente', e.target.checked)}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm">{a.presente ? 'Presente' : 'Ausente'}</span>
                          </label>
                        </div>

                        {/* Campos de desempenho (apenas se presente) */}
                        {a.presente && (
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Material</Label>
                              <Input
                                value={a.materialCodigo}
                                onChange={(e) => updateAluno(i, 'materialCodigo', e.target.value)}
                                placeholder="Ex: A100"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Acertos</Label>
                              <Input
                                type="number"
                                min="0"
                                value={a.acertos}
                                onChange={(e) => updateAluno(i, 'acertos', e.target.value)}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Erros</Label>
                              <Input
                                type="number"
                                min="0"
                                value={a.erros}
                                onChange={(e) => updateAluno(i, 'erros', e.target.value)}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tempo (min)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={a.tempoMinutos}
                                onChange={(e) => updateAluno(i, 'tempoMinutos', e.target.value)}
                                placeholder="30"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">Status da sessão</Label>
                              <select
                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={a.statusSessao}
                                onChange={(e) => updateAluno(i, 'statusSessao', e.target.value)}
                              >
                                {STATUS_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1 sm:col-span-3">
                              <Label className="text-xs">Observação</Label>
                              <Input
                                value={a.observacao}
                                onChange={(e) => updateAluno(i, 'observacao', e.target.value)}
                                placeholder="Observação sobre este aluno (opcional)"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !turmaId || alunos.length === 0}>
              {saving ? 'Registrando...' : 'Registrar Sessão'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
