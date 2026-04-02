import { useState, useEffect } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Label } from '../../components/ui/Label'
import { Input } from '../../components/ui/Input'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { turmasService } from '../../services/turmas.service'
import { alunosService } from '../../services/alunos.service'

const DIAS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

interface AlunoNaTurma {
  alunoId: string
  nome: string
  dataInicio: string
}

interface AlunoOpcao {
  id: string
  nome: string
}

interface TurmaInfo {
  id: string
  diaSemana: string
  horarioInicio: string
  horarioFim: string
}

interface Props {
  turma: TurmaInfo
  onClose: () => void
  onChanged: () => void
}

export default function TurmaAlunosModal({ turma, onClose, onChanged }: Props) {
  const [alunosNaTurma, setAlunosNaTurma] = useState<AlunoNaTurma[]>([])
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<AlunoOpcao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // form de adicionar
  const [alunoSelecionado, setAlunoSelecionado] = useState('')
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]!)
  const [adicionando, setAdicionando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const [turmaRes, alunosRes] = await Promise.all([
        turmasService.buscarPorId(turma.id),
        alunosService.listar({ ativo: true, pageSize: 100 }),
      ])

      const turmaData = (turmaRes.data as any)?.data ?? turmaRes.data
      const alunosPayload = (alunosRes.data as any)?.data ?? alunosRes.data
      const todosAlunos: AlunoOpcao[] = (alunosPayload?.data ?? []).map((a: any) => ({
        id: a.id,
        nome: a.nome,
      }))

      const nasTurma: AlunoNaTurma[] = (turmaData?.alunos ?? []).map((v: any) => ({
        alunoId: v.aluno?.id ?? v.alunoId,
        nome: v.aluno?.nome ?? '',
        dataInicio: v.dataInicio,
      }))

      setAlunosNaTurma(nasTurma)

      const idsNaTurma = new Set(nasTurma.map((a) => a.alunoId))
      setAlunosDisponiveis(todosAlunos.filter((a) => !idsNaTurma.has(a.id)))
    } catch {
      setError('Erro ao carregar dados da turma.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void carregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!alunoSelecionado) { setError('Selecione um aluno.'); return }
    if (!dataInicio) { setError('Informe a data de entrada.'); return }
    setError(null)
    setAdicionando(true)
    try {
      await turmasService.adicionarAluno(turma.id, { alunoId: alunoSelecionado, dataInicio })
      setAlunoSelecionado('')
      onChanged()
      await carregar()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao adicionar aluno.')
    } finally {
      setAdicionando(false)
    }
  }

  async function handleRemover(alunoId: string) {
    setRemovendo(alunoId)
    setError(null)
    try {
      await turmasService.removerAluno(turma.id, alunoId)
      onChanged()
      await carregar()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao remover aluno.')
    } finally {
      setRemovendo(null)
    }
  }

  function formatarData(dateStr: string) {
    const parts = dateStr.split('T')[0]!.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-background shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Alunos da Turma</h2>
            <p className="text-xs text-muted-foreground">
              {DIAS[turma.diaSemana] ?? turma.diaSemana} · {turma.horarioInicio}–{turma.horarioFim}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Lista de alunos atuais */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Alunos matriculados{' '}
              {!loading && <span className="text-muted-foreground font-normal">({alunosNaTurma.length})</span>}
            </p>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : alunosNaTurma.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                Nenhum aluno nesta turma ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {alunosNaTurma.map((a) => (
                  <li
                    key={a.alunoId}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {formatarData(a.dataInicio)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={removendo === a.alunoId}
                      onClick={() => void handleRemover(a.alunoId)}
                      title="Remover da turma"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Formulário para adicionar */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar aluno
            </p>
            <form onSubmit={(e) => void handleAdicionar(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="aluno">Aluno</Label>
                {loading ? (
                  <div className="h-9 rounded-md bg-muted animate-pulse" />
                ) : alunosDisponiveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todos os alunos ativos já estão nesta turma.
                  </p>
                ) : (
                  <select
                    id="aluno"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={alunoSelecionado}
                    onChange={(e) => { setAlunoSelecionado(e.target.value); setError(null) }}
                  >
                    <option value="">Selecione o aluno...</option>
                    {alunosDisponiveis.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dataEntrada">Data de entrada</Label>
                <Input
                  id="dataEntrada"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              {alunosDisponiveis.length > 0 && (
                <Button
                  type="submit"
                  disabled={adicionando || !alunoSelecionado}
                  className="w-full"
                >
                  {adicionando ? 'Adicionando...' : 'Adicionar à turma'}
                </Button>
              )}
            </form>
          </div>
        </div>

        <div className="border-t px-6 py-4 shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
